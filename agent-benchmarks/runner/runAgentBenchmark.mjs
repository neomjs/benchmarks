import {execFile, spawn} from 'node:child_process';
import fs                from 'fs-extra';
import net               from 'node:net';
import os                from 'node:os';
import path              from 'node:path';
import {fileURLToPath}   from 'node:url';
import {promisify}       from 'node:util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '../..');

/**
 * @summary Canonical list of the three coding-agent benchmark arms.
 * @type {ReadonlyArray<String>}
 */
export const ARMS = Object.freeze([
    'arm-a-react-ag-grid-mcp',
    'arm-b-neo-kb-only',
    'arm-c-neo-kb-neural-link'
]);

/**
 * @summary Resolves the pinned framework/engine version string for an arm from its `package.json`.
 * @param {String} arm
 * @param {String} [rootDir=ROOT_DIR]
 * @returns {String|null}
 */
export function resolveArmFrameworkVersion(arm, rootDir = ROOT_DIR) {
    try {
        const pkgPath = path.join(rootDir, 'agent-benchmarks/arms', arm, 'package.json');
        if (!fs.existsSync(pkgPath)) return null;
        const pkg  = fs.readJsonSync(pkgPath),
              deps = pkg.dependencies || {};
        if (deps['ag-grid-community']) {
            return `ag-grid-community@${deps['ag-grid-community']}`;
        }
        if (deps['neo.mjs']) {
            return `neo.mjs@${deps['neo.mjs']}`;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * @summary Splits `mcp__<server>__<tool>` tool names emitted by Claude Code and Codex MCP bridges into `{serverName, toolName}`.
 * @param {String} [serverName='']
 * @param {String} [toolName='']
 * @returns {{serverName: String, toolName: String}}
 */
export function splitMcpToolName(serverName = '', toolName = '') {
    let server = String(serverName || ''),
        tool   = String(toolName   || '');

    if (tool.startsWith('mcp__')) {
        const parts = tool.slice(5).split('__');
        if (parts.length >= 2) {
            server = parts[0];
            tool   = parts.slice(1).join('__');
        }
    }

    return {
        serverName: server,
        toolName  : tool
    };
}

/**
 * @summary Unpacks `mcp__<server>__<tool>` tool names emitted by Claude Code and Codex MCP bridges.
 * @param {{serverName?: String, toolName?: String, input?: Object}} call
 * @returns {{server: String, tool: String, input: Object}}
 */
function normalizeToolCall({serverName = '', toolName = '', input = {}} = {}) {
    const split = splitMcpToolName(serverName, toolName);

    return {
        server: split.serverName.toLowerCase(),
        tool  : split.toolName.toLowerCase(),
        input : input && typeof input === 'object' ? input : {}
    };
}

/**
 * @summary Classifies a single agent tool call into one of the four benchmark telemetry buckets.
 * @param {Object} call
 * @param {String} [call.serverName]
 * @param {String} [call.toolName]
 * @param {Object} [call.input]
 * @returns {'docsKbQueries'|'neuralLinkRuntimeCalls'|'fileEdits'|'shellTestRuns'|'other'}
 */
export function classifyToolCall(call = {}) {
    const {server, tool, input} = normalizeToolCall(call);

    if (
        server.includes('neural-link') ||
        server.includes('neural_link') ||
        tool.includes('inspect_store') ||
        tool.includes('get_component_tree') ||
        tool.includes('get_window_topology') ||
        tool.includes('get_dom_rect') ||
        tool.includes('get_console_logs') ||
        tool.includes('query_vdom')
    ) {
        return 'neuralLinkRuntimeCalls';
    }

    const targetPath = String(input.file_path || input.path || input.url || input.pattern || '').toLowerCase();
    const isDocRead  = (tool === 'read' || tool === 'read_file' || tool === 'grep' || tool === 'glob' || tool === 'webfetch') && (
        targetPath.includes('.agents/skills') ||
        targetPath.includes('node_modules/neo.mjs/learn') ||
        targetPath.includes('node_modules/neo.mjs/examples') ||
        targetPath.includes('llms.txt') ||
        targetPath.includes('llms-full.txt')
    );

    if (
        isDocRead ||
        server.includes('ag-mcp') ||
        server.includes('knowledge-base') ||
        tool.includes('ask_knowledge_base') ||
        tool.includes('query_documents') ||
        tool.includes('search_docs') ||
        tool.includes('get_example') ||
        tool.includes('get_mcp_tool_handbook')
    ) {
        return 'docsKbQueries';
    }

    if (
        tool === 'write' ||
        tool === 'edit' ||
        tool === 'multiedit' ||
        tool === 'notebookedit' ||
        tool === 'file_change' ||
        tool.includes('write_file') ||
        tool.includes('edit_file') ||
        tool.includes('replace') ||
        tool.includes('apply_patch') ||
        tool.includes('patch')
    ) {
        return 'fileEdits';
    }

    if (
        tool === 'bash' ||
        tool === 'command_execution' ||
        tool.includes('run_command') ||
        tool.includes('run_shell') ||
        tool.includes('exec_command') ||
        tool.includes('exec')
    ) {
        return 'shellTestRuns';
    }

    return 'other';
}

/**
 * @summary Per-harness JSONL line adapter normalizing Claude Code, Codex CLI, and generic transcript entries.
 * @param {Object} entry Parsed JSONL line.
 * @returns {{harness: String|null, harnessVersion: String|null, model: String|null, timestamp: String|null, usageId: String|null, usage: {inputTokens: Number, outputTokens: Number, cachedTokens: Number}|null, fallbackUsage?: {inputTokens: Number, outputTokens: Number, cachedTokens: Number}|null, durationMs?: Number|null, toolCalls: Array<{serverName: String, toolName: String, input: Object}>, verificationRun: {timestamp: String|null, pass: Boolean}|null}}
 */
export function adaptTranscriptEntry(entry = {}) {
    const timestamp = entry.timestamp || entry.created_at || entry.payload?.timestamp || null;

    // 1. Runner-emitted verification log line (`runArmVerification`)
    if (entry.type === 'benchmark_verification' && typeof entry.pass === 'boolean') {
        return {
            harness        : null,
            harnessVersion : null,
            model          : null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [],
            verificationRun: {timestamp, pass: entry.pass}
        };
    }

    // 2. Claude Code JSONL (`message.id`, `message.usage` + `message.content` `tool_use` blocks)
    if (entry.message && typeof entry.message === 'object') {
        const msg     = entry.message,
              u       = msg.usage,
              usageId = msg.id || null,
              usage   = u ? {
                  inputTokens : Number(u.input_tokens || 0),
                  outputTokens: Number(u.output_tokens || 0),
                  cachedTokens: Number((u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0))
              } : null,
              content   = Array.isArray(msg.content) ? msg.content : [],
              toolCalls = content
                  .filter(block => block && block.type === 'tool_use')
                  .map(block => {
                      const {serverName, toolName} = splitMcpToolName('', block.name || '');
                      return {
                          serverName,
                          toolName,
                          input: block.input || {}
                      };
                  });

        return {
            harness        : 'claude-code',
            harnessVersion : entry.claude_code_version || entry.version || null,
            model          : msg.model || null,
            timestamp,
            usageId,
            usage,
            toolCalls,
            verificationRun: null
        };
    }

    // 2b. Claude Code `stream-json` non-message envelopes (`system`, `result`, `rate_limit_event`)
    if (entry.type === 'system') {
        return {
            harness        : 'claude-code',
            harnessVersion : entry.claude_code_version || entry.version || null,
            model          : entry.model || null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [],
            verificationRun: null
        };
    }

    if (entry.type === 'result') {
        const u              = entry.usage && typeof entry.usage === 'object' ? entry.usage : null,
              fallbackUsage  = u ? {
                  inputTokens : Number(u.input_tokens || 0),
                  outputTokens: Number(u.output_tokens || 0),
                  cachedTokens: Number((u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0))
              } : null,
              modelFromUsage = entry.modelUsage && typeof entry.modelUsage === 'object'
                  ? Object.keys(entry.modelUsage)[0] || null
                  : null;

        return {
            harness        : 'claude-code',
            harnessVersion : entry.claude_code_version || entry.version || null,
            model          : entry.model || modelFromUsage || null,
            timestamp,
            usageId        : null,
            usage          : null,
            fallbackUsage,
            durationMs     : typeof entry.duration_ms === 'number' ? entry.duration_ms : null,
            toolCalls      : [],
            verificationRun: null
        };
    }

    if (entry.type === 'rate_limit_event') {
        return {
            harness        : 'claude-code',
            harnessVersion : entry.version || null,
            model          : null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [],
            verificationRun: null
        };
    }

    // 3. Codex CLI JSONL (`session_meta`, `turn_context`, `item.completed`, `turn.completed`, `event_msg`, `response_item`)
    if (
        entry.type === 'session_meta' ||
        entry.type === 'turn_context' ||
        entry.type === 'item.completed' ||
        entry.type === 'turn.completed' ||
        entry.type === 'event_msg' ||
        entry.type === 'response_item'
    ) {
        const u     = entry.usage || entry.payload?.info?.last_token_usage,
              usage = u ? {
                  inputTokens : Number(u.input_tokens ?? u.inputTokens ?? 0),
                  outputTokens: Number(u.output_tokens ?? u.outputTokens ?? 0),
                  cachedTokens: Number(u.cached_input_tokens ?? u.cachedTokens ?? 0)
              } : null;

        const toolCalls = [];
        if (entry.item && typeof entry.item === 'object') {
            if (entry.item.type === 'mcp_tool_call') {
                const {serverName, toolName} = splitMcpToolName(entry.item.server || '', entry.item.tool || '');
                toolCalls.push({
                    serverName,
                    toolName,
                    input: entry.item.arguments || {}
                });
            } else if (entry.item.type === 'command_execution') {
                toolCalls.push({
                    serverName: '',
                    toolName  : 'command_execution',
                    input     : {command: entry.item.command || ''}
                });
            } else if (entry.item.type === 'file_change') {
                toolCalls.push({
                    serverName: '',
                    toolName  : 'file_change',
                    input     : entry.item
                });
            }
        } else if (entry.payload && (entry.payload.type === 'function_call' || entry.payload.type === 'custom_tool_call')) {
            let parsedArgs = {};
            if (typeof entry.payload.arguments === 'string') {
                try { parsedArgs = JSON.parse(entry.payload.arguments); } catch {}
            } else if (entry.payload.arguments && typeof entry.payload.arguments === 'object') {
                parsedArgs = entry.payload.arguments;
            }
            const {serverName, toolName} = splitMcpToolName('', entry.payload.name || '');
            toolCalls.push({
                serverName,
                toolName,
                input: parsedArgs
            });
        }

        return {
            harness        : 'codex',
            harnessVersion : entry.cli_version || entry.payload?.cli_version || entry.version || null,
            model          : entry.model || entry.payload?.model || null,
            timestamp,
            usageId        : entry.id || null,
            usage,
            toolCalls,
            verificationRun: null
        };
    }

    // 4. Generic / Antigravity JSONL
    const u     = entry.usage,
          usage = u ? {
              inputTokens : Number(u.inputTokens ?? u.input_tokens ?? 0),
              outputTokens: Number(u.outputTokens ?? u.output_tokens ?? 0),
              cachedTokens: Number(u.cachedTokens ?? u.cached_tokens ?? 0)
          } : null;

    const rawCalls  = entry.toolCalls || entry.tool_calls || [],
          toolCalls = rawCalls.map(call => {
              const {serverName, toolName} = splitMcpToolName(
                  call.serverName || call.Arguments?.ServerName || '',
                  call.toolName   || call.Arguments?.ToolName   || call.name || ''
              );
              return {
                  serverName,
                  toolName,
                  input: call.input || call.Arguments || {}
              };
          });

    let verificationRun = null;
    if (entry.verificationPassed === true) {
        verificationRun = {timestamp, pass: true};
    } else if (entry.verificationFailed === true) {
        verificationRun = {timestamp, pass: false};
    }

    return {
        harness       : entry.harness || (rawCalls.length || u ? 'generic' : null),
        harnessVersion: entry.harnessVersion || entry.version || null,
        model         : entry.model || null,
        timestamp,
        usageId       : entry.id || null,
        usage,
        toolCalls,
        verificationRun
    };
}

/**
 * @summary Parses an agent JSONL transcript and runner verification log into structured benchmark telemetry for one arm.
 *
 * - Supports Claude Code (`message.usage`, `tool_use` with `mcp__<server>__<tool>`), Codex CLI (`turn.completed`, `item.completed`), and generic JSONL.
 * - Takes `pass` and `verificationFailures` from the runner's `verify.spec.mjs` executions (`verificationRuns` or embedded `benchmark_verification` records).
 * - Defines `timeToGreenMs` as elapsed milliseconds from the start of the transcript to the first passing verification (`null` when no verification passed).
 *
 * @param {String} jsonlContent Raw JSONL transcript content.
 * @param {Object} [options]
 * @param {String} [options.arm='unknown']
 * @param {String} [options.harness]
 * @param {String} [options.model]
 * @param {{harnessVersion?: String|null, frameworkVersion?: String|null}} [options.versions]
 * @param {Array<{timestamp?: String, pass: Boolean, durationMs?: Number}>} [options.verificationRuns=[]]
 * @returns {{arm: String, harness: String, model: String, versions: {harnessVersion: String|null, frameworkVersion: String|null}, pass: Boolean, timeToGreenMs: Number|null, totalTokens: {inputTokens: Number, outputTokens: Number, cachedTokens: Number, total: Number}, toolCallsByServer: {docsKbQueries: Number, neuralLinkRuntimeCalls: Number, fileEdits: Number, shellTestRuns: Number, other: Number}, verificationFailures: Number}}
 */
export function parseTranscriptTelemetry(jsonlContent = '', {
    arm              = 'unknown',
    harness          = null,
    model            = null,
    versions         = {},
    verificationRuns = []
} = {}) {
    const lines = String(jsonlContent).split('\n').map(l => l.trim()).filter(Boolean);

    let firstTimestamp     = null,
        detectedHarness    = harness,
        detectedHarnessVer = versions.harnessVersion || null,
        detectedModel      = model,
        inputTokens        = 0,
        outputTokens       = 0,
        cachedTokens       = 0,
        sawPerMessageUsage = false,
        fallbackUsage      = null,
        fallbackDurationMs = null;

    const collectedVerifications = [],
          seenUsageIds           = new Set();

    const toolCallsByServer = {
        docsKbQueries         : 0,
        neuralLinkRuntimeCalls: 0,
        fileEdits             : 0,
        shellTestRuns         : 0,
        other                 : 0
    };

    for (const line of lines) {
        const entry   = JSON.parse(line),
              adapted = adaptTranscriptEntry(entry);

        if (adapted.harness && !detectedHarness) {
            detectedHarness = adapted.harness;
        }
        if (adapted.harnessVersion && !detectedHarnessVer) {
            detectedHarnessVer = adapted.harnessVersion;
        }
        if (adapted.model && !detectedModel) {
            detectedModel = adapted.model;
        }

        if (adapted.timestamp) {
            const ms = Date.parse(adapted.timestamp);
            if (!Number.isNaN(ms)) {
                if (firstTimestamp === null || ms < firstTimestamp) {
                    firstTimestamp = ms;
                }
            }
        }

        if (adapted.usage) {
            if (!adapted.usageId || !seenUsageIds.has(adapted.usageId)) {
                if (adapted.usageId) {
                    seenUsageIds.add(adapted.usageId);
                }
                sawPerMessageUsage = true;
                inputTokens  += adapted.usage.inputTokens;
                outputTokens += adapted.usage.outputTokens;
                cachedTokens += adapted.usage.cachedTokens;
            }
        }

        if (adapted.fallbackUsage) {
            fallbackUsage = adapted.fallbackUsage;
        }
        if (typeof adapted.durationMs === 'number') {
            fallbackDurationMs = adapted.durationMs;
        }

        if (adapted.verificationRun) {
            collectedVerifications.push(adapted.verificationRun);
        }

        for (const call of adapted.toolCalls) {
            const bucket = classifyToolCall(call);
            toolCallsByServer[bucket]++;
        }
    }

    if (!sawPerMessageUsage && fallbackUsage) {
        inputTokens  = fallbackUsage.inputTokens;
        outputTokens = fallbackUsage.outputTokens;
        cachedTokens = fallbackUsage.cachedTokens;
    }

    for (const run of verificationRuns) {
        if (run && typeof run.pass === 'boolean') {
            collectedVerifications.push({
                timestamp: run.timestamp || null,
                pass     : run.pass
            });
        }
    }

    const firstGreenRun        = collectedVerifications.find(r => r.pass === true) || null,
          lastVerificationRun  = collectedVerifications.length > 0 ? collectedVerifications[collectedVerifications.length - 1] : null,
          pass                 = Boolean(lastVerificationRun?.pass === true),
          verificationFailures = collectedVerifications.filter(r => r.pass === false).length;

    let timeToGreenMs = null;
    if (pass && firstGreenRun?.timestamp && firstTimestamp !== null) {
        const greenMs = Date.parse(firstGreenRun.timestamp);
        if (!Number.isNaN(greenMs)) {
            timeToGreenMs = Math.max(0, greenMs - firstTimestamp);
        }
    } else if (pass && typeof fallbackDurationMs === 'number') {
        timeToGreenMs = Math.max(0, fallbackDurationMs);
    }

    return {
        arm,
        harness : detectedHarness || 'unknown',
        model   : detectedModel   || 'unknown',
        versions: {
            harnessVersion  : detectedHarnessVer,
            frameworkVersion: versions.frameworkVersion !== undefined
                ? versions.frameworkVersion
                : resolveArmFrameworkVersion(arm)
        },
        pass,
        timeToGreenMs,
        totalTokens: {
            inputTokens,
            outputTokens,
            cachedTokens,
            total: inputTokens + outputTokens
        },
        toolCallsByServer,
        verificationFailures
    };
}

/**
 * @summary Strips host Neo/Antigravity/Claude session environment variables before clean-room execution.
 * @param {Object} [baseEnv=process.env]
 * @param {Object} [extraEnv={}]
 * @returns {Object}
 */
export function sanitizeCleanRoomEnv(baseEnv = process.env, extraEnv = {}) {
    const clean = {};

    for (const [key, value] of Object.entries(baseEnv || {})) {
        if (
            value === undefined ||
            key.startsWith('NEO_') ||
            key.startsWith('AGY_') ||
            key === 'CLAUDECODE' ||
            key === 'CLAUDE_CODE_ENTRYPOINT'
        ) {
            continue;
        }
        clean[key] = value;
    }

    for (const [key, value] of Object.entries(extraEnv || {})) {
        if (value !== undefined) {
            clean[key] = String(value);
        }
    }

    return clean;
}

/**
 * @summary Probes a single TCP host/port pair with a bounded connect timeout.
 * @param {Number} port
 * @param {String} host
 * @param {Number} [timeoutMs=200]
 * @returns {Promise<Boolean>}
 */
function probeTcpHost(port, host, timeoutMs = 200) {
    return new Promise(resolve => {
        const socket = net.connect({port, host});
        let settled  = false;
        const done   = listening => {
            if (!settled) {
                settled = true;
                socket.destroy();
                resolve(listening);
            }
        };

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => done(true));
        socket.once('timeout', () => done(false));
        socket.once('error',   () => done(false));
    });
}

/**
 * @summary Binds and closes a temporary server on `127.0.0.1` to verify or allocate a free TCP port.
 * @param {Number} port
 * @returns {Promise<Number>}
 */
function tryBindPort(port) {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.once('error', reject);
        srv.listen(port, '127.0.0.1', () => {
            const addr  = srv.address(),
                  bound = typeof addr === 'object' && addr ? addr.port : port;
            srv.close(err => err ? reject(err) : resolve(bound));
        });
    });
}

