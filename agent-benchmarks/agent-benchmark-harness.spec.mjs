import {test, expect}        from '@playwright/test';
import {spawn, execFileSync} from 'node:child_process';
import fs                    from 'fs-extra';
import http                  from 'node:http';
import net                   from 'node:net';
import path                  from 'path';
import {generateRows}        from './tasks/grid-100k-multi-window/data/generateRows.mjs';
import {
    ARMS,
    classifyToolCall,
    parseTranscriptTelemetry,
    buildComparisonReport,
    formatComparisonMarkdown,
    runArmVerification,
    readVerificationRuns
} from './runner/runAgentBenchmark.mjs';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

/**
 * @summary Allocates an ephemeral free TCP port on 127.0.0.1.
 * @returns {Promise<Number>}
 */
async function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, '127.0.0.1', () => {
            const {port} = srv.address();
            srv.close(err => err ? reject(err) : resolve(port));
        });
    });
}

/**
 * @summary Sends a JSON-RPC 2.0 `initialize` request to a stdio MCP server command and returns the parsed response.
 * @param {{command: String, args: String[], cwd: String}} config
 * @returns {Promise<Object>}
 */
async function probeMcpInitialize({command, args, cwd}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {cwd, stdio: ['pipe', 'pipe', 'pipe']}),
              timer = setTimeout(() => {
                  child.kill('SIGTERM');
                  reject(new Error(`MCP initialize timed out for ${command} ${args.join(' ')}`));
              }, 15000);
        let stdout = '';

        child.stdout.on('data', chunk => {
            stdout += chunk.toString('utf8');
            for (const line of stdout.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{') && trimmed.includes('"jsonrpc"')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.id === 1 && parsed.result) {
                            clearTimeout(timer);
                            child.kill('SIGTERM');
                            resolve(parsed);
                            return;
                        }
                    } catch {
                        // wait for complete line
                    }
                }
            }
        });

        child.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });

        const req = JSON.stringify({
            jsonrpc: '2.0',
            id     : 1,
            method : 'initialize',
            params : {
                protocolVersion: '2024-11-05',
                capabilities   : {},
                clientInfo     : {name: 'agent-benchmark-self-test', version: '1.0.0'}
            }
        }) + '\n';

        child.stdin.write(req);
    });
}

/**
 * @summary Ensures `node_modules` is available in an arm workspace (using sibling benchmark install or `npm install`),
 * boots its dev server on a free port, verifies HTTP 200 on the given paths, and tears down the server.
 * @param {{armDir: String, seedNodeModulesDir: String, scriptArgs: String[], env?: Object, checkPaths: String[]}} options
 */
async function verifyArmDevServerAnswers({armDir, seedNodeModulesDir, scriptArgs, env = {}, checkPaths}) {
    const armNodeModules = path.join(armDir, 'node_modules');
    let   createdSymlink = false;

    if (!await fs.pathExists(armNodeModules)) {
        if (await fs.pathExists(seedNodeModulesDir)) {
            await fs.ensureSymlink(seedNodeModulesDir, armNodeModules, 'dir');
            createdSymlink = true;
        } else {
            execFileSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], {
                cwd  : armDir,
                stdio: 'inherit'
            });
        }
    }

    const port  = await getFreePort(),
          child = spawn('npm', scriptArgs.map(a => a.replace('{PORT}', String(port))), {
              cwd  : armDir,
              env  : {...process.env, PORT: String(port), ...env},
              stdio: ['ignore', 'pipe', 'pipe']
          });

    try {
        const baseUrl  = `http://localhost:${port}`,
              deadline = Date.now() + 20000;
        let ready = false;

        while (Date.now() < deadline) {
            try {
                const res = await fetch(`${baseUrl}${checkPaths[0]}`);
                if (res.status === 200) {
                    ready = true;
                    break;
                }
            } catch {
                // server still booting
            }
            await new Promise(r => setTimeout(r, 200));
        }

        expect(ready, `Dev server in ${armDir} did not answer 200 on ${checkPaths[0]}`).toBe(true);

        for (const checkPath of checkPaths) {
            const res = await fetch(`${baseUrl}${checkPath}`);
            expect(res.status, `Expected 200 for ${checkPath} in ${armDir}`).toBe(200);
        }
    } finally {
        child.kill('SIGTERM');
        if (createdSymlink) {
            await fs.remove(armNodeModules);
        }
    }
}

