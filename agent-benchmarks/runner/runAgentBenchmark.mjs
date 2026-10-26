import {execFile}      from 'node:child_process';
import fs              from 'fs-extra';
import path            from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify}     from 'node:util';

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
 * @returns {String|null}
 */
export function resolveArmFrameworkVersion(arm) {
    try {
        const pkgPath = path.join(ROOT_DIR, 'agent-benchmarks/arms', arm, 'package.json');
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
 * @summary Unpacks `mcp__<server>__<tool>` tool names emitted by Claude Code and Codex MCP bridges.
 * @param {{serverName?: String, toolName?: String, input?: Object}} call
 * @returns {{server: String, tool: String, input: Object}}
 */
function normalizeToolCall({serverName = '', toolName = '', input = {}} = {}) {
    let server = String(serverName || '').toLowerCase(),
        tool   = String(toolName || '');

    if (tool.startsWith('mcp__')) {
        const parts = tool.slice(5).split('__');
        if (parts.length >= 2) {
            server = parts[0].toLowerCase();
            tool   = parts.slice(1).join('__');
        }
    }

    return {
        server,
        tool : tool.toLowerCase(),
        input: input && typeof input === 'object' ? input : {}
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
 * @returns {{harness: String|null, harnessVersion: String|null, model: String|null, timestamp: String|null, usage: {inputTokens: Number, outputTokens: Number, cachedTokens: Number}|null, toolCalls: Array<{serverName: String, toolName: String, input: Object}>, verificationRun: {timestamp: String|null, pass: Boolean}|null}}
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
            usage          : null,
            toolCalls      : [],
            verificationRun: {timestamp, pass: entry.pass}
        };
    }

    // 2. Claude Code JSONL (`message.usage` + `message.content` `tool_use` blocks)
    if (entry.message && typeof entry.message === 'object') {
        const msg   = entry.message,
              u     = msg.usage,
              usage = u ? {
                  inputTokens : Number(u.input_tokens || 0),
                  outputTokens: Number(u.output_tokens || 0),
                  cachedTokens: Number((u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0))
              } : null,
              content   = Array.isArray(msg.content) ? msg.content : [],
              toolCalls = content
                  .filter(block => block && block.type === 'tool_use')
                  .map(block => ({
                      serverName: '',
                      toolName  : block.name || '',
                      input     : block.input || {}
                  }));

        return {
            harness        : 'claude-code',
            harnessVersion : entry.version || null,
            model          : msg.model || null,
            timestamp,
            usage,
            toolCalls,
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
                toolCalls.push({
                    serverName: entry.item.server || '',
                    toolName  : entry.item.tool   || '',
                    input     : entry.item.arguments || {}
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
            toolCalls.push({
                serverName: '',
                toolName  : entry.payload.name || '',
                input     : parsedArgs
            });
        }

        return {
            harness        : 'codex',
            harnessVersion : entry.cli_version || entry.payload?.cli_version || entry.version || null,
            model          : entry.model || entry.payload?.model || null,
            timestamp,
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
          toolCalls = rawCalls.map(call => ({
              serverName: call.serverName || call.Arguments?.ServerName || '',
              toolName  : call.toolName   || call.Arguments?.ToolName   || call.name || '',
              input     : call.input      || call.Arguments             || {}
          }));

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
        cachedTokens       = 0;

    const collectedVerifications = [];

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
            inputTokens  += adapted.usage.inputTokens;
            outputTokens += adapted.usage.outputTokens;
            cachedTokens += adapted.usage.cachedTokens;
        }

        if (adapted.verificationRun) {
            collectedVerifications.push(adapted.verificationRun);
        }

        for (const call of adapted.toolCalls) {
            const bucket = classifyToolCall(call);
            toolCallsByServer[bucket]++;
        }
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
 * @summary Runs `verify.spec.mjs` against a running arm server, records pass/fail and duration,
 * and optionally appends a `benchmark_verification` record to `verifyLogPath`.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.url='http://localhost:8080']
 * @param {Number} [options.timeoutMs=15000]
 * @param {String|null} [options.verifyLogPath=null]
 * @returns {Promise<{type: 'benchmark_verification', timestamp: String, arm: String, pass: Boolean, durationMs: Number, output: String}>}
 */
export async function runArmVerification({arm, url = 'http://localhost:8080', timeoutMs = 15000, verifyLogPath = null}) {
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
                path.join(ROOT_DIR, 'agent-benchmarks/playwright.config.mjs'),
                path.join(ROOT_DIR, 'agent-benchmarks/tasks/grid-100k-multi-window/verify.spec.mjs')
            ],
            {
                cwd     : ROOT_DIR,
                encoding: 'utf8',
                env     : {
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
 * @summary CLI entrypoint for verifying an arm or aggregating transcript telemetry (`--from-transcript` / `--arm-{a,b,c}-transcript`) into JSON + Markdown reports.
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

        const report   = buildComparisonReport(armResults),
              markdown = formatComparisonMarkdown(report);

        await fs.ensureDir(outDir);
        const stamp    = report.generatedAt.replace(/[:.]/g, '-'),
              jsonPath = path.join(outDir, `agent-benchmark-${stamp}.json`),
              mdPath   = path.join(outDir, `agent-benchmark-${stamp}.md`);

        await fs.writeJson(jsonPath, report, {spaces: 2});
        await fs.writeFile(mdPath, markdown, 'utf8');
        console.log(markdown);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main();
}