/**
 * @summary Checks whether a local TCP listener is accepting connections on `127.0.0.1` or `::1`.
 * @param {Number} port
 * @returns {Promise<Boolean>}
 */
export async function isPortListening(port) {
    const num = Number(port);
    if (!Number.isInteger(num) || num <= 0) return false;
    if (await probeTcpHost(num, '127.0.0.1')) return true;
    return probeTcpHost(num, '::1');
}

/**
 * @summary Returns `preferredPort` when free on localhost, otherwise allocates an ephemeral TCP port.
 * @param {Number} [preferredPort=0]
 * @returns {Promise<Number>}
 */
export async function allocateFreePort(preferredPort = 0) {
    const preferred = Number(preferredPort) || 0;
    if (preferred > 0 && !(await isPortListening(preferred))) {
        try {
            return await tryBindPort(preferred);
        } catch {}
    }
    return tryBindPort(0);
}

/**
 * @summary Stages an isolated clean-room copy of an arm workspace with collision-free dev and Neural Link ports.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.stageRoot]
 * @param {Number} [options.appPort]
 * @param {Number} [options.nlPort]
 * @param {Boolean} [options.installDeps=true]
 * @param {String} [options.rootDir=ROOT_DIR]
 * @returns {Promise<{stageRoot: String, armDir: String, appPort: Number, nlPort: Number|null, appUrl: String, verifyLogPath: String}>}
 */