test.describe('3-Arm Coding-Agent Benchmark Harness (#2)', () => {
    test('generateRows produces 100,000 deterministic records with pinned canonical rows', () => {
        const rowsA = generateRows(100000, 42),
              rowsB = generateRows(100000, 42);

        expect(rowsA).toHaveLength(100000);
        expect(rowsA[0]).toEqual({
            id         : 'ROW-000001',
            accountName: 'Alpha Baseline 1',
            region     : 'EMEA',
            arrUsd     : 125000,
            latencyMs  : 18,
            status     : 'Healthy',
            owner      : 'A. Vance'
        });
        expect(rowsA[1]).toEqual({
            id         : 'ROW-000002',
            accountName: 'Zenith Apex 2',
            region     : 'APAC',
            arrUsd     : 999900,
            latencyMs  : 12,
            status     : 'Healthy',
            owner      : 'M. Chen'
        });
        expect(rowsA[99999]).toEqual(rowsB[99999]);
    });

    test('all three arm workspaces carry isolated starter trees, launchable MCP servers, and serving dev servers', async () => {
        test.setTimeout(60000);

        expect(ARMS).toEqual([
            'arm-a-react-ag-grid-mcp',
            'arm-b-neo-kb-only',
            'arm-c-neo-kb-neural-link'
        ]);

        const armADir = path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-a-react-ag-grid-mcp'),
              armBDir = path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-b-neo-kb-only'),
              armCDir = path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-c-neo-kb-neural-link');

        const armAMcp = await fs.readJson(path.join(armADir, '.mcp.json')),
              armBMcp = await fs.readJson(path.join(armBDir, '.mcp.json')),
              armCMcp = await fs.readJson(path.join(armCDir, '.mcp.json'));

        expect(Object.keys(armAMcp.mcpServers)).toEqual(['ag-mcp']);
        expect(Object.keys(armBMcp.mcpServers)).toEqual([]);
        expect(Object.keys(armCMcp.mcpServers)).toEqual(['neural-link']);

        const armAPkg = await fs.readJson(path.join(armADir, 'package.json'));
        for (const ver of [...Object.values(armAPkg.dependencies), ...Object.values(armAPkg.devDependencies)]) {
            expect(ver).not.toMatch(/^[\^~]/);
        }

        const armAAgentsMd = await fs.readFile(path.join(armADir, 'AGENTS.md'), 'utf8'),
              armBAgentsMd = await fs.readFile(path.join(armBDir, 'AGENTS.md'), 'utf8'),
              armCAgentsMd = await fs.readFile(path.join(armCDir, 'AGENTS.md'), 'utf8');

        expect(armAAgentsMd).toContain('## Verify in the running app before you call a change done');
        expect(armBAgentsMd).toContain('## Verify in the running app before you call a change done');
        expect(armCAgentsMd).toContain('## Verify in the running app before you call a change done');

        const armBNeoConfig = await fs.readJson(path.join(armBDir, 'apps/gridbench/neo-config.json')),
              armCNeoConfig = await fs.readJson(path.join(armCDir, 'apps/gridbench/neo-config.json'));

        expect(armBNeoConfig.useAiClient).toBe(false);
        expect(armCNeoConfig.useAiClient).toBe('development');

        // Verify every configured MCP server starts and answers JSON-RPC initialize over stdio
        const agMcpInit = await probeMcpInitialize({
            command: armAMcp.mcpServers['ag-mcp'].command,
            args   : armAMcp.mcpServers['ag-mcp'].args,
            cwd    : armADir
        });
        expect(agMcpInit.result?.serverInfo?.name).toBe('ag-grid-mcp');

        const nlMcpInit = await probeMcpInitialize({
            command: armCMcp.mcpServers['neural-link'].command,
            args   : armCMcp.mcpServers['neural-link'].args,
            cwd    : armCDir
        });
        expect(nlMcpInit.result?.serverInfo?.name).toBe('neo-neural-link');

        // Verify all three arm starter workspaces boot their dev servers and serve 200 OK
        await verifyArmDevServerAnswers({
            armDir            : armADir,
            seedNodeModulesDir: path.join(ROOT_DIR, 'apps/bigData/react/node_modules'),
            scriptArgs        : ['run', 'dev', '--', '--port', '{PORT}', '--host', '127.0.0.1'],
            checkPaths        : ['/', '/src/main.jsx']
        });

        await verifyArmDevServerAnswers({
            armDir            : armBDir,
            seedNodeModulesDir: path.join(ROOT_DIR, 'apps/bigData/neo/node_modules'),
            scriptArgs        : ['run', 'server-start:headless'],
            checkPaths        : ['/apps/gridbench/index.html', '/src/MicroLoader.mjs', '/node_modules/neo.mjs/src/Main.mjs']
        });

        await verifyArmDevServerAnswers({
            armDir            : armCDir,
            seedNodeModulesDir: path.join(ROOT_DIR, 'apps/bigData/neo/node_modules'),
            scriptArgs        : ['run', 'server-start:headless'],
            checkPaths        : ['/apps/gridbench/index.html', '/src/MicroLoader.mjs', '/node_modules/neo.mjs/src/Main.mjs']
        });
    });

    test('parseTranscriptTelemetry adapts Claude Code and Codex JSONL transcripts and runner verification logs', () => {
        expect(classifyToolCall({toolName: 'mcp__ag-mcp__search_docs'})).toBe('docsKbQueries');
        expect(classifyToolCall({toolName: 'Read', input: {file_path: '.agents/skills/neo-app-authoring/SKILL.md'}})).toBe('docsKbQueries');
        expect(classifyToolCall({toolName: 'mcp__neural-link__inspect_store'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'Write'})).toBe('fileEdits');
        expect(classifyToolCall({toolName: 'Bash'})).toBe('shellTestRuns');

        // 1. Trimmed real Claude Code session transcript + runner verification runs (1 fail, 1 pass, followed by post-green summary)
        const claudeCodeTranscript = [
            JSON.stringify({
                type     : 'user',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:00:00.000Z',
                message  : {role: 'user', content: 'Implement grid-100k-multi-window task'}
            }),
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:01:00.000Z',
                message  : {
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : {input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 300, cache_creation_input_tokens: 100},
                    content: [
                        {type: 'tool_use', id: 'toolu_1', name: 'Read', input: {file_path: '.agents/skills/neo-app-authoring/SKILL.md'}},
                        {type: 'tool_use', id: 'toolu_2', name: 'Write', input: {file_path: 'apps/gridbench/view/Viewport.mjs'}}
                    ]
                }
            }),
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:02:10.000Z',
                message  : {
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : {input_tokens: 1500, output_tokens: 250, cache_read_input_tokens: 800, cache_creation_input_tokens: 0},
                    content: [
                        {type: 'tool_use', id: 'toolu_3', name: 'mcp__neural-link__get_component_tree', input: {}},
                        {type: 'tool_use', id: 'toolu_4', name: 'mcp__neural-link__inspect_store', input: {}},
                        {type: 'tool_use', id: 'toolu_5', name: 'Bash', input: {command: 'npm run server-start:headless'}}
                    ]
                }
            }),
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:02:45.000Z',
                message  : {
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : {input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0},
                    content: [{type: 'text', text: 'All checks passed.'}]
                }
            })
        ].join('\n');

        const claudeTelemetry = parseTranscriptTelemetry(claudeCodeTranscript, {
            arm             : 'arm-c-neo-kb-neural-link',
            verificationRuns: [
                {timestamp: '2026-10-26T16:01:15.000Z', pass: false, durationMs: 4200},
                {timestamp: '2026-10-26T16:02:30.000Z', pass: true,  durationMs: 4500}
            ]
        });

        expect(claudeTelemetry).toEqual({
            arm              : 'arm-c-neo-kb-neural-link',
            harness          : 'claude-code',
            model            : 'claude-opus-4-7',
            versions         : {harnessVersion: '2.1.12', frameworkVersion: 'neo.mjs@13.3.1'},
            pass             : true,
            timeToGreenMs    : 150000,
            totalTokens      : {inputTokens: 2800, outputTokens: 600, cachedTokens: 1200, total: 3400},
            toolCallsByServer: {
                docsKbQueries         : 1,
                neuralLinkRuntimeCalls: 2,
                fileEdits             : 1,
                shellTestRuns         : 1,
                other                 : 0
            },
            verificationFailures: 1
        });

        // 2. Trimmed real Codex CLI JSONL transcript with no passing verification -> timeToGreenMs is null
        const codexTranscript = [
            JSON.stringify({
                type       : 'session_meta',
                timestamp  : '2026-10-26T17:00:00.000Z',
                cli_version: '0.48.0',
                model      : 'gpt-5.4'
            }),
            JSON.stringify({
                type     : 'item.completed',
                timestamp: '2026-10-26T17:00:30.000Z',
                item     : {type: 'mcp_tool_call', server: 'ag-mcp', tool: 'search_docs', arguments: {query: 'column group'}}
            }),
            JSON.stringify({
                type     : 'item.completed',
                timestamp: '2026-10-26T17:01:00.000Z',
                item     : {type: 'file_change', changes: [{path: 'src/App.jsx'}]}
            }),
            JSON.stringify({
                type     : 'item.completed',
                timestamp: '2026-10-26T17:01:20.000Z',
                item     : {type: 'command_execution', command: 'npm run dev'}
            }),
            JSON.stringify({
                type     : 'turn.completed',
                timestamp: '2026-10-26T17:01:30.000Z',
                usage    : {input_tokens: 2000, output_tokens: 400, cached_input_tokens: 500}
            })
        ].join('\n');

        const codexTelemetry = parseTranscriptTelemetry(codexTranscript, {
            arm             : 'arm-a-react-ag-grid-mcp',
            verificationRuns: [
                {timestamp: '2026-10-26T17:01:25.000Z', pass: false, durationMs: 3100}
            ]
        });

        expect(codexTelemetry).toEqual({
            arm              : 'arm-a-react-ag-grid-mcp',
            harness          : 'codex',
            model            : 'gpt-5.4',
            versions         : {harnessVersion: '0.48.0', frameworkVersion: 'ag-grid-community@36.2.0'},
            pass             : false,
            timeToGreenMs    : null,
            totalTokens      : {inputTokens: 2000, outputTokens: 400, cachedTokens: 500, total: 2400},
            toolCallsByServer: {
                docsKbQueries         : 1,
                neuralLinkRuntimeCalls: 0,
                fileEdits             : 1,
                shellTestRuns         : 1,
                other                 : 0
            },
            verificationFailures: 1
        });

        const report   = buildComparisonReport([claudeTelemetry, codexTelemetry]),
              markdown = formatComparisonMarkdown(report);

        expect(report.arms).toHaveLength(2);
        expect(markdown).toContain('claude-code');
        expect(markdown).toContain('claude-opus-4-7');
        expect(markdown).toContain('neo.mjs@13.3.1');
        expect(markdown).toContain('150000');
        expect(markdown).toContain('N/A');
    });

    test('verify.spec.mjs fails on starter shell, no-op-sort, and counter-only-filter mutations, and passes against a compliant 100k multi-window server', async () => {
        test.setTimeout(60000);

        const rows      = generateRows(100000, 42),
              emeaCount = rows.filter(r => r.region === 'EMEA').length;
        let mode = 'starter';

        const buildReferenceHtml = serverMode => `<!doctype html>
<html>
<head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Reference Grid (${serverMode})</title></head>
<body>
  <script>
    const SERVER_MODE = ${JSON.stringify(serverMode)};
    const EMEA_COUNT  = ${emeaCount};
    const params      = new URLSearchParams(location.search);
    const channel     = new BroadcastChannel('grid-detail-sync');
    if (params.get('view') === 'detail') {
      document.body.innerHTML = \`
        <section data-testid="detail-view">
          <h2>Row Detail</h2>
          <div data-testid="detail-row-id">-</div>
          <div data-testid="detail-account-name">-</div>
          <div data-testid="detail-region">-</div>
          <div data-testid="detail-arr-usd">-</div>
          <div data-testid="detail-owner">-</div>
        </section>
      \`;
      channel.onmessage = ({data}) => {
        document.querySelector('[data-testid="detail-row-id"]').textContent = data.id;
        document.querySelector('[data-testid="detail-account-name"]').textContent = data.accountName;
        document.querySelector('[data-testid="detail-region"]').textContent = data.region;
        document.querySelector('[data-testid="detail-arr-usd"]').textContent = String(data.arrUsd);
        document.querySelector('[data-testid="detail-owner"]').textContent = data.owner;
      };
    } else {
      document.body.innerHTML = \`
        <div>
          <span data-testid="total-row-count">0</span>
          <button data-testid="sort-arr-desc">Sort ARR Desc</button>
          <button data-testid="sort-reset">Reset Sort</button>
          <select data-testid="region-filter">
            <option value="ALL">ALL</option>
            <option value="EMEA">EMEA</option>
            <option value="AMER">AMER</option>
            <option value="APAC">APAC</option>
            <option value="LATAM">LATAM</option>
          </select>
          <button data-testid="open-detail-window">Open Detail</button>
        </div>
        <div><span>Identity</span> <span>Performance</span></div>
        <div id="grid-rows"></div>
      \`;
      let allRows = [];
      let sortMode = 'id';
      let region = 'ALL';
      const render = () => {
        let list = (region === 'ALL' || SERVER_MODE === 'counter-only-filter')
          ? allRows
          : allRows.filter(r => r.region === region);
        if (sortMode === 'arr-desc' && SERVER_MODE !== 'no-op-sort') {
          list = [...list].sort((a, b) => b.arrUsd - a.arrUsd);
        }
        const slice = list.slice(0, 50);
        const container = document.getElementById('grid-rows');
        container.innerHTML = slice.map(r => \`<div role="row" data-id="\${r.id}"><span>\${r.id}</span> <span>\${r.accountName}</span> <span>\${r.region}</span> <span>\${r.arrUsd}</span></div>\`).join('');
        container.querySelectorAll('[role="row"]').forEach((el, idx) => {
          el.onclick = () => channel.postMessage(slice[idx]);
        });
        const reportedCount = (SERVER_MODE === 'counter-only-filter' && region === 'EMEA')
          ? EMEA_COUNT
          : list.length;
        document.querySelector('[data-testid="total-row-count"]').textContent = String(reportedCount);
      };
      fetch('/rows.json').then(r => r.json()).then(data => { allRows = data; render(); });
      document.querySelector('[data-testid="sort-arr-desc"]').onclick = () => { sortMode = 'arr-desc'; render(); };
      document.querySelector('[data-testid="sort-reset"]').onclick = () => { sortMode = 'id'; render(); };
      document.querySelector('[data-testid="region-filter"]').onchange = (e) => { region = e.target.value; render(); };
      document.querySelector('[data-testid="open-detail-window"]').onclick = () => { window.open('/?view=detail', 'gridDetailWindow'); };
    }
  </script>
</body>
</html>`;

        const server = http.createServer((req, res) => {
            if (req.url === '/rows.json') {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(rows));
                return;
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            if (mode === 'starter') {
                res.end('<html><body><h1>Unimplemented Starter</h1></body></html>');
                return;
            }
            res.end(buildReferenceHtml(mode));
        });

        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const {port} = server.address();
        const url    = `http://127.0.0.1:${port}`;

        try {
            mode = 'starter';
            const redResult = await runArmVerification({arm: 'arm-a-react-ag-grid-mcp', url, timeoutMs: 1200});
            expect(redResult.pass).toBe(false);

            mode = 'no-op-sort';
            const noOpSortResult = await runArmVerification({arm: 'arm-a-react-ag-grid-mcp', url, timeoutMs: 1500});
            expect(noOpSortResult.pass).toBe(false);
            expect(noOpSortResult.output).toContain('ROW-000001');

            mode = 'counter-only-filter';
            const counterOnlyFilterResult = await runArmVerification({arm: 'arm-b-neo-kb-only', url, timeoutMs: 1500});
            expect(counterOnlyFilterResult.pass).toBe(false);
            expect(counterOnlyFilterResult.output).toContain('ROW-000002');

            mode = 'compliant';
            const greenResult = await runArmVerification({arm: 'arm-c-neo-kb-neural-link', url, timeoutMs: 10000});
            expect(greenResult.pass, greenResult.output).toBe(true);
        } finally {
            await new Promise(resolve => server.close(resolve));
        }
    });
});
