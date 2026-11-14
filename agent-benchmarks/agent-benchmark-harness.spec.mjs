import {test, expect}        from '@playwright/test';
import {spawn, execFileSync} from 'node:child_process';
import fs                    from 'fs-extra';
import http                  from 'node:http';
import net                   from 'node:net';
import os                    from 'node:os';
import path                  from 'path';
import {generateRows}        from './tasks/grid-100k-multi-window/data/generateRows.mjs';
import {
    ARMS,
    adaptTranscriptEntry,
    allocateFreePort,
    classifyToolCall,
    isPortListening,
    parseTranscriptTelemetry,
    buildComparisonReport,
    formatComparisonMarkdown,
    runArmVerification,
    runCleanRoomArm,
    readVerificationRuns,
    sanitizeCleanRoomEnv,
    stageArmWorkspace
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
        expect(classifyToolCall({toolName: 'mcp__neural-link__call_method'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'mcp__neural-link__query_component'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'mcp__neural-link__simulate_event'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'Write'})).toBe('fileEdits');
        expect(classifyToolCall({toolName: 'Bash'})).toBe('shellTestRuns');

        // Verify adaptTranscriptEntry splits mcp__<server>__<tool> into serverName + toolName directly
        const adaptedLine = adaptTranscriptEntry({
            type   : 'assistant',
            message: {
                id     : 'msg_01_test',
                model  : 'claude-opus-4-7',
                usage  : {input_tokens: 500, output_tokens: 100},
                content: [{type: 'tool_use', id: 'toolu_nl', name: 'mcp__neural-link__call_method', input: {method: 'sort'}}]
            }
        });
        expect(adaptedLine.usageId).toBe('msg_01_test');
        expect(adaptedLine.toolCalls).toEqual([
            {serverName: 'neural-link', toolName: 'call_method', input: {method: 'sort'}}
        ]);

        // 1. Trimmed real Claude Code session transcript (multi-line per message.id repeating message.usage)
        //    + runner verification runs (1 fail, 1 pass, followed by post-green summary)
        const msg1Usage = {input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 300, cache_creation_input_tokens: 100};
        const msg2Usage = {input_tokens: 1500, output_tokens: 250, cache_read_input_tokens: 800, cache_creation_input_tokens: 0};
        const claudeCodeTranscript = [
            JSON.stringify({
                type     : 'user',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:00:00.000Z',
                message  : {role: 'user', content: 'Implement grid-100k-multi-window task'}
            }),
            // Response msg_01A spans 2 JSONL lines (1 per content block) repeating identical msg1Usage
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:01:00.000Z',
                message  : {
                    id     : 'msg_01A',
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : msg1Usage,
                    content: [
                        {type: 'tool_use', id: 'toolu_1', name: 'Read', input: {file_path: '.agents/skills/neo-app-authoring/SKILL.md'}}
                    ]
                }
            }),
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:01:02.000Z',
                message  : {
                    id     : 'msg_01A',
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : msg1Usage,
                    content: [
                        {type: 'tool_use', id: 'toolu_2', name: 'Write', input: {file_path: 'apps/gridbench/view/Viewport.mjs'}}
                    ]
                }
            }),
            // Response msg_01B spans 3 JSONL lines (including call_method & query_component) repeating identical msg2Usage
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:02:10.000Z',
                message  : {
                    id     : 'msg_01B',
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : msg2Usage,
                    content: [
                        {type: 'tool_use', id: 'toolu_3', name: 'mcp__neural-link__call_method', input: {}}
                    ]
                }
            }),
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:02:11.000Z',
                message  : {
                    id     : 'msg_01B',
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : msg2Usage,
                    content: [
                        {type: 'tool_use', id: 'toolu_4', name: 'mcp__neural-link__query_component', input: {}}
                    ]
                }
            }),
            JSON.stringify({
                type     : 'assistant',
                sessionId: 'cc-session-01',
                version  : '2.1.12',
                timestamp: '2026-10-26T16:02:12.000Z',
                message  : {
                    id     : 'msg_01B',
                    model  : 'claude-opus-4-7',
                    role   : 'assistant',
                    usage  : msg2Usage,
                    content: [
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
                    id     : 'msg_01C',
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
            sessionDurationMs: null,
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
            sessionDurationMs: null,
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

    test('parseTranscriptTelemetry normalizes Claude stream-json envelopes without double-counting result.usage', () => {
        const streamJsonTranscript = [
            JSON.stringify({
                type               : 'system',
                subtype            : 'init',
                claude_code_version: '2.1.119',
                model              : 'claude-sonnet-4-6',
                timestamp          : '2026-10-27T10:00:00.000Z'
            }),
            JSON.stringify({
                type     : 'assistant',
                timestamp: '2026-10-27T10:00:10.000Z',
                message  : {
                    id     : 'msg_stream_01',
                    model  : 'claude-sonnet-4-6',
                    role   : 'assistant',
                    usage  : {input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 400, cache_creation_input_tokens: 100},
                    content: [{type: 'tool_use', id: 'toolu_s1', name: 'mcp__ag-mcp__search_docs', input: {query: 'virtualisation'}}]
                }
            }),
            JSON.stringify({
                type     : 'assistant',
                timestamp: '2026-10-27T10:00:11.000Z',
                message  : {
                    id     : 'msg_stream_01',
                    model  : 'claude-sonnet-4-6',
                    role   : 'assistant',
                    usage  : {input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 400, cache_creation_input_tokens: 100},
                    content: [{type: 'tool_use', id: 'toolu_s2', name: 'Edit', input: {file_path: 'src/App.jsx'}}]
                }
            }),
            JSON.stringify({
                type     : 'rate_limit_event',
                version  : '2.1.119',
                timestamp: '2026-10-27T10:00:20.000Z'
            }),
            JSON.stringify({
                type     : 'assistant',
                timestamp: '2026-10-27T10:00:30.000Z',
                message  : {
                    id     : 'msg_stream_02',
                    model  : 'claude-sonnet-4-6',
                    role   : 'assistant',
                    usage  : {input_tokens: 600, output_tokens: 150, cache_read_input_tokens: 500, cache_creation_input_tokens: 0},
                    content: [{type: 'text', text: 'Done.'}]
                }
            }),
            JSON.stringify({
                type       : 'result',
                subtype    : 'success',
                duration_ms: 45000,
                timestamp  : '2026-10-27T10:00:45.000Z',
                usage      : {
                    input_tokens               : 1600,
                    output_tokens              : 350,
                    cache_read_input_tokens    : 900,
                    cache_creation_input_tokens: 100
                }
            })
        ].join('\n');

        const telemetry = parseTranscriptTelemetry(streamJsonTranscript, {
            arm             : 'arm-a-react-ag-grid-mcp',
            verificationRuns: [{timestamp: '2026-10-27T10:00:42.000Z', pass: true, durationMs: 3200}]
        });

        expect(telemetry.harness).toBe('claude-code');
        expect(telemetry.model).toBe('claude-sonnet-4-6');
        expect(telemetry.versions.harnessVersion).toBe('2.1.119');
        expect(telemetry.timeToGreenMs).toBe(42000);
        expect(telemetry.sessionDurationMs).toBe(45000);
        expect(telemetry.totalTokens).toEqual({
            inputTokens : 1600,
            outputTokens: 350,
            cachedTokens: 1000,
            total       : 1950
        });

        // Result-only fallback when zero per-message usage entries exist (no start timestamp -> timeToGreenMs stays null)
        const resultOnlyTranscript = JSON.stringify({
            type               : 'result',
            subtype            : 'success',
            claude_code_version: '2.1.119',
            duration_ms        : 38500,
            modelUsage         : {'claude-sonnet-4-6': {inputTokens: 900, outputTokens: 210}},
            usage              : {
                input_tokens               : 900,
                output_tokens              : 210,
                cache_read_input_tokens    : 300,
                cache_creation_input_tokens: 50
            }
        });

        const fallbackTelemetry = parseTranscriptTelemetry(resultOnlyTranscript, {
            arm             : 'arm-b-neo-kb-only',
            verificationRuns: [{timestamp: '2026-10-27T10:05:00.000Z', pass: true, durationMs: 2800}]
        });

        expect(fallbackTelemetry.harness).toBe('claude-code');
        expect(fallbackTelemetry.model).toBe('claude-sonnet-4-6');
        expect(fallbackTelemetry.versions.harnessVersion).toBe('2.1.119');
        expect(fallbackTelemetry.timeToGreenMs).toBeNull();
        expect(fallbackTelemetry.sessionDurationMs).toBe(38500);
        expect(fallbackTelemetry.totalTokens).toEqual({
            inputTokens : 900,
            outputTokens: 210,
            cachedTokens: 350,
            total       : 1110
        });
    });

    test('PROMPT.md verification section aligns with runAgentBenchmark.mjs --verify-arm across all three arms', async () => {
        const promptMd = await fs.readFile(
            path.join(ROOT_DIR, 'agent-benchmarks/tasks/grid-100k-multi-window/PROMPT.md'),
            'utf8'
        );

        expect(promptMd).toContain('node ../../runner/runAgentBenchmark.mjs --verify-arm');
        expect(promptMd).not.toContain('npx playwright test agent-benchmarks/tasks/');

        for (const arm of ARMS) {
            const agentsMd = await fs.readFile(
                path.join(ROOT_DIR, 'agent-benchmarks/arms', arm, 'AGENTS.md'),
                'utf8'
            );
            expect(agentsMd).toContain(`node ../../runner/runAgentBenchmark.mjs --verify-arm ${arm} --url http://localhost:`);
        }
    });

    test('clean-room environment, port helpers, stageArmWorkspace, and runCleanRoomArm isolate arms without host leakage', async () => {
        const sanitized = sanitizeCleanRoomEnv(
            {
                PATH                  : '/usr/bin:/bin',
                HOME                  : '/Users/tester',
                NEO_FLEET_BRIDGE_TOKEN: 'secret-bridge-token',
                NEO_PLANE_DATA_ROOT   : '/private/plane',
                NEO_NL_PORT           : '8081',
                AGY_ACCOUNT           : 'work',
                CLAUDECODE            : '1',
                CLAUDE_CODE_ENTRYPOINT: 'cli'
            },
            {PORT: 18080, NEO_NL_PORT: 18081}
        );

        expect(sanitized).toEqual({
            PATH       : '/usr/bin:/bin',
            HOME       : '/Users/tester',
            PORT       : '18080',
            NEO_NL_PORT: '18081'
        });

        const busyServer = net.createServer();
        await new Promise(resolve => busyServer.listen(0, '127.0.0.1', resolve));
        const busyPort = busyServer.address().port;

        try {
            expect(await isPortListening(busyPort)).toBe(true);
            const fallbackPort = await allocateFreePort(busyPort);
            expect(fallbackPort).not.toBe(busyPort);
            expect(fallbackPort).toBeGreaterThan(0);
        } finally {
            await new Promise(resolve => busyServer.close(resolve));
        }
        expect(await isPortListening(busyPort)).toBe(false);

        const customAppPortC = await allocateFreePort(0),
              customNlPortC  = await allocateFreePort(0),
              stagedC        = await stageArmWorkspace({
                  arm        : 'arm-c-neo-kb-neural-link',
                  appPort    : customAppPortC,
                  nlPort     : customNlPortC,
                  installDeps: false
              });

        try {
            expect(stagedC.appPort).toBe(customAppPortC);
            expect(stagedC.nlPort).toBe(customNlPortC);
            expect(stagedC.appUrl).toBe(`http://localhost:${customAppPortC}/apps/gridbench/index.html`);

            const stagedMcp       = await fs.readJson(path.join(stagedC.armDir, '.mcp.json')),
                  stagedCodexToml = await fs.readFile(path.join(stagedC.armDir, '.codex/config.toml'), 'utf8'),
                  stagedNeoConfig = await fs.readJson(path.join(stagedC.armDir, 'apps/gridbench/neo-config.json')),
                  stagedPkg       = await fs.readJson(path.join(stagedC.armDir, 'package.json')),
                  stagedAgentsMd  = await fs.readFile(path.join(stagedC.armDir, 'AGENTS.md'), 'utf8');

            expect(stagedMcp.mcpServers['neural-link'].env.NEO_NL_PORT).toBe(String(customNlPortC));
            expect(stagedCodexToml).toContain('[mcp_servers.neural-link.env]');
            expect(stagedCodexToml).toContain(`NEO_NL_PORT = "${customNlPortC}"`);
            expect(stagedNeoConfig.neuralLinkUrl).toBe(`ws://127.0.0.1:${customNlPortC}`);
            expect(stagedPkg.scripts['server-start:headless']).toContain(`PORT=${customAppPortC} webpack serve`);
            expect(stagedAgentsMd).toContain(`http://localhost:${customAppPortC}/apps/gridbench/index.html`);
            expect(stagedAgentsMd).not.toContain('http://localhost:8080');
            expect(await fs.pathExists(path.join(stagedC.stageRoot, 'node_modules'))).toBe(true);
            expect(await fs.pathExists(path.join(stagedC.armDir, '.agents'))).toBe(false);
            expect(await fs.pathExists(path.join(stagedC.armDir, 'node_modules'))).toBe(false);
        } finally {
            await fs.remove(stagedC.stageRoot);
        }

        const customAppPortA = await allocateFreePort(0),
              stagedA        = await stageArmWorkspace({
                  arm        : 'arm-a-react-ag-grid-mcp',
                  appPort    : customAppPortA,
                  installDeps: false
              });

        try {
            expect(stagedA.nlPort).toBeNull();
            const stagedAPkg      = await fs.readJson(path.join(stagedA.armDir, 'package.json')),
                  stagedAAgentsMd = await fs.readFile(path.join(stagedA.armDir, 'AGENTS.md'), 'utf8');

            expect(stagedAPkg.scripts.dev).toBe(`vite --port ${customAppPortA}`);
            expect(stagedAAgentsMd).toContain(`http://localhost:${customAppPortA}`);
            expect(stagedAAgentsMd).not.toContain('http://localhost:5174');
        } finally {
            await fs.remove(stagedA.stageRoot);
        }

        const tempOutDir       = path.join(os.tmpdir(), `neo-agent-bench-out-${Date.now()}`),
              allocatedAppPort = await allocateFreePort(0),
              prevBridge       = process.env.NEO_FLEET_BRIDGE_TOKEN,
              prevClaude       = process.env.CLAUDECODE;

        process.env.NEO_FLEET_BRIDGE_TOKEN = 'host-secret';
        process.env.CLAUDECODE             = '1';

        try {
            const mockCmd = [
                'test -z "$NEO_FLEET_BRIDGE_TOKEN"',
                'test -z "$CLAUDECODE"',
                'printf \'%s\\n\' \'{"type":"system","claude_code_version":"2.1.119","model":"claude-sonnet-4-6"}\'',
                'printf \'%s\\n\' \'{"type":"assistant","message":{"id":"m1","model":"claude-sonnet-4-6","usage":{"input_tokens":400,"output_tokens":80},"content":[{"type":"text","text":"ok"}]}}\'',
                'mkdir -p ../../results',
                'node -e \'require("fs").appendFileSync("../../results/arm-b-neo-kb-only-verify-runs.jsonl", JSON.stringify({type:"benchmark_verification",timestamp:new Date().toISOString(),arm:"arm-b-neo-kb-only",pass:true,durationMs:120}) + "\\n")\'',
                'printf \'%s\\n\' \'{"type":"result","duration_ms":250,"usage":{"input_tokens":400,"output_tokens":80}}\''
            ].join(' && ');

            const result = await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                cmd        : mockCmd,
                outDir     : tempOutDir,
                appPort    : allocatedAppPort,
                installDeps: false
            });

            expect(result.telemetry.pass).toBe(true);
            expect(result.telemetry.versions.harnessVersion).toBe('2.1.119');
            expect(result.telemetry.totalTokens.total).toBe(480);
            expect(result.telemetry.timeToGreenMs).not.toBeNull();
            expect(result.telemetry.sessionDurationMs).toBe(250);
            expect(result.telemetry.postExitVerification).toBeNull();
            expect(result.postExitVerifyLogPath).toBeNull();
            expect(await fs.pathExists(result.transcriptPath)).toBe(true);
            expect(await fs.pathExists(result.verifyLogPath)).toBe(true);
            expect(await isPortListening(allocatedAppPort)).toBe(false);
        } finally {
            if (prevBridge === undefined) delete process.env.NEO_FLEET_BRIDGE_TOKEN;
            else process.env.NEO_FLEET_BRIDGE_TOKEN = prevBridge;
            if (prevClaude === undefined) delete process.env.CLAUDECODE;
            else process.env.CLAUDECODE = prevClaude;
            await fs.remove(tempOutDir);
        }
    });

    test('runCleanRoomArm isolates post-exit checks from agent verification telemetry and tears down detached listeners', async () => {
        test.setTimeout(60000);

        const dummyServerSource = [
            'const http = require("node:http");',
            'http.createServer(function (req, res) {',
            '    res.writeHead(200, {"Content-Type": "text/html"});',
            '    res.end("<html><body>not a grid</body></html>");',
            '}).listen(Number(process.env.PORT), "127.0.0.1");'
        ].join('\n');
        const dummyServerB64 = Buffer.from(dummyServerSource, 'utf8').toString('base64');

        // Mock agent that never runs --verify-arm and leaves a detached background HTTP server running on PORT
        const detachedAgentSource = [
            'const {spawn} = require("node:child_process");',
            'const net = require("node:net");',
            `const serverCode = Buffer.from("${dummyServerB64}", "base64").toString("utf8");`,
            'const bg = spawn(process.execPath, ["-e", serverCode], {detached: true, stdio: "ignore", env: process.env});',
            'bg.unref();',
            'const port = Number(process.env.PORT);',
            'function waitReady() {',
            '    const sock = net.connect({port, host: "127.0.0.1"});',
            '    sock.once("connect", function () {',
            '        sock.destroy();',
            '        process.stdout.write(JSON.stringify({type: "system", claude_code_version: "2.1.119", model: "claude-sonnet-4-6"}) + "\\n");',
            '        process.stdout.write(JSON.stringify({type: "result", duration_ms: 310, usage: {input_tokens: 200, output_tokens: 40}}) + "\\n");',
            '        process.exit(0);',
            '    });',
            '    sock.once("error", function () {',
            '        sock.destroy();',
            '        setTimeout(waitReady, 25);',
            '    });',
            '}',
            'waitReady();'
        ].join('\n');
        const detachedAgentB64 = Buffer.from(detachedAgentSource, 'utf8').toString('base64'),
              detachedAgentCmd = `node -e "eval(Buffer.from('${detachedAgentB64}','base64').toString('utf8'))"`;

        // (a) Default (`postExitVerify: false`): no post-exit check runs, agent telemetry stays uncontaminated, detached listener is torn down
        const tempOutDirA  = path.join(os.tmpdir(), `neo-agent-bench-probe-a-${Date.now()}`),
              probeAppPort = await allocateFreePort(0);

        try {
            const resultA = await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                cmd        : detachedAgentCmd,
                outDir     : tempOutDirA,
                appPort    : probeAppPort,
                installDeps: false
            });

            expect(resultA.telemetry.pass).toBe(false);
            expect(resultA.telemetry.verificationFailures).toBe(0);
            expect(resultA.telemetry.timeToGreenMs).toBeNull();
            expect(resultA.telemetry.postExitVerification).toBeNull();
            expect(resultA.postExitVerifyLogPath).toBeNull();
            expect(await fs.pathExists(resultA.verifyLogPath)).toBe(false);
            expect(await isPortListening(probeAppPort)).toBe(false);
        } finally {
            await fs.remove(tempOutDirA);
        }

        // (b) `postExitVerify: true` with agent-left detached server: post-exit check writes to <arm>-post-exit-verify.jsonl without touching agent verify telemetry
        const tempOutDirB   = path.join(os.tmpdir(), `neo-agent-bench-probe-b-${Date.now()}`),
              probeAppPort2 = await allocateFreePort(0);

        try {
            const resultB = await runCleanRoomArm({
                arm                    : 'arm-b-neo-kb-only',
                cmd                    : detachedAgentCmd,
                outDir                 : tempOutDirB,
                appPort                : probeAppPort2,
                installDeps            : false,
                postExitVerify         : true,
                postExitVerifyTimeoutMs: 1500
            });

            expect(resultB.telemetry.pass).toBe(false);
            expect(resultB.telemetry.verificationFailures).toBe(0);
            expect(resultB.telemetry.timeToGreenMs).toBeNull();
            expect(await fs.pathExists(resultB.verifyLogPath)).toBe(false);
            expect(resultB.telemetry.postExitVerification).toMatchObject({
                type                 : 'runner_post_exit_verification',
                ran                  : true,
                pass                 : false,
                serverStartedByRunner: false
            });
            expect(await fs.pathExists(resultB.postExitVerifyLogPath)).toBe(true);

            const persistedLines = (await fs.readFile(resultB.postExitVerifyLogPath, 'utf8')).trim().split('\n').map(l => JSON.parse(l));
            expect(persistedLines).toHaveLength(1);
            expect(persistedLines[0]).toMatchObject({
                type: 'runner_post_exit_verification',
                arm : 'arm-b-neo-kb-only',
                pass: false
            });
            expect(await isPortListening(probeAppPort2)).toBe(false);
        } finally {
            await fs.remove(tempOutDirB);
        }

        // (c) `postExitVerify: true` when agent stopped its server before exit: runner boots the staged dev script uniformly and tears it down
        const stoppedServerAgentSource = [
            'const fs = require("node:fs");',
            'const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));',
            `pkg.scripts.dev = "node -e \\"eval(Buffer.from('${dummyServerB64}','base64').toString('utf8'))\\"";`,
            'fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 4), "utf8");',
            'process.stdout.write(JSON.stringify({type: "system", claude_code_version: "2.1.119", model: "claude-sonnet-4-6"}) + "\\n");',
            'process.stdout.write(JSON.stringify({type: "result", duration_ms: 210, usage: {input_tokens: 150, output_tokens: 30}}) + "\\n");'
        ].join('\n');
        const stoppedAgentB64 = Buffer.from(stoppedServerAgentSource, 'utf8').toString('base64'),
              stoppedAgentCmd = `node -e "eval(Buffer.from('${stoppedAgentB64}','base64').toString('utf8'))"`,
              tempOutDirC     = path.join(os.tmpdir(), `neo-agent-bench-probe-c-${Date.now()}`),
              probeAppPort3   = await allocateFreePort(0);

        try {
            const resultC = await runCleanRoomArm({
                arm                     : 'arm-a-react-ag-grid-mcp',
                cmd                     : stoppedAgentCmd,
                outDir                  : tempOutDirC,
                appPort                 : probeAppPort3,
                installDeps             : false,
                postExitVerify          : true,
                postExitStartupTimeoutMs: 5000,
                postExitVerifyTimeoutMs : 1500
            });

            expect(resultC.telemetry.pass).toBe(false);
            expect(resultC.telemetry.verificationFailures).toBe(0);
            expect(await fs.pathExists(resultC.verifyLogPath)).toBe(false);
            expect(resultC.telemetry.postExitVerification).toMatchObject({
                type                 : 'runner_post_exit_verification',
                ran                  : true,
                pass                 : false,
                serverStartedByRunner: true
            });
            expect(await fs.pathExists(resultC.postExitVerifyLogPath)).toBe(true);
            expect(await isPortListening(probeAppPort3)).toBe(false);
        } finally {
            await fs.remove(tempOutDirC);
        }
    });
});