export async function stageArmWorkspace({
    arm,
    stageRoot,
    appPort,
    nlPort,
    installDeps = true,
    rootDir     = ROOT_DIR
}) {
    if (!ARMS.includes(arm)) {
        throw new Error(`Unknown benchmark arm: ${arm}. Expected one of: ${ARMS.join(', ')}`);
    }

    let resolvedStageRoot = stageRoot
        ? path.resolve(stageRoot)
        : path.join(os.tmpdir(), `neo-agent-bench-${arm}-${Date.now()}`);

    if (!stageRoot && await fs.pathExists(resolvedStageRoot)) {
        resolvedStageRoot = `${resolvedStageRoot}-${Math.random().toString(36).slice(2, 7)}`;
    }

    await fs.ensureDir(resolvedStageRoot);

    await fs.copy(
        path.join(rootDir, 'agent-benchmarks/playwright.config.mjs'),
        path.join(resolvedStageRoot, 'agent-benchmarks/playwright.config.mjs')
    );
    await fs.copy(
        path.join(rootDir, 'agent-benchmarks/tasks'),
        path.join(resolvedStageRoot, 'agent-benchmarks/tasks')
    );
    await fs.copy(
        path.join(rootDir, 'agent-benchmarks/runner'),
        path.join(resolvedStageRoot, 'agent-benchmarks/runner')
    );

    const srcArmDir = path.join(rootDir, 'agent-benchmarks/arms', arm),
          armDir    = path.join(resolvedStageRoot, 'agent-benchmarks/arms', arm);

    await fs.copy(srcArmDir, armDir, {
        filter: src => {
            const rel = path.relative(srcArmDir, src);
            if (!rel) return true;
            const firstSeg = rel.split(path.sep)[0];
            return firstSeg !== 'node_modules' && firstSeg !== '.agents';
        }
    });

    const rootNodeModules  = path.join(rootDir, 'node_modules'),
          stageNodeModules = path.join(resolvedStageRoot, 'node_modules');
    if (await fs.pathExists(rootNodeModules) && !await fs.pathExists(stageNodeModules)) {
        await fs.ensureSymlink(rootNodeModules, stageNodeModules, 'dir');
    }

    const defaultAppPort  = arm === 'arm-a-react-ag-grid-mcp' ? 5174 : 8080,
          resolvedAppPort = await allocateFreePort(appPort ?? defaultAppPort),
          pkgJsonPath     = path.join(armDir, 'package.json'),
          agentsMdPath    = path.join(armDir, 'AGENTS.md');

    if (arm === 'arm-a-react-ag-grid-mcp' && resolvedAppPort !== 5174) {
        const pkg = await fs.readJson(pkgJsonPath);
        pkg.scripts = {...pkg.scripts, dev: `vite --port ${resolvedAppPort}`};
        await fs.writeJson(pkgJsonPath, pkg, {spaces: 4});

        const agentsMd = await fs.readFile(agentsMdPath, 'utf8');
        await fs.writeFile(
            agentsMdPath,
            agentsMd.replaceAll('http://localhost:5174', `http://localhost:${resolvedAppPort}`),
            'utf8'
        );
    } else if (arm !== 'arm-a-react-ag-grid-mcp' && resolvedAppPort !== 8080) {
        const pkg = await fs.readJson(pkgJsonPath);
        pkg.scripts = {
            ...pkg.scripts,
            'server-start:headless': `PORT=${resolvedAppPort} webpack serve -c ./node_modules/neo.mjs/buildScripts/webpack/webpack.server.config.mjs`
        };
        await fs.writeJson(pkgJsonPath, pkg, {spaces: 4});

        const agentsMd = await fs.readFile(agentsMdPath, 'utf8');
        await fs.writeFile(
            agentsMdPath,
            agentsMd.replaceAll('http://localhost:8080', `http://localhost:${resolvedAppPort}`),
            'utf8'
        );
    }

    let resolvedNlPort = null;
    if (arm === 'arm-c-neo-kb-neural-link') {
        resolvedNlPort = await allocateFreePort(nlPort ?? 18081);

        const mcpJsonPath = path.join(armDir, '.mcp.json');
        if (await fs.pathExists(mcpJsonPath)) {
            const mcpJson = await fs.readJson(mcpJsonPath);
            if (mcpJson.mcpServers?.['neural-link']) {
                mcpJson.mcpServers['neural-link'].env = {
                    ...(mcpJson.mcpServers['neural-link'].env || {}),
                    NEO_NL_PORT: String(resolvedNlPort)
                };
                await fs.writeJson(mcpJsonPath, mcpJson, {spaces: 4});
            }
        }

        const codexConfigPath = path.join(armDir, '.codex/config.toml');
        if (await fs.pathExists(codexConfigPath)) {
            let toml = await fs.readFile(codexConfigPath, 'utf8');
            if (/\[mcp_servers\.neural-link\.env\]/.test(toml)) {
                toml = toml.replace(
                    /(\[mcp_servers\.neural-link\.env\][\s\S]*?NEO_NL_PORT\s*=\s*)"[^"]*"/,
                    `$1"${resolvedNlPort}"`
                );
            } else {
                toml = `${toml.trimEnd()}\n\n[mcp_servers.neural-link.env]\nNEO_NL_PORT = "${resolvedNlPort}"\n`;
            }
            await fs.writeFile(codexConfigPath, toml, 'utf8');
        }

        const neoConfigPath = path.join(armDir, 'apps/gridbench/neo-config.json');
        if (await fs.pathExists(neoConfigPath)) {
            const neoConfig = await fs.readJson(neoConfigPath);
            neoConfig.neuralLinkUrl = `ws://127.0.0.1:${resolvedNlPort}`;
            await fs.writeJson(neoConfigPath, neoConfig, {spaces: 4});
        }
    }

    if (installDeps) {
        await execFileAsync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], {
            cwd      : armDir,
            encoding : 'utf8',
            maxBuffer: 50 * 1024 * 1024,
            env      : sanitizeCleanRoomEnv(process.env)
        });
    }

    const appUrl        = arm === 'arm-a-react-ag-grid-mcp'
              ? `http://localhost:${resolvedAppPort}`
              : `http://localhost:${resolvedAppPort}/apps/gridbench/index.html`,
          verifyLogPath = path.join(resolvedStageRoot, 'agent-benchmarks/results', `${arm}-verify-runs.jsonl`);

    return {
        stageRoot: resolvedStageRoot,
        armDir,
        appPort  : resolvedAppPort,
        nlPort   : resolvedNlPort,
        appUrl,
        verifyLogPath
    };
}

