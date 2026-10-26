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
 * @summary Classifies a single agent tool call into one of the four benchmark telemetry buckets.
 * @param {Object} call
 * @param {String} [call.serverName]
 * @param {String} [call.toolName]
 * @returns {'docsKbQueries'|'neuralLinkRuntimeCalls'|'fileEdits'|'shellTestRuns'|'other'}
 */
export function classifyToolCall({serverName = '', toolName = ''} = {}) {
    const server = String(serverName).toLowerCase(),
          tool   = String(toolName).toLowerCase();

    if (server.includes('neural-link') || tool.includes('inspect_store') || tool.includes('get_component_tree') || tool.includes('get_window_topology') || tool.includes('get_dom_rect')) {
        return 'neuralLinkRuntimeCalls';
    }

    if (server.includes('ag-mcp') || server.includes('knowledge-base') || tool.includes('ask_knowledge_base') || tool.includes('query_documents') || tool.includes('search_docs') || tool.includes('get_example') || tool.includes('get_mcp_tool_handbook')) {
        return 'docsKbQueries';
    }

    if (tool.includes('write_file') || tool.includes('edit_file') || tool.includes('replace') || tool.includes('patch')) {
        return 'fileEdits';
    }

    if (tool.includes('run_command') || tool.includes('run_shell') || tool.includes('bash') || tool.includes('exec')) {
        return 'shellTestRuns';
    }

    return 'other';
}

/**
 * @summary Parses an agent JSONL transcript into structured benchmark telemetry for one arm.
 * @param {String} jsonlContent Raw JSONL transcript content.
 * @param {Object} [options]
 * @param {String} [options.arm='unknown']
 * @returns {{arm: String, pass: Boolean, timeToGreenMs: Number, totalTokens: {inputTokens: Number, outputTokens: Number, cachedTokens: Number, total: Number}, toolCallsByServer: {docsKbQueries: Number, neuralLinkRuntimeCalls: Number, fileEdits: Number, shellTestRuns: Number, other: Number}, verificationFailures: Number}}
 */
export function parseTranscriptTelemetry(jsonlContent = '', {arm = 'unknown'} = {}) {
    const lines = String(jsonlContent).split('\n').map(l => l.trim()).filter(Boolean);

    let firstTimestamp       = null,
        lastTimestamp        = null,
        pass                 = false,
        inputTokens          = 0,
        outputTokens         = 0,
        cachedTokens         = 0,
        verificationFailures = 0;

    const toolCallsByServer = {
        docsKbQueries         : 0,
        neuralLinkRuntimeCalls: 0,
        fileEdits             : 0,
        shellTestRuns         : 0,
        other                 : 0
    };

    for (const line of lines) {
        const entry = JSON.parse(line);
        const ts    = entry.timestamp || entry.created_at;

        if (ts) {
            const ms = Date.parse(ts);
            if (!Number.isNaN(ms)) {
                if (firstTimestamp === null || ms < firstTimestamp) firstTimestamp = ms;
                if (lastTimestamp === null || ms > lastTimestamp)   lastTimestamp  = ms;
            }
        }

        if (entry.usage) {
            inputTokens  += Number(entry.usage.inputTokens  || 0);
            outputTokens += Number(entry.usage.outputTokens || 0);
            cachedTokens += Number(entry.usage.cachedTokens || 0);
        }

        if (entry.verificationPassed === true) {
            pass = true;
        } else if (entry.verificationFailed === true) {
            verificationFailures++;
        }

        const calls = entry.toolCalls || entry.tool_calls || [];
        for (const call of calls) {
            const bucket = classifyToolCall({
                serverName: call.serverName || call.Arguments?.ServerName || '',
                toolName  : call.toolName   || call.Arguments?.ToolName   || call.name || ''
            });
            toolCallsByServer[bucket]++;
        }
    }

    const timeToGreenMs = firstTimestamp !== null && lastTimestamp !== null
        ? Math.max(0, lastTimestamp - firstTimestamp)
        : 0;

    return {
        arm,
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
 * @summary Runs `verify.spec.mjs` against a running arm server and records pass/fail and duration.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.url='http://localhost:8080']
 * @param {Number} [options.timeoutMs=15000]
 * @returns {Promise<{arm: String, pass: Boolean, durationMs: Number, output: String}>}
 */
export async function runArmVerification({arm, url = 'http://localhost:8080', timeoutMs = 15000}) {
    const start = Date.now();
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

        return {
            arm,
            pass      : true,
            durationMs: Date.now() - start,
            output    : [stdout, stderr].filter(Boolean).join('\n')
        };
    } catch (error) {
        return {
            arm,
            pass      : false,
            durationMs: Date.now() - start,
            output    : [error.stdout, error.stderr, error.message].filter(Boolean).join('\n')
        };
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
 * @summary Formats a 3-arm comparison report as a Markdown table.
 * @param {{generatedAt: String, task: String, arms: Array<Object>}} report
 * @returns {String}
 */
export function formatComparisonMarkdown(report) {
    const header = [
        `# 3-Arm Coding-Agent Benchmark Report — \`${report.task}\``,
        '',
        `Generated: \`${report.generatedAt}\``,
        '',
        '| Arm | Pass | Time to Green (ms) | Total Tokens | Docs/KB Queries | Neural Link Calls | File Edits | Shell/Test Runs | Verification Failures |',
        '|---|---|---|---|---|---|---|---|---|'
    ];

    const rows = (report.arms || []).map(entry => {
        const tc = entry.toolCallsByServer || {};
        return `| \`${entry.arm}\` | ${entry.pass ? 'PASS' : 'FAIL'} | ${entry.timeToGreenMs ?? 0} | ${entry.totalTokens?.total ?? 0} | ${tc.docsKbQueries ?? 0} | ${tc.neuralLinkRuntimeCalls ?? 0} | ${tc.fileEdits ?? 0} | ${tc.shellTestRuns ?? 0} | ${entry.verificationFailures ?? 0} |`;
    });

    return [...header, ...rows, ''].join('\n');
}

/**
 * @summary CLI entrypoint for verifying an arm or aggregating transcript telemetry into JSON + Markdown reports.
 */
async function main() {
    const args    = process.argv.slice(2),
          getFlag = name => {
              const idx = args.indexOf(name);
              return idx > -1 ? args[idx + 1] : null;
          },
          verifyArm = getFlag('--verify-arm'),
          url       = getFlag('--url') || 'http://localhost:8080',
          outDir    = path.resolve(ROOT_DIR, getFlag('--out-dir') || 'agent-benchmarks/results');

    if (verifyArm) {
        const result = await runArmVerification({arm: verifyArm, url});
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.pass ? 0 : 1);
    }

    const transcriptFlags = [
        ['arm-a-react-ag-grid-mcp', getFlag('--arm-a-transcript')],
        ['arm-b-neo-kb-only',       getFlag('--arm-b-transcript')],
        ['arm-c-neo-kb-neural-link', getFlag('--arm-c-transcript')]
    ].filter(([, file]) => Boolean(file));

    if (transcriptFlags.length > 0) {
        const armResults = [];
        for (const [arm, file] of transcriptFlags) {
            const raw = await fs.readFile(path.resolve(process.cwd(), file), 'utf8');
            armResults.push(parseTranscriptTelemetry(raw, {arm}));
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
