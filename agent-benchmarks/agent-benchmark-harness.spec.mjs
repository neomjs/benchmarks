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
    buildAgentSpawnSpec,
    buildCleanRoomChildEnv,
    classifyToolCall,
    cleanupStagedCredentials,
    expectedArmMcpDescriptors,
    expectedArmMcpServers,
    isAgentTranscriptEvent,
    isPortListening,
    parseTranscriptTelemetry,
    buildComparisonReport,
    formatComparisonMarkdown,
    redactCredentials,
    redactDiagnosticValue,
    resolveEffectiveGeminiMcpConfig,
    runArmVerification,
    runCleanRoomArm,
    readVerificationRuns,
    sanitizeCleanRoomEnv,
    stageArmWorkspace,
    stageHarnessCredentials,
    verifyCodexMcpPreflight
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
    const armNodeModules      = path.join(armDir, 'node_modules'),
          armLockPath         = path.join(armDir, 'package-lock.json'),
          hadLockBefore       = await fs.pathExists(armLockPath),
          armPkg              = await fs.readJson(path.join(armDir, 'package.json')),
          expectedNeoVer      = armPkg.dependencies?.['neo.mjs'] || null;
    let   createdNodeModules  = false;

    if (!await fs.pathExists(armNodeModules)) {
        let canUseSeed = Boolean(seedNodeModulesDir) && await fs.pathExists(seedNodeModulesDir);
        if (canUseSeed && expectedNeoVer) {
            const seedNeoPkgPath = path.join(seedNodeModulesDir, 'neo.mjs/package.json'),
                  seedServerPath = path.join(seedNodeModulesDir, 'neo.mjs/buildScripts/util/fileServer.mjs'),
                  seedNeoPkg     = (await fs.pathExists(seedNeoPkgPath)) ? await fs.readJson(seedNeoPkgPath) : null;
            canUseSeed = seedNeoPkg?.version === expectedNeoVer && await fs.pathExists(seedServerPath);
        }

        if (canUseSeed) {
            await fs.ensureSymlink(seedNodeModulesDir, armNodeModules, 'dir');
            createdNodeModules = true;
        } else {
            execFileSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--no-package-lock'], {
                cwd  : armDir,
                stdio: 'inherit'
            });
            createdNodeModules = true;
        }
    }

    const port  = await getFreePort(),
          child = spawn('npm', scriptArgs.map(a => a.replace('{PORT}', String(port))), {
              cwd     : armDir,
              detached: true,
              env     : {...process.env, PORT: String(port), ...env},
              stdio   : ['ignore', 'pipe', 'pipe']
          });

    let serverLog = '';
    child.stdout?.on('data', chunk => { serverLog = (serverLog + chunk.toString('utf8')).slice(-4000); });
    child.stderr?.on('data', chunk => { serverLog = (serverLog + chunk.toString('utf8')).slice(-4000); });

    try {
        const baseUrl  = `http://localhost:${port}`,
              deadline = Date.now() + 30000;
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

        expect(ready, `Dev server in ${armDir} did not answer 200 on ${checkPaths[0]}. Log:\n${serverLog}`).toBe(true);

        for (const checkPath of checkPaths) {
            const res = await fetch(`${baseUrl}${checkPath}`);
            expect(res.status, `Expected 200 for ${checkPath} in ${armDir}`).toBe(200);
        }
    } finally {
        try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        child.kill('SIGTERM');
        if (createdNodeModules) {
            await fs.remove(armNodeModules);
        }
        if (!hadLockBefore && await fs.pathExists(armLockPath)) {
            await fs.remove(armLockPath);
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
        test.setTimeout(120000);

        expect(ARMS).toEqual([
            'arm-a-react-ag-grid-mcp',
            'arm-b-neo-kb-only',
            'arm-c-neo-kb-neural-link'
        ]);

        const armADir = path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-a-react-ag-grid-mcp'),
              armBDir = path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-b-neo-kb-only'),
              armCDir = path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-c-neo-kb-neural-link');

        const armAMcp    = await fs.readJson(path.join(armADir, '.mcp.json')),
              armBMcp    = await fs.readJson(path.join(armBDir, '.mcp.json')),
              armCMcp    = await fs.readJson(path.join(armCDir, '.mcp.json')),
              armAGemini = await fs.readJson(path.join(armADir, '.gemini/settings.json')),
              armBGemini = await fs.readJson(path.join(armBDir, '.gemini/settings.json')),
              armCGemini = await fs.readJson(path.join(armCDir, '.gemini/settings.json'));

        expect(Object.keys(armAMcp.mcpServers)).toEqual(['ag-mcp']);
        expect(Object.keys(armBMcp.mcpServers)).toEqual([]);
        expect(Object.keys(armCMcp.mcpServers)).toEqual(['neural-link']);

        expect(armAGemini.context.fileName).toEqual(['AGENTS.md', 'GEMINI.md']);
        expect(armBGemini.context.fileName).toEqual(['AGENTS.md', 'GEMINI.md']);
        expect(armCGemini.context.fileName).toEqual(['AGENTS.md', 'GEMINI.md']);
        expect(armAGemini.mcp.allowed).toEqual(['ag-mcp']);
        expect(armBGemini.admin).toBeUndefined();
        expect(armBGemini.mcp.allowed).toEqual([]);
        expect(armCGemini.mcp.allowed).toEqual(['neural-link']);
        expect(Object.keys(armAGemini.mcpServers)).toEqual(['ag-mcp']);
        expect(Object.keys(armBGemini.mcpServers)).toEqual([]);
        expect(Object.keys(armCGemini.mcpServers)).toEqual(['neural-link']);

        const armBPkg = await fs.readJson(path.join(armBDir, 'package.json')),
              armCPkg = await fs.readJson(path.join(armCDir, 'package.json'));
        expect(armBPkg.dependencies['neo.mjs']).toBe('14.0.0');
        expect(armCPkg.dependencies['neo.mjs']).toBe('14.0.0');
        expect(armBPkg.devDependencies['neo-agent-skills']).toBe('2.9.3');
        expect(armCPkg.devDependencies['neo-agent-skills']).toBe('2.9.3');

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

        const sharedNeo14SeedDir = path.join(os.tmpdir(), `neo-agent-bench-neo14-seed-${Date.now()}`);
        await fs.ensureDir(sharedNeo14SeedDir);
        await fs.copy(path.join(armBDir, 'package.json'), path.join(sharedNeo14SeedDir, 'package.json'));
        execFileSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--no-package-lock'], {
            cwd  : sharedNeo14SeedDir,
            stdio: 'inherit'
        });
        const neo14NodeModules = path.join(sharedNeo14SeedDir, 'node_modules');

        try {
            await verifyArmDevServerAnswers({
                armDir            : armBDir,
                seedNodeModulesDir: neo14NodeModules,
                scriptArgs        : ['run', 'server-start:headless'],
                checkPaths        : ['/apps/gridbench/index.html', '/src/MicroLoader.mjs', '/node_modules/neo.mjs/src/Main.mjs']
            });

            await verifyArmDevServerAnswers({
                armDir            : armCDir,
                seedNodeModulesDir: neo14NodeModules,
                scriptArgs        : ['run', 'server-start:headless'],
                checkPaths        : ['/apps/gridbench/index.html', '/src/MicroLoader.mjs', '/node_modules/neo.mjs/src/Main.mjs']
            });
        } finally {
            await fs.remove(sharedNeo14SeedDir);
        }
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
            versions         : {harnessVersion: '2.1.12', frameworkVersion: 'neo.mjs@14.0.0'},
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
        expect(markdown).toContain('neo.mjs@14.0.0');
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
                AGY_ACCOUNT                 : 'work',
                GEMINI_CLI_IDE_SERVER       : '12345',
                SANDBOX_ENV                 : 'GEMINI_CLI_SYSTEM_SETTINGS_PATH=/host/sys.json,NEO_NL_PORT=9999',
                SANDBOX_MOUNTS              : '/host/gemini:/home/node/.gemini:ro',
                SANDBOX_FLAGS               : '--privileged',
                SANDBOX_PORTS               : '9999',
                GEMINI_SANDBOX_PROXY_COMMAND: 'proxy',
                SEATBELT_PROFILE            : 'custom',
                BUILD_SANDBOX               : '1',
                CLAUDECODE                  : '1',
                CLAUDE_CODE_ENTRYPOINT: 'cli',
                CLAUDE_CONFIG_DIR     : '/Users/tester/.neo-ai/claude',
                CODEX_HOME            : '/Users/tester/.neo-ai/codex'
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
                  stagedGemini    = await fs.readJson(path.join(stagedC.armDir, '.gemini/settings.json')),
                  stagedCodexToml = await fs.readFile(path.join(stagedC.armDir, '.codex/config.toml'), 'utf8'),
                  stagedNeoConfig = await fs.readJson(path.join(stagedC.armDir, 'apps/gridbench/neo-config.json')),
                  stagedPkg       = await fs.readJson(path.join(stagedC.armDir, 'package.json')),
                  stagedAgentsMd  = await fs.readFile(path.join(stagedC.armDir, 'AGENTS.md'), 'utf8');

            expect(stagedMcp.mcpServers['neural-link'].env.NEO_NL_PORT).toBe(String(customNlPortC));
            expect(stagedGemini.mcpServers['neural-link'].env.NEO_NL_PORT).toBe(String(customNlPortC));
            expect(stagedCodexToml).toContain('[mcp_servers.neural-link.env]');
            expect(stagedCodexToml).toContain(`NEO_NL_PORT = "${customNlPortC}"`);
            expect(stagedNeoConfig.neuralLinkUrl).toBe(`ws://127.0.0.1:${customNlPortC}`);
            expect(stagedPkg.scripts['server-start:headless']).toContain(`fileServer.mjs --no-open --port ${customAppPortC}`);
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

    test('parseTranscriptTelemetry and runCleanRoomArm execute Gemini CLI stream-json harness end-to-end without double-counting cached tokens', async () => {
        expect(classifyToolCall({toolName: 'ag-mcp_search_docs'})).toBe('docsKbQueries');
        expect(classifyToolCall({toolName: 'ag_mcp_search_docs'})).toBe('docsKbQueries');
        expect(classifyToolCall({toolName: 'neural-link_inspect_store'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'neural_link_call_method'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'read_file', input: {file_path: '.agents/skills/neo-app-authoring/SKILL.md'}})).toBe('docsKbQueries');
        expect(classifyToolCall({toolName: 'grep_search', input: {dir_path: 'node_modules/neo.mjs/learn'}})).toBe('docsKbQueries');
        expect(classifyToolCall({toolName: 'write_file', input: {file_path: 'apps/gridbench/view/Viewport.mjs'}})).toBe('fileEdits');
        expect(classifyToolCall({toolName: 'replace', input: {file_path: 'apps/gridbench/view/Viewport.mjs'}})).toBe('fileEdits');
        expect(classifyToolCall({toolName: 'run_shell_command', input: {command: 'npm run server-start:headless'}})).toBe('shellTestRuns');

        const geminiStreamJson = [
            JSON.stringify({
                type      : 'init',
                timestamp : '2026-11-26T00:10:00.000Z',
                session_id: 'gem-session-01',
                model     : 'gemini-3.1-pro-preview'
            }),
            JSON.stringify({
                type     : 'message',
                timestamp: '2026-11-26T00:10:01.000Z',
                role     : 'user',
                content  : 'Implement gridbench'
            }),
            JSON.stringify({
                type      : 'tool_use',
                timestamp : '2026-11-26T00:10:05.000Z',
                tool_name : 'read_file',
                tool_id   : 'call_1',
                parameters: {file_path: '.agents/skills/neo-app-authoring/SKILL.md'}
            }),
            JSON.stringify({
                type     : 'tool_result',
                timestamp: '2026-11-26T00:10:06.000Z',
                tool_id  : 'call_1',
                status   : 'success',
                output   : '# Neo App Authoring'
            }),
            JSON.stringify({
                type      : 'tool_use',
                timestamp : '2026-11-26T00:10:12.000Z',
                tool_name : 'write_file',
                tool_id   : 'call_2',
                parameters: {file_path: 'apps/gridbench/view/Viewport.mjs'}
            }),
            JSON.stringify({
                type      : 'tool_use',
                timestamp : '2026-11-26T00:10:20.000Z',
                tool_name : 'run_shell_command',
                tool_id   : 'call_3',
                parameters: {command: 'npm run server-start:headless'}
            }),
            JSON.stringify({
                type      : 'tool_use',
                timestamp : '2026-11-26T00:10:25.000Z',
                tool_name : 'neural-link_inspect_store',
                tool_id   : 'call_4',
                parameters: {storeId: 'grid-store'}
            }),
            JSON.stringify({
                type      : 'tool_use',
                timestamp : '2026-11-26T00:10:26.000Z',
                tool_name : 'neural_link_call_method',
                tool_id   : 'call_5',
                parameters: {method: 'sort'}
            }),
            JSON.stringify({
                type     : 'message',
                timestamp: '2026-11-26T00:10:39.000Z',
                role     : 'assistant',
                content  : 'Verified in running app.',
                delta    : true
            }),
            JSON.stringify({
                type     : 'result',
                timestamp: '2026-11-26T00:10:40.000Z',
                status   : 'success',
                stats    : {
                    total_tokens : 15600,
                    input_tokens : 15000,
                    output_tokens: 600,
                    cached       : 12000,
                    input        : 3000,
                    duration_ms  : 40000,
                    tool_calls   : 5,
                    models       : {
                        'gemini-3.1-pro-preview': {
                            total_tokens : 15600,
                            input_tokens : 15000,
                            output_tokens: 600,
                            cached       : 12000,
                            input        : 3000
                        }
                    }
                }
            })
        ].join('\n');

        const telemetry = parseTranscriptTelemetry(geminiStreamJson, {
            arm             : 'arm-c-neo-kb-neural-link',
            versions        : {harnessVersion: '0.38.1'},
            verificationRuns: [{timestamp: '2026-11-26T00:10:35.000Z', pass: true, durationMs: 3400}]
        });

        expect(telemetry).toEqual({
            arm              : 'arm-c-neo-kb-neural-link',
            harness          : 'gemini',
            model            : 'gemini-3.1-pro-preview',
            versions         : {harnessVersion: '0.38.1', frameworkVersion: 'neo.mjs@14.0.0'},
            pass             : true,
            timeToGreenMs    : 35000,
            sessionDurationMs: 40000,
            totalTokens      : {
                inputTokens : 3000,
                outputTokens: 600,
                cachedTokens: 12000,
                total       : 15600
            },
            toolCallsByServer: {
                docsKbQueries         : 1,
                neuralLinkRuntimeCalls: 2,
                fileEdits             : 1,
                shellTestRuns         : 1,
                other                 : 0
            },
            verificationFailures: 0
        });

        // RA-2a: Gemini CLI v0.38.1 StreamJsonFormatter replay where `total_tokens` (250) includes cached (60) + reasoning/thought (130) + uncached input (40) + candidate output (20)
        const geminiThoughtReplay = [
            JSON.stringify({
                type      : 'init',
                timestamp : '2026-11-26T01:00:00.000Z',
                session_id: 'gem-thought-01',
                model     : 'gemini-3.1-pro-preview'
            }),
            JSON.stringify({
                type     : 'result',
                timestamp: '2026-11-26T01:00:05.000Z',
                status   : 'success',
                stats    : {
                    total_tokens : 250,
                    input_tokens : 100,
                    output_tokens: 20,
                    cached       : 60,
                    input        : 40,
                    duration_ms  : 5000,
                    tool_calls   : 0,
                    models       : {
                        'gemini-3.1-pro-preview': {
                            total_tokens : 250,
                            input_tokens : 100,
                            output_tokens: 20,
                            cached       : 60,
                            input        : 40
                        }
                    }
                }
            })
        ].join('\n');

        const thoughtTelemetry = parseTranscriptTelemetry(geminiThoughtReplay, {
            arm     : 'arm-b-neo-kb-only',
            versions: {harnessVersion: '0.38.1'}
        });
        expect(thoughtTelemetry.harness).toBe('gemini');
        expect(thoughtTelemetry.totalTokens).toEqual({
            inputTokens : 40,
            outputTokens: 20,
            cachedTokens: 60,
            total       : 250
        });

        // RA-2b: Generic `type: "message"` record with `usage` + `toolCalls` must NOT be hijacked by the Gemini branch
        const genericMessageLine = JSON.stringify({
            type     : 'message',
            timestamp: '2026-11-26T01:05:00.000Z',
            role     : 'assistant',
            content  : 'Queried AG Grid docs.',
            usage    : {inputTokens: 45, outputTokens: 15},
            toolCalls: [{serverName: 'ag-mcp', toolName: 'search_docs', input: {query: 'rowGrouping'}}]
        });
        const genericMessageTelemetry = parseTranscriptTelemetry(genericMessageLine, {
            arm: 'arm-a-react-ag-grid-mcp'
        });
        expect(genericMessageTelemetry.harness).toBe('generic');
        expect(genericMessageTelemetry.totalTokens).toEqual({
            inputTokens : 45,
            outputTokens: 15,
            cachedTokens: 0,
            total       : 60
        });
        expect(genericMessageTelemetry.toolCallsByServer.docsKbQueries).toBe(1);

        // RA-2c: Mixed two-message generic transcript where only the second message carries an explicit `totalTokens`
        // must preserve the first message's fallback `(inputTokens + outputTokens)` instead of dropping it (50 + 80 = 130; 50 + 110 = 160)
        const mixedGenericTranscript = [
            JSON.stringify({
                type     : 'message',
                timestamp: '2026-11-26T01:06:00.000Z',
                role     : 'assistant',
                content  : 'Turn 1 without explicit totalTokens.',
                usage    : {inputTokens: 30, outputTokens: 20}
            }),
            JSON.stringify({
                type     : 'message',
                timestamp: '2026-11-26T01:06:05.000Z',
                role     : 'assistant',
                content  : 'Turn 2 with explicit totalTokens.',
                usage    : {inputTokens: 50, outputTokens: 30, totalTokens: 80}
            })
        ].join('\n');
        expect(parseTranscriptTelemetry(mixedGenericTranscript, {arm: 'arm-a-react-ag-grid-mcp'}).totalTokens).toEqual({
            inputTokens : 80,
            outputTokens: 50,
            cachedTokens: 0,
            total       : 130
        });

        const mixedGenericWithReasoning = [
            JSON.stringify({
                type     : 'message',
                timestamp: '2026-11-26T01:07:00.000Z',
                role     : 'assistant',
                usage    : {inputTokens: 30, outputTokens: 20}
            }),
            JSON.stringify({
                type     : 'message',
                timestamp: '2026-11-26T01:07:05.000Z',
                role     : 'assistant',
                usage    : {inputTokens: 50, outputTokens: 30, cachedTokens: 10, totalTokens: 110}
            })
        ].join('\n');
        expect(parseTranscriptTelemetry(mixedGenericWithReasoning, {arm: 'arm-a-react-ag-grid-mcp'}).totalTokens).toEqual({
            inputTokens : 80,
            outputTokens: 50,
            cachedTokens: 10,
            total       : 160
        });

        // RA-1: Effective Gemini CLI v0.38.1 configuration isolation across Arms A, B, and C (both direct and `--sandbox` container inner CLI,
        // including stageRoot outside os.tmpdir(), poisoned host SANDBOX_ENV/SANDBOX_MOUNTS, poisoned container image system settings,
        // and file-based `admin.mcp.enabled: false` ignored per `settings.ts#L365-L388`)
        const poisonDir                  = path.join(ROOT_DIR, `.tmp-gemini-poison-${Date.now()}`),
              customStageParent          = path.join(ROOT_DIR, `.tmp-gemini-stage-${Date.now()}`),
              poisonHome                 = path.join(poisonDir, 'home'),
              poisonSysSettings          = path.join(poisonDir, 'system-settings.json'),
              poisonContainerSysSettings = path.join(poisonDir, 'container-etc-settings.json'),
              prevHome                   = process.env.HOME;

        await fs.ensureDir(path.join(poisonHome, '.gemini'));
        await fs.writeJson(path.join(poisonHome, '.gemini/oauth_creds.json'), {refresh_token: 'stub-oauth'}, {spaces: 2});
        await fs.writeJson(path.join(poisonHome, '.gemini/settings.json'), {
            admin     : {mcp: {enabled: false}},
            security  : {
                auth       : {selectedType: 'oauth-personal'},
                folderTrust: {enabled: true}
            },
            mcpServers: {
                'leaked-user-mcp': {command: 'node', args: ['leak-user.js']},
                'neural-link'    : {command: 'npx', args: ['-y', 'neo-neural-link'], env: {NEO_NL_PORT: '1111'}}
            }
        }, {spaces: 2});
        await fs.writeJson(poisonSysSettings, {
            admin     : {mcp: {enabled: false}},
            security  : {folderTrust: {enabled: true}},
            mcpServers: {
                'leaked-sys-mcp': {command: 'node', args: ['leak-sys.js']},
                'neural-link'   : {command: 'npx', args: ['-y', 'neo-neural-link'], env: {NEO_NL_PORT: '2222'}}
            }
        }, {spaces: 2});
        await fs.writeJson(poisonContainerSysSettings, {
            security  : {folderTrust: {enabled: true}},
            mcpServers: {
                'leaked-container-mcp': {command: 'node', args: ['leak-container.js']},
                'neural-link'         : {command: 'npx', args: ['-y', 'neo-neural-link'], env: {NEO_NL_PORT: '3333'}}
            }
        }, {spaces: 2});

        // Counterexample controls:
        // 1. File-based `admin.mcp.enabled: false` is ignored by Gemini CLI v0.38.1 (`mcpEnabled === true`), so without clean-room isolation system/user MCP servers leak
        const unisolatedArmC = await resolveEffectiveGeminiMcpConfig({
            armDir: path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-c-neo-kb-neural-link'),
            env   : {HOME: poisonHome, GEMINI_CLI_SYSTEM_SETTINGS_PATH: poisonSysSettings}
        });
        expect(unisolatedArmC.mcpEnabled).toBe(true);
        expect(unisolatedArmC.effectiveMcpServers['neural-link'].env.NEO_NL_PORT).toBe('2222');

        // 2. Inside `--sandbox`, if host `SANDBOX_ENV` / `SANDBOX_MOUNTS` passthrough is retained or staged paths are not forwarded, inner CLI sees poisoned system/port
        const unisolatedSandboxArmC = await resolveEffectiveGeminiMcpConfig({
            armDir                            : path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-c-neo-kb-neural-link'),
            env                               : {
                HOME          : poisonHome,
                SANDBOX_MOUNTS: `${poisonDir}:${poisonDir}:ro`,
                SANDBOX_ENV   : `GEMINI_CLI_SYSTEM_SETTINGS_PATH=${poisonSysSettings},NEO_NL_PORT=9999`
            },
            sandbox                           : true,
            containerDefaultSystemSettingsPath: poisonContainerSysSettings
        });
        expect(unisolatedSandboxArmC.effectiveMcpServers['neural-link'].env.NEO_NL_PORT).toBe('2222');
        expect(unisolatedSandboxArmC.effectiveEnv.NEO_NL_PORT).toBe('9999');

        process.env.HOME = poisonHome;
        let isoA = null, isoB = null, isoC = null;
        try {
            const isoNlPort = await allocateFreePort(0);
            isoA = await stageArmWorkspace({arm: 'arm-a-react-ag-grid-mcp', stageRoot: path.join(customStageParent, 'a'), installDeps: false, harness: 'gemini', stageAuth: true});
            isoB = await stageArmWorkspace({arm: 'arm-b-neo-kb-only', stageRoot: path.join(customStageParent, 'b'), installDeps: false, harness: 'gemini', stageAuth: true});
            isoC = await stageArmWorkspace({arm: 'arm-c-neo-kb-neural-link', stageRoot: path.join(customStageParent, 'c'), nlPort: isoNlPort, installDeps: false, harness: 'gemini', stageAuth: true});

            const poisonedBaseEnv = {
                ...process.env,
                HOME                           : poisonHome,
                GEMINI_CLI_SYSTEM_SETTINGS_PATH: poisonSysSettings,
                SANDBOX_MOUNTS                 : `${poisonDir}:${poisonDir}:ro`,
                SANDBOX_ENV                    : `GEMINI_CLI_HOME=${poisonHome},GEMINI_CLI_SYSTEM_SETTINGS_PATH=${poisonSysSettings},NEO_NL_PORT=9999`
            };

            for (const [sandboxMode, useCurrentUser] of [[false, false], [true, false], [true, true]]) {
                const effA = await resolveEffectiveGeminiMcpConfig({
                    armDir                            : isoA.armDir,
                    env                               : buildCleanRoomChildEnv(isoA, poisonedBaseEnv),
                    cliArgs                           : buildAgentSpawnSpec({arm: 'arm-a-react-ag-grid-mcp', harness: 'gemini', sandbox: sandboxMode, prompt: 'p'}).spawnArgs,
                    defaultSystemSettingsPath         : poisonSysSettings,
                    sandbox                           : sandboxMode,
                    useCurrentUser,
                    containerDefaultSystemSettingsPath: poisonContainerSysSettings
                });
                expect(effA.mcpEnabled).toBe(true);
                expect(Object.keys(effA.effectiveMcpServers)).toEqual(['ag-mcp']);
                expect(effA.mergedSettings.security?.auth?.selectedType).toBe('oauth-personal');
                expect(await fs.pathExists(path.join(isoA.geminiHomeDir, '.gemini/oauth_creds.json'))).toBe(true);

                const effB = await resolveEffectiveGeminiMcpConfig({
                    armDir                            : isoB.armDir,
                    env                               : buildCleanRoomChildEnv(isoB, poisonedBaseEnv),
                    cliArgs                           : buildAgentSpawnSpec({arm: 'arm-b-neo-kb-only', harness: 'gemini', sandbox: sandboxMode, prompt: 'p'}).spawnArgs,
                    defaultSystemSettingsPath         : poisonSysSettings,
                    sandbox                           : sandboxMode,
                    useCurrentUser,
                    containerDefaultSystemSettingsPath: poisonContainerSysSettings
                });
                expect(effB.mcpEnabled).toBe(true);
                expect(Object.keys(effB.effectiveMcpServers)).toEqual([]);

                const effC = await resolveEffectiveGeminiMcpConfig({
                    armDir                            : isoC.armDir,
                    env                               : buildCleanRoomChildEnv(isoC, poisonedBaseEnv),
                    cliArgs                           : buildAgentSpawnSpec({arm: 'arm-c-neo-kb-neural-link', harness: 'gemini', sandbox: sandboxMode, prompt: 'p'}).spawnArgs,
                    defaultSystemSettingsPath         : poisonSysSettings,
                    sandbox                           : sandboxMode,
                    useCurrentUser,
                    containerDefaultSystemSettingsPath: poisonContainerSysSettings
                });
                expect(effC.mcpEnabled).toBe(true);
                expect(Object.keys(effC.effectiveMcpServers)).toEqual(['neural-link']);
                expect(effC.effectiveMcpServers['neural-link'].env.NEO_NL_PORT).toBe(String(isoNlPort));
                expect(effC.effectiveEnv.NEO_NL_PORT).toBe(String(isoNlPort));
                expect(effC.effectiveEnv.PORT).toBe(String(isoC.appPort));
            }
        } finally {
            process.env.HOME = prevHome;
            if (isoA) await fs.remove(isoA.stageRoot);
            if (isoB) await fs.remove(isoB.stageRoot);
            if (isoC) await fs.remove(isoC.stageRoot);
            await fs.remove(customStageParent);
            await fs.remove(poisonDir);
        }

        // RA-3: Programmatic and CLI launches share model default resolution (Claude -> 'sonnet', Gemini/Codex -> omit `-m` unless supplied)
        const claudeDefaultSpec = buildAgentSpawnSpec({arm: 'arm-b-neo-kb-only', prompt: 'p'}),
              geminiDefaultSpec = buildAgentSpawnSpec({arm: 'arm-c-neo-kb-neural-link', harness: 'gemini', prompt: 'p'}),
              codexDefaultSpec  = buildAgentSpawnSpec({arm: 'arm-c-neo-kb-neural-link', harness: 'codex', prompt: 'p'});

        expect(claudeDefaultSpec.spawnArgs).toContain('--model');
        expect(claudeDefaultSpec.spawnArgs).toContain('sonnet');
        expect(geminiDefaultSpec.spawnArgs).not.toContain('-m');
        expect(codexDefaultSpec.spawnArgs).not.toContain('-m');

        // End-to-end production spawn checks for programmatic `runCleanRoomArm` AND CLI `--run-arm` with omitted vs explicit model
        const fakeBinDir  = path.join(os.tmpdir(), `neo-gemini-shim-${Date.now()}`),
              tempOutDir  = path.join(os.tmpdir(), `neo-gemini-out-${Date.now()}`),
              tempCliOut  = path.join(os.tmpdir(), `neo-gemini-cli-out-${Date.now()}`),
              shimPath    = path.join(fakeBinDir, 'gemini'),
              appPort     = await allocateFreePort(0),
              nlPort      = await allocateFreePort(0),
              cliAppPort  = await allocateFreePort(0),
              prevPath    = process.env.PATH;

        await fs.ensureDir(fakeBinDir);
        const shimScript = [
            '#!/usr/bin/env node',
            'const fs = require("node:fs");',
            'const args = process.argv.slice(2);',
            'if (args.includes("--version")) { console.log("0.38.1"); process.exit(0); }',
            'if (!process.env.GEMINI_CLI_HOME || !process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH || !process.env.GEMINI_CLI_TRUSTED_FOLDERS_PATH) process.exit(6);',
            'if (!args.includes("--output-format") || !args.includes("stream-json")) process.exit(3);',
            'if (!args.includes("--approval-mode") || !args.includes("yolo")) process.exit(4);',
            'if (process.env.NEO_NL_PORT) {',
            '    const settings = JSON.parse(fs.readFileSync(".gemini/settings.json", "utf8"));',
            '    if (settings.mcpServers["neural-link"].env.NEO_NL_PORT !== process.env.NEO_NL_PORT) process.exit(2);',
            '    if (!process.env.SANDBOX_ENV || !process.env.SANDBOX_ENV.includes("NEO_NL_PORT=" + process.env.NEO_NL_PORT) || !process.env.SANDBOX_MOUNTS) process.exit(11);',
            '    if (!args.includes("--sandbox") || !args.includes("--allowed-mcp-server-names") || !args.includes("neural-link")) process.exit(5);',
            '    if (args.includes("-m")) process.exit(7);',
            '    const t0 = new Date().toISOString();',
            '    console.log(JSON.stringify({type: "init", timestamp: t0, session_id: "shim-1", model: "gemini-3.1-pro-preview"}));',
            '    console.log(JSON.stringify({type: "tool_use", timestamp: t0, tool_name: "neural-link_inspect_store", tool_id: "c1", parameters: {}}));',
            '    fs.mkdirSync("../../results", {recursive: true});',
            '    fs.appendFileSync("../../results/arm-c-neo-kb-neural-link-verify-runs.jsonl", JSON.stringify({type: "benchmark_verification", timestamp: new Date(Date.now() + 25).toISOString(), arm: "arm-c-neo-kb-neural-link", pass: true, durationMs: 15}) + "\\n");',
            '    console.log(JSON.stringify({type: "result", timestamp: new Date(Date.now() + 30).toISOString(), status: "success", stats: {total_tokens: 5200, input_tokens: 5000, output_tokens: 200, cached: 4000, input: 1000, duration_ms: 30, tool_calls: 1, models: {"gemini-3.1-pro-preview": {total_tokens: 5200, input_tokens: 5000, output_tokens: 200, cached: 4000, input: 1000}}}}));',
            '} else {',
            '    const sysSettings = JSON.parse(fs.readFileSync(process.env.GEMINI_CLI_SYSTEM_SETTINGS_PATH, "utf8"));',
            '    if (Object.keys(sysSettings.mcpServers || {}).length !== 0 || !process.env.SANDBOX_ENV || !process.env.SANDBOX_MOUNTS) process.exit(8);',
            '    if (!args.includes("--allowed-mcp-server-names") || !args.includes("__none__")) process.exit(9);',
            '    if (args.includes("-m")) process.exit(10);',
            '    const t0 = new Date().toISOString();',
            '    console.log(JSON.stringify({type: "init", timestamp: t0, session_id: "shim-cli", model: "gemini-2.5-pro"}));',
            '    console.log(JSON.stringify({type: "result", timestamp: new Date(Date.now() + 10).toISOString(), status: "success", stats: {total_tokens: 250, input_tokens: 100, output_tokens: 20, cached: 60, input: 40, duration_ms: 10, tool_calls: 0, models: {"gemini-2.5-pro": {total_tokens: 250, input_tokens: 100, output_tokens: 20, cached: 60, input: 40}}}}));',
            '}'
        ].join('\n');
        await fs.writeFile(shimPath, shimScript, {mode: 0o755});
        process.env.PATH = `${fakeBinDir}:${prevPath}`;

        try {
            // 1. Programmatic `runCleanRoomArm` omitting `model` -> must NOT pass `-m`
            const liveRes = await runCleanRoomArm({
                arm        : 'arm-c-neo-kb-neural-link',
                harness    : 'gemini',
                sandbox    : true,
                outDir     : tempOutDir,
                appPort,
                nlPort,
                installDeps: false
            });

            expect(liveRes.telemetry.pass).toBe(true);
            expect(liveRes.telemetry.harness).toBe('gemini');
            expect(liveRes.telemetry.model).toBe('gemini-3.1-pro-preview');
            expect(liveRes.telemetry.versions).toEqual({
                harnessVersion  : '0.38.1',
                frameworkVersion: 'neo.mjs@14.0.0'
            });
            expect(liveRes.telemetry.totalTokens).toEqual({
                inputTokens : 1000,
                outputTokens: 200,
                cachedTokens: 4000,
                total       : 5200
            });
            expect(liveRes.telemetry.toolCallsByServer.neuralLinkRuntimeCalls).toBe(1);
            expect(liveRes.telemetry.sessionDurationMs).toBe(30);

            // 2. CLI `--run-arm` omitting `--model` -> must ALSO omit `-m` and enforce Arm B zero-MCP isolation
            execFileSync(
                process.execPath,
                [
                    path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                    '--run-arm', 'arm-b-neo-kb-only',
                    '--harness', 'gemini',
                    '--no-install',
                    '--app-port', String(cliAppPort),
                    '--out-dir', tempCliOut
                ],
                {cwd: ROOT_DIR, env: process.env, encoding: 'utf8'}
            );
            const reportFiles = (await fs.readdir(tempCliOut)).filter(f => f.startsWith('agent-benchmark-') && f.endsWith('.json'));
            expect(reportFiles).toHaveLength(1);
            const cliReport = await fs.readJson(path.join(tempCliOut, reportFiles[0]));
            expect(cliReport.arms[0].model).toBe('gemini-2.5-pro');
            expect(cliReport.arms[0].totalTokens).toEqual({
                inputTokens : 40,
                outputTokens: 20,
                cachedTokens: 60,
                total       : 250
            });
        } finally {
            process.env.PATH = prevPath;
            await fs.remove(fakeBinDir);
            await fs.remove(tempOutDir);
            await fs.remove(tempCliOut);
        }
    });

    test('Codex clean-room staging isolates CODEX_HOME, gates MCP discovery before model attempts, and separates redacted launch failures from failed tasks (#17)', async () => {
        expect(expectedArmMcpServers('arm-a-react-ag-grid-mcp')).toEqual(['ag-mcp']);
        expect(expectedArmMcpServers('arm-b-neo-kb-only')).toEqual([]);
        expect(expectedArmMcpServers('arm-c-neo-kb-neural-link')).toEqual(['neural-link']);
        expect(expectedArmMcpDescriptors('arm-a-react-ag-grid-mcp')).toEqual({
            'ag-mcp': {type: 'stdio', command: 'npx', args: ['-y', 'ag-mcp'], env: {}}
        });
        expect(expectedArmMcpDescriptors('arm-b-neo-kb-only')).toEqual({});
        expect(expectedArmMcpDescriptors('arm-c-neo-kb-neural-link', {nlPort: 18081})).toEqual({
            'neural-link': {type: 'stdio', command: 'npx', args: ['-y', 'neo-neural-link'], env: {NEO_NL_PORT: '18081'}}
        });

        // 1. Credential redaction covers env assignments, Bearer/Basic headers, JSON keys, URL basic auth, API token prefixes, and recursive JSONL objects
        const rawSecretDiag = [
            'OPENAI_API_KEY=sk-proj-supersecret1234567890',
            'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2',
            '{"access_token":"ya29.a0AfH6SMBxSecretTokenValue","api_key":"AIzaSyD-SecretKeyValue12345"}',
            'https://bench:hunter2secret@api.example.com/v1/responses'
        ].join(' | ');
        const scrubbedDiag = redactCredentials(rawSecretDiag);
        expect(scrubbedDiag).not.toContain('sk-proj-supersecret');
        expect(scrubbedDiag).not.toContain('eyJhbGciOiJIUzI1NiJ9');
        expect(scrubbedDiag).not.toContain('ya29.a0AfH6SMBxSecretTokenValue');
        expect(scrubbedDiag).not.toContain('AIzaSyD-SecretKeyValue12345');
        expect(scrubbedDiag).not.toContain('hunter2secret');
        expect(scrubbedDiag).toContain('[REDACTED]');

        const scrubbedObj = redactDiagnosticValue({
            type : 'turn.failed',
            error: {message: 'Bearer sk-live-leaked-secret-99999999', api_key: 'raw-custom-secret'}
        });
        expect(JSON.stringify(scrubbedObj)).not.toContain('sk-live-leaked-secret');
        expect(JSON.stringify(scrubbedObj)).not.toContain('raw-custom-secret');

        // 2. Agent-event classification distinguishes bootstrap & auth errors from started OR completed agent work (`RA-4`)
        expect(isAgentTranscriptEvent({type: 'thread.started', thread_id: 't1'})).toBe(false);
        expect(isAgentTranscriptEvent({type: 'turn.started'})).toBe(false);
        expect(isAgentTranscriptEvent({type: 'error', message: '401 Unauthorized'})).toBe(false);
        expect(isAgentTranscriptEvent({type: 'item.started', item: {id: 'i0', type: 'error', message: 'auth error'}})).toBe(false);
        expect(isAgentTranscriptEvent({type: 'item.completed', item: {id: 'i0', type: 'error', message: 'fallback failed'}})).toBe(false);
        expect(isAgentTranscriptEvent({type: 'turn.failed', error: {message: '401 Unauthorized'}})).toBe(false);
        expect(isAgentTranscriptEvent({type: 'item.started', item: {id: 'i1', type: 'command_execution', command: 'npm run dev'}})).toBe(true);
        expect(isAgentTranscriptEvent({type: 'item.started', item: {id: 'i2', type: 'mcp_tool_call', server: 'ag-mcp', tool: 'search_docs'}})).toBe(true);
        expect(isAgentTranscriptEvent({type: 'item.completed', item: {id: 'i2', type: 'mcp_tool_call', server: 'ag-mcp', tool: 'search_docs'}})).toBe(true);
        expect(isAgentTranscriptEvent({type: 'turn.completed', usage: {input_tokens: 100, output_tokens: 20}})).toBe(true);

        // 3. Outer host profile control (`~/.codex/{config.toml,auth.json}` + `~/.gemini/oauth_creds.json`) + TOML-realistic Codex shim
        const tempRoot       = path.join(os.tmpdir(), `neo-codex-17-${Date.now()}`),
              hostHome       = path.join(tempRoot, 'host-home'),
              hostCodexDir   = path.join(hostHome, '.codex'),
              hostGeminiDir  = path.join(hostHome, '.gemini'),
              etcCodexConfig = path.join(tempRoot, 'etc-codex-config.toml'),
              execLogPath    = path.join(tempRoot, 'codex-exec-invocations.jsonl'),
              shimDir        = path.join(tempRoot, 'bin'),
              codexShimPath  = path.join(shimDir, 'codex'),
              claudeShimPath = path.join(shimDir, 'claude'),
              geminiShimPath = path.join(shimDir, 'gemini'),
              outDirOk       = path.join(tempRoot, 'out-ok'),
              outDirMismatch = path.join(tempRoot, 'out-mismatch'),
              outDirLaunch   = path.join(tempRoot, 'out-launch'),
              outDirSeeded   = path.join(tempRoot, 'out-seeded'),
              keepStageDir   = path.join(tempRoot, 'kept-stage');

        await fs.ensureDir(hostCodexDir);
        await fs.ensureDir(hostGeminiDir);
        await fs.ensureDir(shimDir);

        const hostConfigContent     = '[mcp_servers.unrelated-host-mcp]\ncommand = "node"\nargs    = ["host-leak.js"]\n',
              hostAuthContent       = JSON.stringify({auth_mode: 'apikey', OPENAI_API_KEY: 'sk-test-host-preserved-only'}, null, 2),
              hostGeminiCredContent = JSON.stringify({refresh_token: 'ya29.syntheticGeminiRefreshSecret12345'}, null, 2);
        await fs.writeFile(path.join(hostCodexDir, 'config.toml'), hostConfigContent, 'utf8');
        await fs.writeFile(path.join(hostCodexDir, 'auth.json'), hostAuthContent, {mode: 0o600});
        await fs.writeFile(path.join(hostGeminiDir, 'oauth_creds.json'), hostGeminiCredContent, {mode: 0o600});
        await fs.writeFile(etcCodexConfig, '', 'utf8');

        const codexShimSource = [
            '#!/usr/bin/env node',
            'const fs = require("node:fs");',
            'const os = require("node:os");',
            'const path = require("node:path");',
            'const args = process.argv.slice(2);',
            'if (args.includes("--version")) { console.log("codex-cli 0.171.0-shim"); process.exit(0); }',
            'function parseCodexToml(filePath) {',
            '    const out = {servers: {}, trusted: new Set()};',
            '    if (!filePath || !fs.existsSync(filePath)) return out;',
            '    const lines = fs.readFileSync(filePath, "utf8").split(/\\r?\\n/);',
            '    let section = null;',
            '    for (const raw of lines) {',
            '        const line = raw.trim();',
            '        if (!line || line.startsWith("#")) continue;',
            '        const m = line.match(/^\\[(.+)\\]$/);',
            '        if (m) { section = m[1].trim(); continue; }',
            '        const kv = line.match(/^([A-Za-z0-9_-]+)\\s*=\\s*(.+)$/);',
            '        if (!kv || !section) continue;',
            '        const [, k, vRaw] = kv;',
            '        let val = vRaw.trim();',
            '        try { val = JSON.parse(val); } catch {}',
            '        const projMatch = section.match(/^projects\\.(".*"|[^.]+)$/);',
            '        if (projMatch && k === "trust_level" && val === "trusted") {',
            '            let p = projMatch[1];',
            '            try { p = JSON.parse(p); } catch {}',
            '            out.trusted.add(p);',
            '        }',
            '        const envMatch = section.match(/^mcp_servers\\.([A-Za-z0-9_-]+)\\.env$/);',
            '        if (envMatch) {',
            '            const name = envMatch[1];',
            '            out.servers[name] = out.servers[name] || {command: null, args: [], env: null};',
            '            out.servers[name].env = out.servers[name].env || {};',
            '            out.servers[name].env[k] = String(val);',
            '            continue;',
            '        }',
            '        const srvMatch = section.match(/^mcp_servers\\.([A-Za-z0-9_-]+)$/);',
            '        if (srvMatch) {',
            '            const name = srvMatch[1];',
            '            out.servers[name] = out.servers[name] || {command: null, args: [], env: null};',
            '            if (k === "command") out.servers[name].command = val;',
            '            if (k === "args" && Array.isArray(val)) out.servers[name].args = val;',
            '        }',
            '    }',
            '    return out;',
            '}',
            'const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME || os.homedir(), ".codex");',
            'const sysCfg = parseCodexToml(process.env.TEST_CODEX_ETC_CONFIG || "");',
            'const userCfg = parseCodexToml(path.join(codexHome, "config.toml"));',
            'const cwd = process.cwd();',
            'const realCwd = fs.realpathSync(cwd);',
            'const isTrusted = userCfg.trusted.has(cwd) || userCfg.trusted.has(realCwd);',
            'const projCfg = isTrusted ? parseCodexToml(path.join(cwd, ".codex/config.toml")) : {servers: {}};',
            'if (args[0] === "mcp" && args[1] === "list" && args.includes("--json")) {',
            '    if (process.env.TEST_ASSERT_NO_AUTH_ON_PREFLIGHT === "1" && fs.existsSync(path.join(codexHome, "auth.json"))) {',
            '        console.error("LEAKED_AUTH_DURING_PREFLIGHT"); process.exit(9);',
            '    }',
            '    const merged = {...sysCfg.servers, ...userCfg.servers, ...projCfg.servers};',
            '    const list = Object.entries(merged).map(([name, cfg]) => ({',
            '        name,',
            '        enabled: true,',
            '        disabled_reason: null,',
            '        transport: {type: "stdio", command: cfg.command, args: cfg.args || [], env: cfg.env, env_vars: [], cwd: null},',
            '        startup_timeout_sec: null,',
            '        tool_timeout_sec: null,',
            '        auth_status: "unsupported"',
            '    }));',
            '    console.log(JSON.stringify(list, null, 2));',
            '    process.exit(0);',
            '}',
            'if (args[0] === "exec") {',
            '    const sawCodexAuth = fs.existsSync(path.join(codexHome, "auth.json"));',
            '    const sawGeminiAuth = process.env.GEMINI_CLI_HOME && fs.existsSync(path.join(process.env.GEMINI_CLI_HOME, ".gemini/oauth_creds.json"));',
            '    if (process.env.TEST_CODEX_EXEC_LOG) {',
            '        fs.appendFileSync(process.env.TEST_CODEX_EXEC_LOG, JSON.stringify({cwd, args, sawCodexAuth, sawGeminiAuth: Boolean(sawGeminiAuth)}) + "\\n");',
            '    }',
            '    if (process.env.TEST_CODEX_MODE === "auth-fail") {',
            '        console.log(JSON.stringify({type: "thread.started", thread_id: "t-auth-fail"}));',
            '        console.log(JSON.stringify({type: "turn.started"}));',
            '        console.log(JSON.stringify({type: "item.completed", item: {id: "item_0", type: "error", message: "401 Unauthorized: Bearer sk-live-leaked-secret-99999999"}}));',
            '        console.log(JSON.stringify({type: "turn.failed", error: {message: "401 Unauthorized with OPENAI_API_KEY=sk-live-leaked-secret-99999999"}}));',
            '        console.error("ERROR codex_api: header Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJlMTIz");',
            '        process.exit(1);',
            '    }',
            '    if (process.env.TEST_CODEX_MODE === "interrupted-cmd") {',
            '        const t0 = new Date().toISOString();',
            '        console.log(JSON.stringify({type: "thread.started", thread_id: "t-int-cmd"}));',
            '        console.log(JSON.stringify({type: "turn.started"}));',
            '        console.log(JSON.stringify({type: "item.started", timestamp: t0, item: {id: "item_cmd_1", type: "command_execution", command: "npm run dev"}}));',
            '        process.exit(1);',
            '    }',
            '    if (process.env.TEST_CODEX_MODE === "interrupted-mcp") {',
            '        const t0 = new Date().toISOString();',
            '        console.log(JSON.stringify({type: "thread.started", thread_id: "t-int-mcp"}));',
            '        console.log(JSON.stringify({type: "turn.started"}));',
            '        console.log(JSON.stringify({type: "item.started", timestamp: t0, item: {id: "item_mcp_1", type: "mcp_tool_call", server: "ag-mcp", tool: "search_docs", arguments: {query: "virtual"}}}));',
            '        process.exit(1);',
            '    }',
            '    if (process.env.TEST_CODEX_MODE === "task-fail") {',
            '        const t0 = new Date().toISOString();',
            '        console.log(JSON.stringify({type: "session_meta", timestamp: t0, cli_version: "0.171.0-shim", model: "gpt-5.4"}));',
            '        console.log(JSON.stringify({type: "item.started", timestamp: t0, item: {id: "item_1", type: "command_execution", command: "npm run dev"}}));',
            '        console.log(JSON.stringify({type: "item.completed", timestamp: t0, item: {id: "item_1", type: "command_execution", command: "npm run dev"}}));',
            '        console.log(JSON.stringify({type: "turn.completed", timestamp: t0, usage: {input_tokens: 300, output_tokens: 50, cached_input_tokens: 0}}));',
            '        process.exit(0);',
            '    }',
            '    const t0 = new Date().toISOString();',
            '    console.log(JSON.stringify({type: "session_meta", timestamp: t0, cli_version: "0.171.0-shim", model: "gpt-5.4"}));',
            '    console.log(JSON.stringify({type: "turn.completed", timestamp: t0, usage: {input_tokens: 120, output_tokens: 30, cached_input_tokens: 0}}));',
            '    process.exit(0);',
            '}',
            'process.exit(2);'
        ].join('\n');
        await fs.writeFile(codexShimPath, codexShimSource, {mode: 0o755});

        // Claude & Gemini shims asserting cross-harness credential isolation (`RA-2`)
        await fs.writeFile(claudeShimPath, [
            '#!/usr/bin/env node',
            'const fs = require("node:fs");',
            'const path = require("node:path");',
            'if (process.argv.includes("--version")) { console.log("2.1.120"); process.exit(0); }',
            'if (process.env.CODEX_HOME && fs.existsSync(path.join(process.env.CODEX_HOME, "auth.json"))) process.exit(21);',
            'if (process.env.GEMINI_CLI_HOME && fs.existsSync(path.join(process.env.GEMINI_CLI_HOME, ".gemini/oauth_creds.json"))) process.exit(22);',
            'console.log(JSON.stringify({type: "assistant", timestamp: new Date().toISOString(), message: {id: "mc1", model: "claude-sonnet-4-6", usage: {input_tokens: 50, output_tokens: 10}, content: [{type: "text", text: "ok"}]}}));'
        ].join('\n'), {mode: 0o755});
        await fs.writeFile(geminiShimPath, [
            '#!/usr/bin/env node',
            'const fs = require("node:fs");',
            'const path = require("node:path");',
            'if (process.argv.includes("--version")) { console.log("0.38.1"); process.exit(0); }',
            'if (process.env.CODEX_HOME && fs.existsSync(path.join(process.env.CODEX_HOME, "auth.json"))) process.exit(31);',
            'if (!process.env.GEMINI_CLI_HOME || !fs.existsSync(path.join(process.env.GEMINI_CLI_HOME, ".gemini/oauth_creds.json"))) process.exit(32);',
            'const t0 = new Date().toISOString();',
            'console.log(JSON.stringify({type: "init", timestamp: t0, model: "gemini-3.1-pro-preview"}));',
            'console.log(JSON.stringify({type: "result", timestamp: t0, status: "success", stats: {total_tokens: 60, input_tokens: 50, output_tokens: 10, cached: 0, input: 50, duration_ms: 5}}));'
        ].join('\n'), {mode: 0o755});

        let stagedA = null, stagedB = null, stagedC = null;
        try {
            const baseEnv = {
                ...process.env,
                HOME                    : hostHome,
                PATH                    : `${shimDir}:${process.env.PATH}`,
                TEST_CODEX_ETC_CONFIG   : etcCodexConfig,
                TEST_CODEX_EXEC_LOG     : execLogPath
            };

            const nlPortC = await allocateFreePort(0);
            // Default `stageArmWorkspace` (`stageAuth: false`) is 100% credential-free (`RA-2`)
            stagedA = await stageArmWorkspace({arm: 'arm-a-react-ag-grid-mcp', installDeps: false, baseEnv});
            stagedB = await stageArmWorkspace({arm: 'arm-b-neo-kb-only', installDeps: false, baseEnv});
            stagedC = await stageArmWorkspace({arm: 'arm-c-neo-kb-neural-link', nlPort: nlPortC, installDeps: false, baseEnv});

            expect(await fs.pathExists(path.join(stagedA.codexHomeDir, 'auth.json'))).toBe(false);
            expect(await fs.pathExists(path.join(stagedC.codexHomeDir, 'auth.json'))).toBe(false);
            expect(await fs.pathExists(path.join(stagedC.geminiHomeDir, '.gemini/oauth_creds.json'))).toBe(false);

            // Negative control (unisolated): without `buildCleanRoomChildEnv` (`CODEX_HOME` unset), untrusted staged C drops `neural-link` AND leaks `unrelated-host-mcp`
            await expect(verifyCodexMcpPreflight({
                arm     : 'arm-c-neo-kb-neural-link',
                armDir  : stagedC.armDir,
                nlPort  : nlPortC,
                env     : {PATH: process.env.PATH, HOME: hostHome, TEST_CODEX_ETC_CONFIG: etcCodexConfig},
                codexBin: codexShimPath
            })).rejects.toThrow(/Codex MCP preflight mismatch for arm-c-neo-kb-neural-link: expected \[neural-link\], observed \[unrelated-host-mcp\]/);

            // Positive AC-1 check: staged clean-room env resolves exact `['ag-mcp']`, `[]`, and `['neural-link']` (retaining `NEO_NL_PORT`)
            // WITHOUT copying `auth.json` during discovery (`TEST_ASSERT_NO_AUTH_ON_PREFLIGHT=1`)
            const preA = await verifyCodexMcpPreflight({
                arm     : 'arm-a-react-ag-grid-mcp',
                armDir  : stagedA.armDir,
                env     : {...buildCleanRoomChildEnv(stagedA, baseEnv), TEST_ASSERT_NO_AUTH_ON_PREFLIGHT: '1'},
                codexBin: codexShimPath
            });
            const preB = await verifyCodexMcpPreflight({
                arm     : 'arm-b-neo-kb-only',
                armDir  : stagedB.armDir,
                env     : {...buildCleanRoomChildEnv(stagedB, baseEnv), TEST_ASSERT_NO_AUTH_ON_PREFLIGHT: '1'},
                codexBin: codexShimPath
            });
            const preC = await verifyCodexMcpPreflight({
                arm     : 'arm-c-neo-kb-neural-link',
                armDir  : stagedC.armDir,
                nlPort  : nlPortC,
                env     : {...buildCleanRoomChildEnv(stagedC, baseEnv), TEST_ASSERT_NO_AUTH_ON_PREFLIGHT: '1'},
                codexBin: codexShimPath
            });

            expect(preA.observed).toEqual(['ag-mcp']);
            expect(preB.observed).toEqual([]);
            expect(preC.observed).toEqual(['neural-link']);
            expect(preC.nlPort).toBe(String(nlPortC));

            // AC-1 CLI entry point (`--preflight-codex --no-install --keep-stage`) stays credential-free even when kept (`RA-2`)
            await fs.ensureDir(keepStageDir);
            const cliPreflightRaw = execFileSync(
                process.execPath,
                [
                    path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                    '--preflight-codex',
                    '--no-install',
                    '--codex-bin', codexShimPath
                ],
                {cwd: ROOT_DIR, env: {...baseEnv, TEST_ASSERT_NO_AUTH_ON_PREFLIGHT: '1'}, encoding: 'utf8'}
            );
            const cliPreflight = JSON.parse(cliPreflightRaw);
            expect(cliPreflight.ok).toBe(true);
            expect(cliPreflight.arms.map(a => [a.arm, a.observed])).toEqual([
                ['arm-a-react-ag-grid-mcp', ['ag-mcp']],
                ['arm-b-neo-kb-only', []],
                ['arm-c-neo-kb-neural-link', ['neural-link']]
            ]);
            expect(cliPreflight.arms[2].nlPort).toBeTruthy();
            expect(await fs.pathExists(execLogPath)).toBe(false);

            // RA-2: Cross-harness auth isolation (`claude-code` gets neither; `gemini` gets only Gemini creds; `codex` gets only Codex `auth.json` after preflight, and `keepStage: true` cleans credentials on exit)
            const claudeRes = await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                harness    : 'claude-code',
                outDir     : outDirOk,
                installDeps: false,
                baseEnv
            });
            expect(claudeRes.telemetry.runOutcome).toBe('task_failed');

            const geminiRes = await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                harness    : 'gemini',
                outDir     : outDirOk,
                installDeps: false,
                baseEnv
            });
            expect(geminiRes.telemetry.runOutcome).toBe('task_failed');

            const codexKeptStageBefore = new Set(await fs.readdir(os.tmpdir()));
            await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                harness    : 'codex',
                codexBin   : codexShimPath,
                outDir     : outDirOk,
                keepStage  : true,
                installDeps: false,
                baseEnv    : {...baseEnv, TEST_ASSERT_NO_AUTH_ON_PREFLIGHT: '1'}
            });
            const codexExecEntries = (await fs.readFile(execLogPath, 'utf8')).trim().split('\n').map(l => JSON.parse(l));
            expect(codexExecEntries).toHaveLength(1);
            expect(codexExecEntries[0].sawCodexAuth).toBe(true);
            expect(codexExecEntries[0].sawGeminiAuth).toBe(false);

            const newKeptDirs = (await fs.readdir(os.tmpdir())).filter(
                name => name.startsWith('neo-agent-bench-arm-b-neo-kb-only-') && !codexKeptStageBefore.has(name)
            );
            expect(newKeptDirs).toHaveLength(1);
            const retainedStagePath = path.join(os.tmpdir(), newKeptDirs[0]);
            expect(await fs.pathExists(path.join(retainedStagePath, '.codex-isolation/codex-home/config.toml'))).toBe(true);
            expect(await fs.pathExists(path.join(retainedStagePath, '.codex-isolation/codex-home/auth.json'))).toBe(false);
            expect(await fs.pathExists(path.join(retainedStagePath, '.gemini-isolation/home/.gemini/oauth_creds.json'))).toBe(false);
            await fs.remove(retainedStagePath);
            await fs.remove(execLogPath);

            // RA-3a: Unverified `--cmd` overrides are rejected on `--harness codex` and excluded from comparable Codex results
            await expect(runCleanRoomArm({
                arm        : 'arm-a-react-ag-grid-mcp',
                harness    : 'codex',
                cmd        : 'echo "{}"',
                outDir     : outDirMismatch,
                installDeps: false,
                baseEnv
            })).rejects.toThrow(/Unverified --cmd override cannot produce a comparable Codex benchmark result/);

            const outDirCustomCmd      = path.join(tempRoot, 'out-custom-cmd'),
                  outDirCustomReplay   = path.join(tempRoot, 'out-custom-replay'),
                  outDirCustomReplayB  = path.join(tempRoot, 'out-custom-replay-arm-flag'),
                  outDirRealReplay     = path.join(tempRoot, 'out-real-replay');

            execFileSync(
                process.execPath,
                [
                    path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                    '--run-arm', 'arm-b-neo-kb-only',
                    '--no-install',
                    '--out-dir', outDirCustomCmd,
                    '--cmd', 'printf \'%s\\n\' \'{"type":"session_meta","cli_version":"0.171.0","model":"gpt-5.4"}\' \'{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}\''
                ],
                {cwd: ROOT_DIR, env: baseEnv, encoding: 'utf8'}
            );

            const customLiveReports = (await fs.readdir(outDirCustomCmd)).filter(f => f.startsWith('agent-benchmark-') && f.endsWith('.json'));
            expect(customLiveReports).toHaveLength(1);
            expect((await fs.readJson(path.join(outDirCustomCmd, customLiveReports[0]))).arms).toEqual([]);

            const savedCustomTranscriptPath = path.join(outDirCustomCmd, 'arm-b-neo-kb-only-transcript.jsonl'),
                  replayedCustomTelemetry   = parseTranscriptTelemetry(
                      await fs.readFile(savedCustomTranscriptPath, 'utf8'),
                      {arm: 'arm-b-neo-kb-only', harness: 'codex'}
                  );
            expect(replayedCustomTelemetry.harness).toBe('custom-cmd');
            expect(replayedCustomTelemetry.comparable).toBe(false);
            expect(buildComparisonReport([replayedCustomTelemetry]).arms).toEqual([]);

            // Replay without `--harness` (`--from-transcript`) AND with `--harness codex` (`--arm-b-transcript`) both preserve `comparable: false` (0 rows)
            execFileSync(
                process.execPath,
                [
                    path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                    '--from-transcript', `arm-b-neo-kb-only=${savedCustomTranscriptPath}`,
                    '--out-dir', outDirCustomReplay
                ],
                {cwd: ROOT_DIR, env: baseEnv, encoding: 'utf8'}
            );
            const customReplayReports = (await fs.readdir(outDirCustomReplay)).filter(f => f.startsWith('agent-benchmark-') && f.endsWith('.json'));
            expect(customReplayReports).toHaveLength(1);
            expect((await fs.readJson(path.join(outDirCustomReplay, customReplayReports[0]))).arms).toEqual([]);

            execFileSync(
                process.execPath,
                [
                    path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                    '--arm-b-transcript', savedCustomTranscriptPath,
                    '--harness', 'codex',
                    '--out-dir', outDirCustomReplayB
                ],
                {cwd: ROOT_DIR, env: baseEnv, encoding: 'utf8'}
            );
            const customReplayReportsB = (await fs.readdir(outDirCustomReplayB)).filter(f => f.startsWith('agent-benchmark-') && f.endsWith('.json'));
            expect(customReplayReportsB).toHaveLength(1);
            expect((await fs.readJson(path.join(outDirCustomReplayB, customReplayReportsB[0]))).arms).toEqual([]);

            // Positive replay control: saved transcript from a preflight-verified Codex run still produces 1 Codex comparison row on `--from-transcript`
            execFileSync(
                process.execPath,
                [
                    path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                    '--from-transcript', `arm-b-neo-kb-only=${path.join(outDirOk, 'arm-b-neo-kb-only-transcript.jsonl')}`,
                    '--out-dir', outDirRealReplay
                ],
                {cwd: ROOT_DIR, env: baseEnv, encoding: 'utf8'}
            );
            const realReplayReports = (await fs.readdir(outDirRealReplay)).filter(f => f.startsWith('agent-benchmark-') && f.endsWith('.json'));
            expect(realReplayReports).toHaveLength(1);
            const realReplayJson = await fs.readJson(path.join(outDirRealReplay, realReplayReports[0]));
            expect(realReplayJson.arms).toHaveLength(1);
            expect(realReplayJson.arms[0].harness).toBe('codex');

            // RA-3b: Launch descriptor validation rejects tampered Arm A command/args and Arm C `--version` / port tampering
            await fs.writeFile(path.join(stagedA.armDir, '.codex/config.toml'), '[mcp_servers.ag-mcp]\ncommand = "echo"\nargs = ["fake-ag-mcp"]\n', 'utf8');
            await expect(verifyCodexMcpPreflight({
                arm     : 'arm-a-react-ag-grid-mcp',
                armDir  : stagedA.armDir,
                env     : buildCleanRoomChildEnv(stagedA, baseEnv),
                codexBin: codexShimPath
            })).rejects.toThrow(/Codex MCP preflight descriptor mismatch for arm-a-react-ag-grid-mcp \(ag-mcp\)/);

            await fs.writeFile(
                path.join(stagedC.armDir, '.codex/config.toml'),
                `[mcp_servers.neural-link]\ncommand = "npx"\nargs = ["-y", "neo-neural-link", "--version"]\n\n[mcp_servers.neural-link.env]\nNEO_NL_PORT = "${nlPortC}"\n`,
                'utf8'
            );
            await expect(verifyCodexMcpPreflight({
                arm     : 'arm-c-neo-kb-neural-link',
                armDir  : stagedC.armDir,
                nlPort  : nlPortC,
                env     : buildCleanRoomChildEnv(stagedC, baseEnv),
                codexBin: codexShimPath
            })).rejects.toThrow(/Codex MCP preflight descriptor mismatch for arm-c-neo-kb-neural-link \(neural-link\)/);

            // RA-5 & AC-2: Seed all 3 prior trial files (`transcript`, `verify-runs`, `post-exit-verify`), reject preflight on the same arm & outDir,
            // and verify all 3 remain byte-identical and replayable while zero `codex exec` attempt or new report is emitted
            await fs.ensureDir(outDirSeeded);
            const seededTranscriptPath = path.join(outDirSeeded, 'arm-a-react-ag-grid-mcp-transcript.jsonl'),
                  seededVerifyPath     = path.join(outDirSeeded, 'arm-a-react-ag-grid-mcp-verify-runs.jsonl'),
                  seededPostVerifyPath = path.join(outDirSeeded, 'arm-a-react-ag-grid-mcp-post-exit-verify.jsonl'),
                  seededTranscriptRaw  = [
                      JSON.stringify({type: 'session_meta', timestamp: '2026-11-27T09:00:00.000Z', cli_version: '0.171.0', model: 'gpt-5.4'}),
                      JSON.stringify({type: 'turn.completed', timestamp: '2026-11-27T09:00:10.000Z', usage: {input_tokens: 500, output_tokens: 100, cached_input_tokens: 200}})
                  ].join('\n') + '\n',
                  seededVerifyRaw      = JSON.stringify({type: 'benchmark_verification', timestamp: '2026-11-27T09:00:08.000Z', arm: 'arm-a-react-ag-grid-mcp', pass: true, durationMs: 42}) + '\n',
                  seededPostVerifyRaw  = JSON.stringify({type: 'runner_post_exit_verification', timestamp: '2026-11-27T09:00:12.000Z', arm: 'arm-a-react-ag-grid-mcp', ran: true, pass: true, durationMs: 40}) + '\n';

            await fs.writeFile(seededTranscriptPath, seededTranscriptRaw, 'utf8');
            await fs.writeFile(seededVerifyPath, seededVerifyRaw, 'utf8');
            await fs.writeFile(seededPostVerifyPath, seededPostVerifyRaw, 'utf8');

            await fs.writeFile(etcCodexConfig, '[mcp_servers.etc-extra]\ncommand = "echo"\n', 'utf8');
            let cliStopped = false;
            try {
                execFileSync(
                    process.execPath,
                    [
                        path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                        '--run-arm', 'arm-a-react-ag-grid-mcp',
                        '--harness', 'codex',
                        '--no-install',
                        '--codex-bin', codexShimPath,
                        '--out-dir', outDirSeeded
                    ],
                    {cwd: ROOT_DIR, env: baseEnv, encoding: 'utf8', stdio: 'pipe'}
                );
            } catch (err) {
                cliStopped = true;
                expect(String(err.stderr || err.message)).toContain('Codex MCP preflight mismatch for arm-a-react-ag-grid-mcp: expected [ag-mcp], observed [etc-extra, ag-mcp]');
            }
            expect(cliStopped).toBe(true);
            expect(await fs.pathExists(execLogPath)).toBe(false);
            expect(await fs.readFile(seededTranscriptPath, 'utf8')).toBe(seededTranscriptRaw);
            expect(await fs.readFile(seededVerifyPath, 'utf8')).toBe(seededVerifyRaw);
            expect(await fs.readFile(seededPostVerifyPath, 'utf8')).toBe(seededPostVerifyRaw);
            const mismatchReports = (await fs.readdir(outDirSeeded)).filter(f => f.startsWith('agent-benchmark-'));
            expect(mismatchReports).toHaveLength(0);

            const replayedSeeded = parseTranscriptTelemetry(
                await fs.readFile(seededTranscriptPath, 'utf8'),
                {arm: 'arm-a-react-ag-grid-mcp', verificationRuns: await readVerificationRuns(seededVerifyPath)}
            );
            expect(replayedSeeded.pass).toBe(true);
            expect(replayedSeeded.timeToGreenMs).toBe(8000);
            expect(replayedSeeded.totalTokens.total).toBe(600);

            // Restore clean system config and verify missing-server control on Arm A also stops before model attempt
            await fs.writeFile(etcCodexConfig, '', 'utf8');
            await fs.writeFile(path.join(stagedA.armDir, '.codex/config.toml'), '[mcp_servers]\n', 'utf8');
            await expect(verifyCodexMcpPreflight({
                arm     : 'arm-a-react-ag-grid-mcp',
                armDir  : stagedA.armDir,
                env     : buildCleanRoomChildEnv(stagedA, baseEnv),
                codexBin: codexShimPath
            })).rejects.toThrow(/Codex MCP preflight mismatch for arm-a-react-ag-grid-mcp: expected \[ag-mcp\], observed \[\]/);

            // AC-3, RA-1, & RA-4:
            // (a) Bootstrap-only CLI failure (`auth-fail`) via CLI `--run-arm` scrubs credentials from the COMPLETE saved transcript AND JSON/MD reports
            let authCliExitCode = 0;
            try {
                execFileSync(
                    process.execPath,
                    [
                        path.join(ROOT_DIR, 'agent-benchmarks/runner/runAgentBenchmark.mjs'),
                        '--run-arm', 'arm-a-react-ag-grid-mcp',
                        '--harness', 'codex',
                        '--no-install',
                        '--codex-bin', codexShimPath,
                        '--out-dir', outDirLaunch
                    ],
                    {cwd: ROOT_DIR, env: {...baseEnv, TEST_CODEX_MODE: 'auth-fail'}, encoding: 'utf8', stdio: 'pipe'}
                );
            } catch (err) {
                authCliExitCode = err.status ?? 1;
            }
            expect(authCliExitCode).toBe(1);

            const savedLaunchTranscript = await fs.readFile(path.join(outDirLaunch, 'arm-a-react-ag-grid-mcp-transcript.jsonl'), 'utf8'),
                  launchOutFiles        = await fs.readdir(outDirLaunch),
                  launchJsonReportRaw   = await fs.readFile(path.join(outDirLaunch, launchOutFiles.find(f => f.endsWith('.json'))), 'utf8'),
                  launchMdReportRaw     = await fs.readFile(path.join(outDirLaunch, launchOutFiles.find(f => f.endsWith('.md'))), 'utf8');

            for (const artifactRaw of [savedLaunchTranscript, launchJsonReportRaw, launchMdReportRaw]) {
                expect(artifactRaw).not.toContain('sk-live-leaked-secret');
                expect(artifactRaw).not.toContain('eyJhbGciOiJIUzI1NiJ9');
                expect(artifactRaw).not.toContain('sk-test-host-preserved-only');
            }
            expect(savedLaunchTranscript).toContain('[REDACTED]');
            expect(launchMdReportRaw).toContain('LAUNCH_FAILURE');

            const reparsedLaunchFail = parseTranscriptTelemetry(savedLaunchTranscript, {arm: 'arm-a-react-ag-grid-mcp'});
            expect(reparsedLaunchFail.runOutcome).toBe('launch_failure');
            expect(reparsedLaunchFail.launchFailure?.exitCode).toBe(1);

            // (b) Interrupted work after `item.started` (`command_execution` and `mcp_tool_call`, `RA-4`) records `task_failed` (`FAIL`), NOT `LAUNCH_FAILURE`, both live and on replay
            const intCmdRes = await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                harness    : 'codex',
                codexBin   : codexShimPath,
                outDir     : outDirOk,
                installDeps: false,
                baseEnv    : {...baseEnv, TEST_CODEX_MODE: 'interrupted-cmd'}
            });
            expect(intCmdRes.telemetry.runOutcome).toBe('task_failed');
            expect(intCmdRes.telemetry.launchFailure).toBeNull();
            expect(intCmdRes.telemetry.toolCallsByServer.shellTestRuns).toBe(1);

            const intMcpRes = await runCleanRoomArm({
                arm        : 'arm-a-react-ag-grid-mcp',
                harness    : 'codex',
                codexBin   : codexShimPath,
                outDir     : outDirOk,
                installDeps: false,
                baseEnv    : {...baseEnv, TEST_CODEX_MODE: 'interrupted-mcp'}
            });
            expect(intMcpRes.telemetry.runOutcome).toBe('task_failed');
            expect(intMcpRes.telemetry.launchFailure).toBeNull();
            expect(intMcpRes.telemetry.toolCallsByServer.docsKbQueries).toBe(1);

            const replayedIntMcp = parseTranscriptTelemetry(
                await fs.readFile(intMcpRes.transcriptPath, 'utf8'),
                {arm: 'arm-a-react-ag-grid-mcp'}
            );
            expect(replayedIntMcp.harness).toBe('codex');
            expect(replayedIntMcp.runOutcome).toBeUndefined();
            expect(replayedIntMcp.launchFailure).toBeUndefined();
            expect(replayedIntMcp.toolCallsByServer.docsKbQueries).toBe(1);

            // (c) Completed item (`item.started` + `item.completed` with same `id`) deduplicates tool call count and reports `task_failed` (`FAIL`)
            const taskFailRes = await runCleanRoomArm({
                arm        : 'arm-b-neo-kb-only',
                harness    : 'codex',
                codexBin   : codexShimPath,
                outDir     : outDirOk,
                installDeps: false,
                baseEnv    : {...baseEnv, TEST_CODEX_MODE: 'task-fail'}
            });
            expect(taskFailRes.telemetry.pass).toBe(false);
            expect(taskFailRes.telemetry.runOutcome).toBe('task_failed');
            expect(taskFailRes.telemetry.launchFailure).toBeNull();
            expect(taskFailRes.telemetry.toolCallsByServer.shellTestRuns).toBe(1);
            expect(taskFailRes.telemetry.totalTokens.total).toBe(350);

            const combinedMd = formatComparisonMarkdown(buildComparisonReport([
                reparsedLaunchFail,
                intMcpRes.telemetry,
                taskFailRes.telemetry
            ]));
            expect(combinedMd).toContain('| `arm-a-react-ag-grid-mcp` | `codex` | `unknown` | `ag-grid-community@36.2.0` | LAUNCH_FAILURE |');
            expect(combinedMd).toContain('| `arm-a-react-ag-grid-mcp` | `codex` | `unknown` | `ag-grid-community@36.2.0` | FAIL |');
            expect(combinedMd).toContain('| `arm-b-neo-kb-only` | `codex` | `gpt-5.4` | `neo.mjs@14.0.0` | FAIL |');

            // Host `~/.codex` and `~/.gemini` profiles remained completely untouched across all runs
            expect(await fs.readFile(path.join(hostCodexDir, 'config.toml'), 'utf8')).toBe(hostConfigContent);
            expect(await fs.readFile(path.join(hostCodexDir, 'auth.json'), 'utf8')).toBe(hostAuthContent);
            expect(await fs.readFile(path.join(hostGeminiDir, 'oauth_creds.json'), 'utf8')).toBe(hostGeminiCredContent);
        } finally {
            if (stagedA) await fs.remove(stagedA.stageRoot);
            if (stagedB) await fs.remove(stagedB.stageRoot);
            if (stagedC) await fs.remove(stagedC.stageRoot);
            await fs.remove(tempRoot);
        }
    });
});