/**
 * @summary Runs `verify.spec.mjs` against a running arm server, records pass/fail and duration,
 * and optionally appends a `benchmark_verification` record to `verifyLogPath`.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.url='http://localhost:8080']
 * @param {Number} [options.timeoutMs=15000]
 * @param {String|null} [options.verifyLogPath=null]
 * @param {String} [options.rootDir=ROOT_DIR]
 * @returns {Promise<{type: 'benchmark_verification', timestamp: String, arm: String, pass: Boolean, durationMs: Number, output: String}>}
 */
export async function runArmVerification({
    arm,
    url           = 'http://localhost:8080',
    timeoutMs     = 15000,
    verifyLogPath = null,
    rootDir       = ROOT_DIR
}) {
    const start = Date.now();
    let   pass  = false,
        output  = '';

    try {
        const {stdout, stderr} = await execFileAsync(
            'npx',
            [
                'playwright',
                'test',
                '-c',
                path.join(rootDir, 'agent-benchmarks/playwright.config.mjs'),
                path.join(rootDir, 'agent-benchmarks/tasks/grid-100k-multi-window/verify.spec.mjs')
            ],
            {
                cwd      : rootDir,
                encoding : 'utf8',
                maxBuffer: 20 * 1024 * 1024,
                env      : {
                    ...process.env,
                    AGENT_BENCH_URL       : url,
                    AGENT_BENCH_TIMEOUT_MS: String(timeoutMs)
                }
            }
        );

        pass   = true;
        output = [stdout, stderr].filter(Boolean).join('\n');
    } catch (error) {
        pass   = false;
        output = [error.stdout, error.stderr, error.message].filter(Boolean).join('\n');
    }

    const record = {
        type      : 'benchmark_verification',
        timestamp : new Date().toISOString(),
        arm,
        pass,
        durationMs: Date.now() - start,
        output
    };

    if (verifyLogPath) {
        await fs.ensureDir(path.dirname(verifyLogPath));
        const {output: _omitted, ...persistedRecord} = record;
        await fs.appendFile(verifyLogPath, JSON.stringify(persistedRecord) + '\n', 'utf8');
    }

    return record;
}

/**
 * @summary Reads recorded `benchmark_verification` runs from a JSONL verification log file if present.
 * @param {String} verifyLogPath
 * @returns {Promise<Array<{timestamp: String, arm: String, pass: Boolean, durationMs: Number}>>}
 */
export async function readVerificationRuns(verifyLogPath) {
    if (!verifyLogPath || !await fs.pathExists(verifyLogPath)) {
        return [];
    }
    const content = await fs.readFile(verifyLogPath, 'utf8');
    return content
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => JSON.parse(l))
        .filter(r => r && typeof r.pass === 'boolean');
}

/**
 * @summary Executes one benchmark arm end-to-end inside an isolated clean-room workspace and returns parsed telemetry.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.harness='claude-code']
 * @param {String} [options.model='sonnet']
 * @param {String|null} [options.cmd=null]
 * @param {String} [options.outDir]
 * @param {Number} [options.timeoutMs=900000]
 * @param {Number} [options.appPort]
 * @param {Number} [options.nlPort]
 * @param {Boolean} [options.keepStage=false]
 * @param {Boolean} [options.installDeps=true]
 * @returns {Promise<{telemetry: Object, transcriptPath: String, verifyLogPath: String}>}
 */
export async function runCleanRoomArm({
    arm,
    harness     = 'claude-code',
    model       = 'sonnet',
    cmd         = null,
    outDir      = path.join(ROOT_DIR, 'agent-benchmarks/results'),
    timeoutMs   = 900000,
    appPort,
    nlPort,
    keepStage   = false,
    installDeps = true
}) {
    const resolvedOutDir   = path.resolve(ROOT_DIR, outDir),
          transcriptPath   = path.join(resolvedOutDir, `${arm}-transcript.jsonl`),
          outVerifyLogPath = path.join(resolvedOutDir, `${arm}-verify-runs.jsonl`);

    await fs.ensureDir(resolvedOutDir);
    await fs.writeFile(transcriptPath, '', 'utf8');
    await fs.remove(outVerifyLogPath);

    const staged = await stageArmWorkspace({arm, appPort, nlPort, installDeps}),
          prompt = 'Read AGENTS.md and ../../tasks/grid-100k-multi-window/PROMPT.md first, then implement all requirements in this workspace, start the dev server in the background, verify in the running app, and run the benchmark verification command from AGENTS.md until all assertions pass (exit code 0).',
          childEnv = sanitizeCleanRoomEnv(process.env, {
              PORT: String(staged.appPort),
              ...(staged.nlPort ? {NEO_NL_PORT: String(staged.nlPort)} : {})
          });

    let spawnBin, spawnArgs;
    if (cmd) {
        spawnBin  = '/bin/sh';
        spawnArgs = ['-c', cmd];
    } else if (harness === 'codex') {
        spawnBin  = 'codex';
        spawnArgs = ['exec', '--json', '--dangerously-bypass-approvals-and-sandbox', '-m', model, prompt];
    } else {
        spawnBin  = 'claude';
        spawnArgs = [
            '-p', prompt,
            '--model', model,
            '--output-format', 'stream-json',
            '--verbose',
            '--mcp-config', './.mcp.json',
            '--strict-mcp-config',
            '--setting-sources', 'project,local',
            '--permission-mode', 'bypassPermissions',
            '--no-chrome'
        ];
    }

    let child      = null,
        writeChain = Promise.resolve(),
        stdoutBuf  = '';

    const processLine = rawLine => {
        const trimmed = rawLine.trim();
        if (!trimmed) return;
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                if (!parsed.timestamp && !parsed.created_at) {
                    parsed.timestamp = new Date().toISOString();
                }
                const outLine = JSON.stringify(parsed) + '\n';
                writeChain = writeChain.then(() => fs.appendFile(transcriptPath, outLine, 'utf8'));
            }
        } catch {}
    };

    try {
        child = spawn(spawnBin, spawnArgs, {
            cwd     : staged.armDir,
            detached: true,
            stdio   : ['ignore', 'pipe', 'pipe'],
            env     : childEnv
        });

        await new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    try { process.kill(-child.pid, 'SIGTERM'); } catch {}
                    resolve();
                }
            }, timeoutMs);

            child.stdout.on('data', chunk => {
                stdoutBuf += chunk.toString('utf8');
                const parts = stdoutBuf.split('\n');
                stdoutBuf   = parts.pop() || '';
                for (const line of parts) {
                    processLine(line);
                }
            });

            child.stderr.on('data', () => {});

            child.once('error', err => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            });

            child.once('exit', () => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    setTimeout(() => {
                        child.stdout?.destroy();
                        child.stderr?.destroy();
                        resolve();
                    }, 50);
                }
            });
        });

        if (stdoutBuf.trim()) {
            processLine(stdoutBuf);
            stdoutBuf = '';
        }
        await writeChain;

        let verificationRuns = await readVerificationRuns(staged.verifyLogPath);
        if (!verificationRuns.some(r => r.pass === true) && await isPortListening(staged.appPort)) {
            await runArmVerification({
                arm,
                url          : staged.appUrl,
                verifyLogPath: staged.verifyLogPath,
                rootDir      : staged.stageRoot
            });
            verificationRuns = await readVerificationRuns(staged.verifyLogPath);
        }

        if (await fs.pathExists(staged.verifyLogPath)) {
            await fs.copy(staged.verifyLogPath, outVerifyLogPath, {overwrite: true});
        }

        const rawTranscript = await fs.readFile(transcriptPath, 'utf8'),
              telemetry     = parseTranscriptTelemetry(rawTranscript, {
                  arm,
                  versions: {
                      frameworkVersion: resolveArmFrameworkVersion(arm, staged.stageRoot)
                  },
                  verificationRuns
              });

        if (telemetry.harness === 'unknown' && harness) {
            telemetry.harness = harness;
        }
        if (telemetry.model === 'unknown' && model) {
            telemetry.model = model;
        }

        return {
            telemetry,
            transcriptPath,
            verifyLogPath: outVerifyLogPath
        };
    } finally {
        if (child?.pid) {
            try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        }
        try {
            await execFileAsync('pkill', ['-TERM', '-f', staged.stageRoot]);
        } catch {}
        if (!keepStage) {
            await fs.remove(staged.stageRoot);
        }
    }
}

/**
 * @summary Builds a structured comparison report object across the supplied arm telemetry entries.
 * @param {Array<Object>} armResults
 * @returns {{generatedAt: String, task: String, arms: Array<Object>}}
 */
export function buildComparisonReport(armResults = []) {
    return {
        generatedAt: new Date().toISOString(),
        task       : 'grid-100k-multi-window',
        arms       : armResults
    };
}

/**
 * @summary Formats a 3-arm comparison report as a Markdown table including harness, model, and framework versions.
 * @param {{generatedAt: String, task: String, arms: Array<Object>}} report
 * @returns {String}
 */
export function formatComparisonMarkdown(report) {
    const header = [
        `# 3-Arm Coding-Agent Benchmark Report — \`${report.task}\``,
        '',
        `Generated: \`${report.generatedAt}\``,
        '',
        '| Arm | Harness | Model | Framework | Pass | Time to Green (ms) | Total Tokens | Docs/KB Queries | Neural Link Calls | File Edits | Shell/Test Runs | Verification Failures |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|'
    ];

    const rows = (report.arms || []).map(entry => {
        const tc          = entry.toolCallsByServer || {},
              timeToGreen = entry.timeToGreenMs === null || entry.timeToGreenMs === undefined ? 'N/A' : entry.timeToGreenMs,
              framework   = entry.versions?.frameworkVersion || 'unknown';
        return `| \`${entry.arm}\` | \`${entry.harness || 'unknown'}\` | \`${entry.model || 'unknown'}\` | \`${framework}\` | ${entry.pass ? 'PASS' : 'FAIL'} | ${timeToGreen} | ${entry.totalTokens?.total ?? 0} | ${tc.docsKbQueries ?? 0} | ${tc.neuralLinkRuntimeCalls ?? 0} | ${tc.fileEdits ?? 0} | ${tc.shellTestRuns ?? 0} | ${entry.verificationFailures ?? 0} |`;
    });

    return [...header, ...rows, ''].join('\n');
}

/**
 * @summary Persists JSON + Markdown comparison reports to `outDir` and prints the Markdown table.
 * @param {Array<Object>} armResults
 * @param {String} outDir
 * @returns {Promise<{report: Object, markdown: String, jsonPath: String, mdPath: String}>}
 */
async function writeComparisonReport(armResults, outDir) {
    const report   = buildComparisonReport(armResults),
          markdown = formatComparisonMarkdown(report);

    await fs.ensureDir(outDir);
    const stamp    = report.generatedAt.replace(/[:.]/g, '-'),
          jsonPath = path.join(outDir, `agent-benchmark-${stamp}.json`),
          mdPath   = path.join(outDir, `agent-benchmark-${stamp}.md`);

    await fs.writeJson(jsonPath, report, {spaces: 2});
    await fs.writeFile(mdPath, markdown, 'utf8');
    console.log(markdown);

    return {report, markdown, jsonPath, mdPath};
}

/**
 * @summary CLI entrypoint for verifying an arm, running clean-room benchmark arms (`--run-arm` / `--run-all`),
 * or aggregating transcript telemetry (`--from-transcript` / `--arm-{a,b,c}-transcript`) into JSON + Markdown reports.
 */
async function main() {
    const args    = process.argv.slice(2),
          getFlag = name => {
              const idx = args.indexOf(name);
              return idx > -1 ? args[idx + 1] : null;
          },
          getAllFlags = name => {
              const values = [];
              for (let i = 0; i < args.length; i++) {
                  if (args[i] === name && args[i + 1]) {
                      values.push(args[i + 1]);
                  }
              }
              return values;
          },
          verifyArm  = getFlag('--verify-arm'),
          url        = getFlag('--url') || 'http://localhost:8080',
          outDir     = path.resolve(ROOT_DIR, getFlag('--out-dir') || 'agent-benchmarks/results'),
          harnessOpt = getFlag('--harness'),
          modelOpt   = getFlag('--model');

    if (verifyArm) {
        const verifyLogPath = getFlag('--verify-log')
            ? path.resolve(process.cwd(), getFlag('--verify-log'))
            : path.join(outDir, `${verifyArm}-verify-runs.jsonl`);
        const result = await runArmVerification({arm: verifyArm, url, verifyLogPath});
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.pass ? 0 : 1);
    }

    const runArms = args.includes('--run-all') ? [...ARMS] : getAllFlags('--run-arm');
    if (runArms.length > 0) {
        const armResults = [];
        for (const arm of runArms) {
            const {telemetry} = await runCleanRoomArm({
                arm,
                harness    : harnessOpt || 'claude-code',
                model      : modelOpt   || 'sonnet',
                cmd        : getFlag('--cmd'),
                outDir,
                timeoutMs  : getFlag('--timeout-ms') ? Number(getFlag('--timeout-ms')) : 900000,
                appPort    : getFlag('--app-port')   ? Number(getFlag('--app-port'))   : undefined,
                nlPort     : getFlag('--nl-port')    ? Number(getFlag('--nl-port'))    : undefined,
                keepStage  : args.includes('--keep-stage'),
                installDeps: !args.includes('--no-install')
            });
            armResults.push(telemetry);
        }

        await writeComparisonReport(armResults, outDir);
        return;
    }

    const transcriptPairs = [
        ['arm-a-react-ag-grid-mcp', getFlag('--arm-a-transcript')],
        ['arm-b-neo-kb-only',       getFlag('--arm-b-transcript')],
        ['arm-c-neo-kb-neural-link', getFlag('--arm-c-transcript')]
    ].filter(([, file]) => Boolean(file));

    for (const spec of getAllFlags('--from-transcript')) {
        const eqIdx = spec.indexOf('=');
        if (eqIdx > 0) {
            transcriptPairs.push([spec.slice(0, eqIdx), spec.slice(eqIdx + 1)]);
        } else {
            transcriptPairs.push([getFlag('--arm') || 'arm-c-neo-kb-neural-link', spec]);
        }
    }

    if (transcriptPairs.length > 0) {
        const armResults = [];
        for (const [arm, file] of transcriptPairs) {
            const raw              = await fs.readFile(path.resolve(process.cwd(), file), 'utf8'),
                  defaultVerifyLog = path.join(outDir, `${arm}-verify-runs.jsonl`),
                  verificationRuns = await readVerificationRuns(defaultVerifyLog);

            armResults.push(parseTranscriptTelemetry(raw, {
                arm,
                harness: harnessOpt,
                model  : modelOpt,
                verificationRuns
            }));
        }

        await writeComparisonReport(armResults, outDir);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main();
}
