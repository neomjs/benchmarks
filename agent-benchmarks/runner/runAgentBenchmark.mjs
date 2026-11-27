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
 * @summary Returns the exact ordered list of MCP server names expected for a benchmark arm.
 * @param {String} arm
 * @returns {String[]}
 */
export function expectedArmMcpServers(arm) {
    if (arm === 'arm-a-react-ag-grid-mcp')  return ['ag-mcp'];
    if (arm === 'arm-b-neo-kb-only')        return [];
    if (arm === 'arm-c-neo-kb-neural-link') return ['neural-link'];
    throw new Error(`Unknown benchmark arm: ${arm}. Expected one of: ${ARMS.join(', ')}`);
}

/**
 * @summary Returns the canonical stdio MCP launch descriptors expected for a staged benchmark arm.
 * @param {String} arm
 * @param {Object} [options]
 * @param {Number|String|null} [options.nlPort=null]
 * @returns {Object<String, {type: String, command: String, args: String[], env: Object<String, String>}>}
 */
export function expectedArmMcpDescriptors(arm, {nlPort = null} = {}) {
    if (arm === 'arm-a-react-ag-grid-mcp') {
        return {
            'ag-mcp': {
                type   : 'stdio',
                command: 'npx',
                args   : ['-y', 'ag-mcp'],
                env    : {}
            }
        };
    }
    if (arm === 'arm-b-neo-kb-only') {
        return {};
    }
    if (arm === 'arm-c-neo-kb-neural-link') {
        return {
            'neural-link': {
                type   : 'stdio',
                command: 'npx',
                args   : ['-y', 'neo-neural-link'],
                env    : nlPort !== null && nlPort !== undefined ? {NEO_NL_PORT: String(nlPort)} : {}
            }
        };
    }
    throw new Error(`Unknown benchmark arm: ${arm}. Expected one of: ${ARMS.join(', ')}`);
}

/**
 * @summary Scrubs API keys, bearer/basic tokens, URL credentials, and secret env/JSON assignments from diagnostic text.
 * @param {String} [text='']
 * @returns {String}
 */
export function redactCredentials(text = '') {
    return String(text || '')
        .replace(/([a-z][a-z0-9+.-]*:\/\/)([^/\s:@]+:[^/\s@]+)@/gi, '$1[REDACTED]@')
        .replace(/("(?:[A-Za-z0-9_]*(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|token|authorization|credential))[A-Za-z0-9_]*"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
        .replace(/\b([A-Za-z0-9_]*(?:API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|CLIENT_SECRET|BRIDGE_TOKEN|SECRET|PASSWORD|CREDENTIAL|TOKEN|AUTH_TOKEN)[A-Za-z0-9_]*)\s*([:=])\s*("[^"]*"|'[^']*'|[^\s"',;]+)/gi, '$1$2[REDACTED]')
        .replace(/\b(Authorization\s*:\s*(?:Bearer|Basic)|Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi, '$1 [REDACTED]')
        .replace(/\b(?:sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{10,}|ya29\.[A-Za-z0-9._-]+|gh[pousr]_[A-Za-z0-9_]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g, '[REDACTED]');
}

/**
 * @summary Recursively scrubs credential material from every string field in a persisted transcript or diagnostic value.
 * @param {*} value
 * @returns {*}
 */
export function redactDiagnosticValue(value) {
    if (typeof value === 'string') {
        return redactCredentials(value);
    }
    if (Array.isArray(value)) {
        return value.map(item => redactDiagnosticValue(item));
    }
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (/^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|authorization|credential)$/i.test(k) && typeof v === 'string') {
                out[k] = '[REDACTED]';
            } else {
                out[k] = redactDiagnosticValue(v);
            }
        }
        return out;
    }
    return value;
}

/**
 * @summary Determines whether a parsed JSONL transcript entry represents an actual agent model/tool event
 * rather than pre-agent CLI bootstrap metadata or connection/authentication error envelopes.
 * @param {Object} entry
 * @returns {Boolean}
 */
export function isAgentTranscriptEvent(entry = {}) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return false;
    }
    if (entry.type === 'benchmark_verification' || entry.type === 'benchmark_launch_failure') {
        return false;
    }

    // Claude Code: `assistant` turn or non-error `result` with token usage (`system`/`user` are pre-agent)
    if (entry.message && typeof entry.message === 'object') {
        return entry.type === 'assistant';
    }
    if (entry.type === 'result' && !entry.stats) {
        const u = entry.usage;
        return !entry.is_error && Boolean(u && (Number(u.input_tokens || 0) + Number(u.output_tokens || 0)) > 0);
    }

    // Codex CLI: `thread.started`, `turn.started`, `session_meta`, `turn_context`, `error`, `turn.failed`,
    // and `item.*` with `item.type === 'error'` are pre-agent or error envelopes; started/updated/completed
    // non-error items prove the agent began executing work.
    if (
        entry.type === 'thread.started' ||
        entry.type === 'turn.started' ||
        entry.type === 'session_meta' ||
        entry.type === 'turn_context' ||
        entry.type === 'error' ||
        entry.type === 'turn.failed'
    ) {
        return false;
    }
    if (entry.type === 'turn.completed' || entry.type === 'response_item') {
        return true;
    }
    if (entry.type === 'event_msg') {
        return entry.payload?.type !== 'error';
    }
    if (entry.type === 'item.started' || entry.type === 'item.updated' || entry.type === 'item.completed') {
        return Boolean(entry.item && typeof entry.item === 'object' && entry.item.type !== 'error');
    }

    // Gemini CLI (`stream-json`): `init`, user `message`, and `error` are pre-agent; `tool_use`, `tool_result`,
    // assistant `message`, and successful `result` with `stats` are agent events.
    const hasGenericPayload = Boolean(
        entry.usage ||
        entry.toolCalls ||
        entry.tool_calls ||
        entry.verificationPassed !== undefined ||
        entry.verificationFailed !== undefined ||
        (entry.harness && entry.harness !== 'gemini')
    );
    if (!hasGenericPayload) {
        if (entry.type === 'init') return false;
        if (entry.type === 'tool_use' || entry.type === 'tool_result') return true;
        if (entry.type === 'message') return entry.role === 'assistant';
        if (entry.type === 'result' && entry.stats && typeof entry.stats === 'object') {
            return entry.status === 'success' || Number(entry.stats.output_tokens || 0) > 0;
        }
    }

    // Generic JSONL
    return Boolean(
        entry.usage ||
        (Array.isArray(entry.toolCalls) && entry.toolCalls.length > 0) ||
        (Array.isArray(entry.tool_calls) && entry.tool_calls.length > 0) ||
        entry.role === 'assistant' ||
        entry.verificationPassed !== undefined ||
        entry.verificationFailed !== undefined
    );
}

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
 * @summary Splits MCP-qualified tool names emitted by Claude Code / Codex (`mcp__<server>__<tool>`) and
 * Gemini CLI (`<server>_<tool>` / `mcp_<server>_<tool>`) into `{serverName, toolName}`.
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
    } else if (!server) {
        const geminiPrefixMatch = tool.match(/^(?:mcp_)?(ag[-_]mcp|neural[-_]link|knowledge[-_]base)_(.+)$/i);
        if (geminiPrefixMatch) {
            server = geminiPrefixMatch[1].toLowerCase().replaceAll('_', '-');
            tool   = geminiPrefixMatch[2];
        }
    }

    return {
        serverName: server,
        toolName  : tool
    };
}

/**
 * @summary Unpacks `mcp__<server>__<tool>` and `<server>_<tool>` tool names emitted by CLI MCP bridges.
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

    const targetPath = String(input.file_path || input.path || input.dir_path || input.url || input.pattern || '').toLowerCase();
    const isDocRead  = (
        tool === 'read' ||
        tool === 'read_file' ||
        tool === 'grep' ||
        tool === 'grep_search' ||
        tool === 'glob' ||
        tool === 'list_directory' ||
        tool === 'webfetch' ||
        tool === 'web_fetch'
    ) && (
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

    // 1. Runner-emitted verification or launch-failure log lines
    if (entry.type === 'benchmark_launch_failure') {
        return {
            harness        : entry.harness || null,
            harnessVersion : null,
            model          : null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [],
            verificationRun: null,
            launchFailure  : {
                exitCode     : entry.exitCode ?? null,
                signal       : entry.signal ?? null,
                sawAgentEvent: false,
                diagnostic   : redactCredentials(entry.diagnostic || '')
            }
        };
    }

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

    // 2b. Gemini CLI `stream-json` envelopes (`init`, `message`, `tool_use`, `tool_result`, `error`, and `result` with `stats`).
    // Guard against hijacking generic JSONL records (`type: 'message'` with `usage` / `toolCalls` / `verification*` / non-Gemini `harness`).
    const hasGenericPayload = Boolean(
        entry.usage ||
        entry.toolCalls ||
        entry.tool_calls ||
        entry.verificationPassed !== undefined ||
        entry.verificationFailed !== undefined ||
        (entry.harness && entry.harness !== 'gemini')
    );

    if (!hasGenericPayload && entry.type === 'init') {
        return {
            harness        : 'gemini',
            harnessVersion : entry.gemini_cli_version || entry.version || null,
            model          : entry.model || null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [],
            verificationRun: null
        };
    }

    if (!hasGenericPayload && entry.type === 'tool_use' && (entry.tool_name || entry.name)) {
        const {serverName, toolName} = splitMcpToolName('', entry.tool_name || entry.name || '');
        return {
            harness        : 'gemini',
            harnessVersion : entry.gemini_cli_version || entry.version || null,
            model          : entry.model || null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [{
                serverName,
                toolName,
                input: entry.parameters || entry.input || {}
            }],
            verificationRun: null
        };
    }

    if (
        !hasGenericPayload && (
            (entry.type === 'tool_result' && (entry.tool_id !== undefined || entry.status !== undefined)) ||
            (entry.type === 'error' && (entry.severity !== undefined || entry.status !== undefined || entry.error !== undefined)) ||
            (entry.type === 'message' && typeof entry.role === 'string' && typeof entry.content === 'string')
        )
    ) {
        const isExplicitGemini = entry.type !== 'message' || typeof entry.delta === 'boolean' || entry.harness === 'gemini';
        return {
            harness        : isExplicitGemini ? 'gemini' : null,
            harnessVersion : entry.gemini_cli_version || entry.version || null,
            model          : entry.model || null,
            timestamp,
            usageId        : null,
            usage          : null,
            toolCalls      : [],
            verificationRun: null
        };
    }

    if (!hasGenericPayload && entry.type === 'result' && entry.stats && typeof entry.stats === 'object') {
        const s              = entry.stats,
              cachedTokens   = Number(s.cached || 0),
              inputTokens    = typeof s.input === 'number'
                  ? Number(s.input)
                  : Math.max(0, Number(s.input_tokens || 0) - cachedTokens),
              outputTokens   = Number(s.output_tokens || 0),
              totalTokens    = typeof s.total_tokens === 'number'
                  ? Number(s.total_tokens)
                  : null,
              modelFromStats = s.models && typeof s.models === 'object'
                  ? Object.keys(s.models)[0] || null
                  : null;

        return {
            harness        : 'gemini',
            harnessVersion : entry.gemini_cli_version || entry.version || null,
            model          : entry.model || modelFromStats || null,
            timestamp,
            usageId        : null,
            usage          : null,
            fallbackUsage  : {
                inputTokens,
                outputTokens,
                cachedTokens,
                ...(totalTokens !== null ? {totalTokens} : {})
            },
            durationMs     : typeof s.duration_ms === 'number'
                ? s.duration_ms
                : (typeof entry.duration_ms === 'number' ? entry.duration_ms : null),
            toolCalls      : [],
            verificationRun: null
        };
    }

    // 2c. Claude Code `stream-json` non-message envelopes (`system`, `result`, `rate_limit_event`)
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

    // 3. Codex CLI JSONL (`thread.started`, `turn.started`, `turn.failed`, `session_meta`, `turn_context`, `item.*`, `turn.completed`, `event_msg`, `response_item`)
    if (
        entry.type === 'thread.started' ||
        entry.type === 'turn.started' ||
        entry.type === 'turn.failed' ||
        entry.type === 'session_meta' ||
        entry.type === 'turn_context' ||
        entry.type === 'item.started' ||
        entry.type === 'item.updated' ||
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
            const itemId = entry.item.id ? String(entry.item.id) : null;
            if (entry.item.type === 'mcp_tool_call') {
                const {serverName, toolName} = splitMcpToolName(entry.item.server || '', entry.item.tool || '');
                toolCalls.push({
                    ...(itemId ? {id: itemId} : {}),
                    serverName,
                    toolName,
                    input: entry.item.arguments || {}
                });
            } else if (entry.item.type === 'command_execution') {
                toolCalls.push({
                    ...(itemId ? {id: itemId} : {}),
                    serverName: '',
                    toolName  : 'command_execution',
                    input     : {command: entry.item.command || ''}
                });
            } else if (entry.item.type === 'file_change') {
                toolCalls.push({
                    ...(itemId ? {id: itemId} : {}),
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
                ...(entry.payload.call_id ? {id: String(entry.payload.call_id)} : {}),
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
              cachedTokens: Number(u.cachedTokens ?? u.cached_tokens ?? 0),
              ...(typeof (u.totalTokens ?? u.total_tokens) === 'number'
                  ? {totalTokens: Number(u.totalTokens ?? u.total_tokens)}
                  : {})
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
 * - Defines `timeToGreenMs` as elapsed milliseconds from the start of the transcript to the first passing verification (`null` when no verification passed or no start timestamp exists), and `sessionDurationMs` from harness session duration metadata when present.
 *
 * @param {String} jsonlContent Raw JSONL transcript content.
 * @param {Object} [options]
 * @param {String} [options.arm='unknown']
 * @param {String} [options.harness]
 * @param {String} [options.model]
 * @param {{harnessVersion?: String|null, frameworkVersion?: String|null}} [options.versions]
 * @param {Array<{timestamp?: String, pass: Boolean, durationMs?: Number}>} [options.verificationRuns=[]]
 * @returns {{arm: String, harness: String, model: String, versions: {harnessVersion: String|null, frameworkVersion: String|null}, pass: Boolean, timeToGreenMs: Number|null, sessionDurationMs: Number|null, totalTokens: {inputTokens: Number, outputTokens: Number, cachedTokens: Number, total: Number}, toolCallsByServer: {docsKbQueries: Number, neuralLinkRuntimeCalls: Number, fileEdits: Number, shellTestRuns: Number, other: Number}, verificationFailures: Number}}
 */
export function parseTranscriptTelemetry(jsonlContent = '', {
    arm              = 'unknown',
    harness          = null,
    model            = null,
    versions         = {},
    verificationRuns = []
} = {}) {
    const lines = String(jsonlContent).split('\n').map(l => l.trim()).filter(Boolean);

    let firstTimestamp      = null,
        detectedHarness     = harness,
        detectedHarnessVer  = versions.harnessVersion || null,
        detectedModel       = model,
        inputTokens          = 0,
        outputTokens         = 0,
        cachedTokens         = 0,
        perMsgEffectiveTotal = 0,
        hasPerMsgTotal       = false,
        sawPerMessageUsage   = false,
        fallbackUsage        = null,
        fallbackDurationMs   = null,
        recordedLaunchFail   = null;

    const collectedVerifications = [],
          seenUsageIds           = new Set(),
          seenToolCallIds        = new Set();

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
                if (typeof adapted.usage.totalTokens === 'number') {
                    perMsgEffectiveTotal += adapted.usage.totalTokens;
                    hasPerMsgTotal = true;
                } else {
                    perMsgEffectiveTotal += adapted.usage.inputTokens + adapted.usage.outputTokens;
                }
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
        if (adapted.launchFailure) {
            recordedLaunchFail = adapted.launchFailure;
        }

        for (const call of adapted.toolCalls) {
            if (call.id) {
                if (seenToolCallIds.has(call.id)) continue;
                seenToolCallIds.add(call.id);
            }
            const bucket = classifyToolCall(call);
            toolCallsByServer[bucket]++;
        }
    }

    let reportedTotalTokens = sawPerMessageUsage && hasPerMsgTotal ? perMsgEffectiveTotal : null;
    if (!sawPerMessageUsage && fallbackUsage) {
        inputTokens  = fallbackUsage.inputTokens;
        outputTokens = fallbackUsage.outputTokens;
        cachedTokens = fallbackUsage.cachedTokens;
        if (typeof fallbackUsage.totalTokens === 'number') {
            reportedTotalTokens = fallbackUsage.totalTokens;
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

    const sessionDurationMs = typeof fallbackDurationMs === 'number'
        ? Math.max(0, fallbackDurationMs)
        : null;

    const parsedResult = {
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
        sessionDurationMs,
        totalTokens: {
            inputTokens,
            outputTokens,
            cachedTokens,
            total: reportedTotalTokens !== null ? reportedTotalTokens : (inputTokens + outputTokens)
        },
        toolCallsByServer,
        verificationFailures
    };

    if (recordedLaunchFail) {
        parsedResult.runOutcome    = 'launch_failure';
        parsedResult.launchFailure = recordedLaunchFail;
    }

    return parsedResult;
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
            key.startsWith('GEMINI_CLI_') ||
            key.startsWith('SANDBOX_') ||
            key === 'GEMINI_SANDBOX_PROXY_COMMAND' ||
            key === 'SEATBELT_PROFILE' ||
            key === 'BUILD_SANDBOX' ||
            key === 'CLAUDECODE' ||
            key === 'CLAUDE_CODE_ENTRYPOINT' ||
            key === 'CLAUDE_CONFIG_DIR' ||
            key === 'CODEX_HOME'
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
 * @summary Copies only the selected harness's authentication files into a staged clean-room home directory.
 * Standalone discovery (`stageAuth: false`) and other harnesses never copy foreign credentials.
 * @param {Object} staged Result from `stageArmWorkspace`.
 * @param {Object} [options]
 * @param {String|null} [options.harness=null]
 * @param {Object} [options.baseEnv=process.env]
 * @returns {Promise<void>}
 */
export async function stageHarnessCredentials(staged, {harness = null, baseEnv = process.env} = {}) {
    if (!staged) return;
    const effectiveHostHome = baseEnv?.HOME || process.env.HOME || os.homedir();

    if (harness === 'codex' && staged.codexHomeDir) {
        const hostCodexDir      = baseEnv?.CODEX_HOME
            ? path.resolve(baseEnv.CODEX_HOME)
            : path.join(effectiveHostHome, '.codex');
        const hostCodexAuthPath = path.join(hostCodexDir, 'auth.json');
        if (await fs.pathExists(hostCodexAuthPath)) {
            const destCodexAuthPath = path.join(staged.codexHomeDir, 'auth.json');
            await fs.copy(hostCodexAuthPath, destCodexAuthPath);
            await fs.chmod(destCodexAuthPath, 0o600).catch(() => {});
        }
        return;
    }

    if (harness === 'gemini' && staged.geminiHomeDir) {
        const hostGeminiDir    = path.join(effectiveHostHome, '.gemini'),
              geminiHomeDotDir = path.join(staged.geminiHomeDir, '.gemini'),
              hostSettingsPath = path.join(hostGeminiDir, 'settings.json');
        await fs.ensureDir(geminiHomeDotDir);

        let preservedAuth = null;
        if (await fs.pathExists(hostSettingsPath)) {
            try {
                const hostSettings = await fs.readJson(hostSettingsPath);
                if (hostSettings?.security?.auth) {
                    preservedAuth = hostSettings.security.auth;
                }
            } catch {}
        }

        for (const authFile of ['oauth_creds.json', 'google_accounts.json', 'installation_id', 'state.json']) {
            const srcAuth = path.join(hostGeminiDir, authFile);
            if (await fs.pathExists(srcAuth)) {
                const destAuth = path.join(geminiHomeDotDir, authFile);
                await fs.copy(srcAuth, destAuth);
                await fs.chmod(destAuth, 0o600).catch(() => {});
            }
        }

        await fs.writeJson(
            path.join(geminiHomeDotDir, 'settings.json'),
            preservedAuth ? {security: {auth: preservedAuth}} : {},
            {spaces: 4}
        );
    }
}

/**
 * @summary Removes any staged authentication files from a clean-room workspace so retained (`--keep-stage`) stages never hold credentials.
 * @param {Object} staged Result from `stageArmWorkspace`.
 * @returns {Promise<void>}
 */
export async function cleanupStagedCredentials(staged) {
    if (!staged) return;
    if (staged.codexHomeDir) {
        await fs.remove(path.join(staged.codexHomeDir, 'auth.json')).catch(() => {});
    }
    if (staged.geminiHomeDir) {
        const geminiHomeDotDir = path.join(staged.geminiHomeDir, '.gemini');
        for (const authFile of ['oauth_creds.json', 'google_accounts.json', 'installation_id', 'state.json']) {
            await fs.remove(path.join(geminiHomeDotDir, authFile)).catch(() => {});
        }
        const stagedGeminiSettings = path.join(geminiHomeDotDir, 'settings.json');
        if (await fs.pathExists(stagedGeminiSettings)) {
            await fs.writeJson(stagedGeminiSettings, {}, {spaces: 4}).catch(() => {});
        }
    }
}

/**
 * @summary Stages an isolated clean-room copy of an arm workspace with collision-free dev and Neural Link ports.
 * Keeps discovery credential-free by default (`stageAuth = false`) and stages credentials only for the selected harness when requested.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.stageRoot]
 * @param {Number} [options.appPort]
 * @param {Number} [options.nlPort]
 * @param {Boolean} [options.installDeps=true]
 * @param {String} [options.rootDir=ROOT_DIR]
 * @param {Object} [options.baseEnv=process.env]
 * @param {String|null} [options.harness=null]
 * @param {Boolean} [options.stageAuth=false]
 * @returns {Promise<{stageRoot: String, armDir: String, appPort: Number, nlPort: Number|null, appUrl: String, verifyLogPath: String}>}
 */
export async function stageArmWorkspace({
    arm,
    stageRoot,
    appPort,
    nlPort,
    installDeps = true,
    rootDir     = ROOT_DIR,
    baseEnv     = process.env,
    harness     = null,
    stageAuth   = false
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
            'server-start:headless': `node ./node_modules/neo.mjs/buildScripts/util/fileServer.mjs --no-open --port ${resolvedAppPort}`
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

        const geminiSettingsPath = path.join(armDir, '.gemini/settings.json');
        if (await fs.pathExists(geminiSettingsPath)) {
            const geminiSettings = await fs.readJson(geminiSettingsPath);
            if (geminiSettings.mcpServers?.['neural-link']) {
                geminiSettings.mcpServers['neural-link'].env = {
                    ...(geminiSettings.mcpServers['neural-link'].env || {}),
                    NEO_NL_PORT: String(resolvedNlPort)
                };
                await fs.writeJson(geminiSettingsPath, geminiSettings, {spaces: 4});
            }
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

    // Isolate Gemini CLI and Codex CLI (`CODEX_HOME`) configuration inside `stageRoot` without copying host credentials by default.
    const geminiIsolationDir       = path.join(resolvedStageRoot, '.gemini-isolation'),
          geminiHomeDir            = path.join(geminiIsolationDir, 'home'),
          geminiHomeDotDir         = path.join(geminiHomeDir, '.gemini'),
          geminiSystemDefaultsPath = path.join(geminiIsolationDir, 'system-defaults.json'),
          geminiSystemSettingsPath = path.join(geminiIsolationDir, 'system-settings.json'),
          geminiTrustedFoldersPath = path.join(geminiIsolationDir, 'trustedFolders.json');

    await fs.ensureDir(geminiHomeDotDir);
    await fs.writeJson(path.join(geminiHomeDotDir, 'settings.json'), {}, {spaces: 4});
    await fs.writeJson(geminiSystemDefaultsPath, {}, {spaces: 4});
    await fs.writeJson(geminiSystemSettingsPath, {mcpServers: {}}, {spaces: 4});
    const realArmDir     = await fs.realpath(armDir),
          resolvedArmDir = path.resolve(armDir),
          trustedFolders = {
              [realArmDir]    : 'TRUST_FOLDER',
              [resolvedArmDir]: 'TRUST_FOLDER'
          };
    await fs.writeJson(geminiTrustedFoldersPath, trustedFolders, {spaces: 4});
    await fs.writeJson(path.join(geminiHomeDotDir, 'trustedFolders.json'), trustedFolders, {spaces: 4});

    const codexIsolationDir = path.join(resolvedStageRoot, '.codex-isolation'),
          codexHomeDir      = path.join(codexIsolationDir, 'codex-home');

    await fs.ensureDir(codexHomeDir);
    const codexTrustedPaths = Array.from(new Set([realArmDir, resolvedArmDir])),
          codexConfigLines  = [
              '# Auto-generated clean-room Codex user config (trusts only this staged benchmark arm)',
              ...codexTrustedPaths.flatMap(trustedPath => [
                  `[projects.${JSON.stringify(trustedPath)}]`,
                  'trust_level = "trusted"',
                  ''
              ])
          ];
    await fs.writeFile(path.join(codexHomeDir, 'config.toml'), codexConfigLines.join('\n'), 'utf8');

    const appUrl        = arm === 'arm-a-react-ag-grid-mcp'
              ? `http://localhost:${resolvedAppPort}`
              : `http://localhost:${resolvedAppPort}/apps/gridbench/index.html`,
          verifyLogPath = path.join(resolvedStageRoot, 'agent-benchmarks/results', `${arm}-verify-runs.jsonl`);

    const stagedResult = {
        stageRoot: resolvedStageRoot,
        armDir,
        appPort  : resolvedAppPort,
        nlPort   : resolvedNlPort,
        appUrl,
        verifyLogPath,
        geminiIsolationDir,
        geminiHomeDir,
        geminiSystemDefaultsPath,
        geminiSystemSettingsPath,
        geminiTrustedFoldersPath,
        codexIsolationDir,
        codexHomeDir
    };

    if (stageAuth && harness) {
        await stageHarnessCredentials(stagedResult, {harness, baseEnv});
    }

    return stagedResult;
}

/**
 * @summary Builds the clean-room child process environment for a staged arm workspace, injecting isolated ports,
 * Gemini CLI and Codex CLI (`CODEX_HOME`) config paths, and container `--sandbox` forwarding while stripping host passthrough.
 * @param {Object} staged Result from `stageArmWorkspace`.
 * @param {Object} [baseEnv=process.env]
 * @returns {Object}
 */
export function buildCleanRoomChildEnv(staged, baseEnv = process.env) {
    const isolationDir = staged.geminiIsolationDir || (staged.geminiHomeDir ? path.dirname(staged.geminiHomeDir) : ''),
          sandboxEnv   = [
              `PORT=${staged.appPort}`,
              ...(staged.nlPort ? [`NEO_NL_PORT=${staged.nlPort}`] : []),
              ...(staged.geminiHomeDir ? [`GEMINI_CLI_HOME=${staged.geminiHomeDir}`] : []),
              ...(staged.geminiSystemDefaultsPath ? [`GEMINI_CLI_SYSTEM_DEFAULTS_PATH=${staged.geminiSystemDefaultsPath}`] : []),
              ...(staged.geminiSystemSettingsPath ? [`GEMINI_CLI_SYSTEM_SETTINGS_PATH=${staged.geminiSystemSettingsPath}`] : []),
              ...(staged.geminiTrustedFoldersPath ? [`GEMINI_CLI_TRUSTED_FOLDERS_PATH=${staged.geminiTrustedFoldersPath}`] : []),
              ...(staged.codexHomeDir ? [`CODEX_HOME=${staged.codexHomeDir}`] : [])
          ];

    return sanitizeCleanRoomEnv(baseEnv, {
        PORT                           : String(staged.appPort),
        ...(staged.nlPort ? {NEO_NL_PORT: String(staged.nlPort)} : {}),
        ...(staged.geminiHomeDir ? {GEMINI_CLI_HOME: staged.geminiHomeDir} : {}),
        ...(staged.geminiSystemDefaultsPath ? {GEMINI_CLI_SYSTEM_DEFAULTS_PATH: staged.geminiSystemDefaultsPath} : {}),
        ...(staged.geminiSystemSettingsPath ? {GEMINI_CLI_SYSTEM_SETTINGS_PATH: staged.geminiSystemSettingsPath} : {}),
        ...(staged.geminiTrustedFoldersPath ? {GEMINI_CLI_TRUSTED_FOLDERS_PATH: staged.geminiTrustedFoldersPath} : {}),
        ...(staged.codexHomeDir ? {CODEX_HOME: staged.codexHomeDir} : {}),
        ...(isolationDir ? {SANDBOX_MOUNTS: `${isolationDir}:${isolationDir}:rw`} : {}),
        SANDBOX_ENV                    : sandboxEnv.join(',')
    });
}

/**
 * @summary Runs `codex mcp list --json` inside the staged arm workspace without model calls and verifies
 * that the discovered MCP server list and Arm C's staged `NEO_NL_PORT` match the arm's exact contract.
 * Throws a `BENCHMARK_MCP_PREFLIGHT_FAILED` error naming `arm`, `expected`, and `observed` on any mismatch.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} options.armDir
 * @param {Number|String|null} [options.nlPort=null]
 * @param {Object} [options.env=process.env]
 * @param {String} [options.codexBin='codex']
 * @param {Number} [options.timeoutMs=15000]
 * @returns {Promise<{ok: Boolean, arm: String, expected: String[], observed: String[], nlPort: String|null, servers: Object[]}>}
 */
export async function verifyCodexMcpPreflight({
    arm,
    armDir,
    nlPort    = null,
    env       = process.env,
    codexBin  = 'codex',
    timeoutMs = 15000
}) {
    const expected            = expectedArmMcpServers(arm),
          expectedDescriptors = expectedArmMcpDescriptors(arm, {nlPort});
    let stdout = '';

    try {
        const res = await execFileAsync(codexBin, ['mcp', 'list', '--json'], {
            cwd      : armDir,
            env,
            encoding : 'utf8',
            timeout  : timeoutMs,
            maxBuffer: 10 * 1024 * 1024
        });
        stdout = res.stdout || '';
    } catch (err) {
        const detail  = redactCredentials([err.stderr, err.stdout, err.message].filter(Boolean).join(' | ').trim()),
              failure = new Error(`Codex MCP preflight failed to execute for ${arm} (expected [${expected.join(', ')}]): ${detail}`);
        failure.code     = 'BENCHMARK_MCP_PREFLIGHT_FAILED';
        failure.arm      = arm;
        failure.expected = expected;
        failure.observed = [];
        throw failure;
    }

    let parsed;
    try {
        parsed = JSON.parse(stdout);
    } catch (err) {
        const failure = new Error(`Codex MCP preflight returned invalid JSON for ${arm} (expected [${expected.join(', ')}]): ${redactCredentials(stdout.slice(0, 300))}`);
        failure.code     = 'BENCHMARK_MCP_PREFLIGHT_FAILED';
        failure.arm      = arm;
        failure.expected = expected;
        failure.observed = [];
        throw failure;
    }

    if (!Array.isArray(parsed)) {
        const failure = new Error(`Codex MCP preflight returned non-array payload for ${arm} (expected [${expected.join(', ')}])`);
        failure.code     = 'BENCHMARK_MCP_PREFLIGHT_FAILED';
        failure.arm      = arm;
        failure.expected = expected;
        failure.observed = [];
        throw failure;
    }

    const enabledEntries = parsed.filter(entry => entry && typeof entry === 'object' && entry.enabled !== false),
          observed       = enabledEntries.map(entry => String(entry.name || '')),
          sortedExpected = [...expected].sort(),
          sortedObserved = [...observed].sort(),
          namesMatch     = sortedExpected.length === sortedObserved.length &&
              sortedExpected.every((name, idx) => name === sortedObserved[idx]);

    if (!namesMatch) {
        const failure = new Error(
            `Codex MCP preflight mismatch for ${arm}: expected [${expected.join(', ')}], observed [${observed.join(', ')}]`
        );
        failure.code     = 'BENCHMARK_MCP_PREFLIGHT_FAILED';
        failure.arm      = arm;
        failure.expected = expected;
        failure.observed = observed;
        throw failure;
    }

    const realArmDir     = await fs.realpath(armDir).catch(() => path.resolve(armDir)),
          resolvedArmDir = path.resolve(armDir);
    let observedNlPort = null;

    for (const [serverName, spec] of Object.entries(expectedDescriptors)) {
        const entry       = enabledEntries.find(item => item.name === serverName),
              transport   = entry?.transport || {},
              observedEnv = transport.env && typeof transport.env === 'object' && !Array.isArray(transport.env) ? transport.env : {},
              typeOk      = !transport.type || transport.type === spec.type,
              cmdOk       = transport.command === spec.command,
              argsOk      = Array.isArray(transport.args) &&
                  transport.args.length === spec.args.length &&
                  transport.args.every((arg, idx) => arg === spec.args[idx]),
              envVarsOk   = !Array.isArray(transport.env_vars) || transport.env_vars.length === 0;

        let cwdOk = transport.cwd === null || transport.cwd === undefined;
        if (!cwdOk && typeof transport.cwd === 'string') {
            const realTransportCwd = await fs.realpath(transport.cwd).catch(() => path.resolve(transport.cwd));
            cwdOk = path.resolve(transport.cwd) === resolvedArmDir || realTransportCwd === realArmDir;
        }

        let envOk = false;
        if (serverName === 'neural-link') {
            observedNlPort = observedEnv.NEO_NL_PORT !== undefined ? String(observedEnv.NEO_NL_PORT) : null;
            const envKeys = Object.keys(observedEnv);
            envOk = envKeys.length === 1 &&
                envKeys[0] === 'NEO_NL_PORT' &&
                (nlPort !== null && nlPort !== undefined
                    ? observedNlPort === String(nlPort)
                    : /^\d+$/.test(String(observedNlPort || '')));
        } else {
            envOk = Object.keys(observedEnv).length === 0;
        }

        if (!typeOk || !cmdOk || !argsOk || !cwdOk || !envVarsOk || !envOk) {
            const failure = new Error(
                `Codex MCP preflight descriptor mismatch for ${arm} (${serverName}): expected type=${JSON.stringify(spec.type)} command=${JSON.stringify(spec.command)} args=${JSON.stringify(spec.args)} env=${JSON.stringify(spec.env)}, observed type=${JSON.stringify(transport.type ?? null)} command=${JSON.stringify(transport.command)} args=${JSON.stringify(transport.args)} env=${redactCredentials(JSON.stringify(observedEnv))} cwd=${redactCredentials(JSON.stringify(transport.cwd ?? null))}`
            );
            failure.code     = 'BENCHMARK_MCP_PREFLIGHT_FAILED';
            failure.arm      = arm;
            failure.expected = expected;
            failure.observed = observed;
            throw failure;
        }
    }

    return {
        ok      : true,
        arm,
        expected,
        observed,
        nlPort  : observedNlPort,
        servers : enabledEntries
    };
}

/**
 * @summary Simulates the container inner-CLI environment and mounted host paths constructed by Gemini CLI v0.38.1
 * `packages/cli/src/utils/sandbox.ts` (`start_sandbox`) so tests can verify what the inner `gemini` process sees under `--sandbox`.
 * @param {Object} options
 * @param {String} options.workdir
 * @param {Object} [options.hostEnv={}]
 * @param {Boolean} [options.useCurrentUser=false]
 * @returns {{innerEnv: Object, mountedPathMap: Array<{from: String, to: String}>, resolveMountedHostPath: (containerPath: String) => String|null}}
 */
export function resolveGeminiSandboxInnerEnv({
    workdir,
    hostEnv        = {},
    useCurrentUser = false
}) {
    const resolvedWorkdir  = path.resolve(workdir),
          userHomeOnHost   = path.resolve(hostEnv.GEMINI_CLI_HOME || hostEnv.HOME || os.homedir()),
          userGeminiOnHost = path.join(userHomeOnHost, '.gemini'),
          tmpDirOnHost     = path.resolve(os.tmpdir()),
          mountedPathMap   = [
              {from: resolvedWorkdir, to: resolvedWorkdir},
              {from: userGeminiOnHost, to: '/home/node/.gemini'},
              ...(userGeminiOnHost !== '/home/node/.gemini' ? [{from: userGeminiOnHost, to: userGeminiOnHost}] : []),
              {from: tmpDirOnHost, to: tmpDirOnHost},
              ...(userHomeOnHost !== path.resolve(os.homedir()) ? [{from: userHomeOnHost, to: userHomeOnHost}] : [])
          ];

    if (hostEnv.SANDBOX_MOUNTS) {
        for (const rawMount of String(hostEnv.SANDBOX_MOUNTS).split(',')) {
            const trimmed = rawMount.trim();
            if (!trimmed) continue;
            const [from, to] = trimmed.split(':');
            if (from) {
                mountedPathMap.push({from: path.resolve(from), to: path.resolve(to || from)});
            }
        }
    }

    const innerEnv = {
        HOME   : useCurrentUser ? userHomeOnHost : '/home/node',
        SANDBOX: 'gemini-cli-sandbox-0'
    };

    for (const passthroughKey of [
        'GEMINI_CLI_TEST_VAR',
        'GEMINI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_GEMINI_BASE_URL',
        'GOOGLE_VERTEX_BASE_URL',
        'GOOGLE_GENAI_USE_VERTEXAI',
        'GOOGLE_CLOUD_PROJECT',
        'GOOGLE_CLOUD_LOCATION',
        'GEMINI_MODEL',
        'TERM',
        'COLORTERM',
        'GEMINI_CLI_IDE_SERVER_PORT',
        'GEMINI_CLI_IDE_WORKSPACE_PATH',
        'TERM_PROGRAM'
    ]) {
        if (hostEnv[passthroughKey]) {
            innerEnv[passthroughKey] = String(hostEnv[passthroughKey]);
        }
    }

    if (hostEnv.SANDBOX_ENV) {
        for (const rawPair of String(hostEnv.SANDBOX_ENV).split(',')) {
            const pair = rawPair.trim();
            if (!pair) continue;
            const eqIdx = pair.indexOf('=');
            if (eqIdx <= 0) {
                throw new Error('SANDBOX_ENV must be a comma-separated list of key=value pairs');
            }
            innerEnv[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
        }
    }

    if (useCurrentUser) {
        innerEnv.HOME = userHomeOnHost;
    }

    const resolveMountedHostPath = containerPath => {
        if (!containerPath) return null;
        const resolved = path.resolve(containerPath);
        // Later volume mounts win if paths overlap, matching Docker/Podman mount precedence
        for (let i = mountedPathMap.length - 1; i >= 0; i--) {
            const {from, to} = mountedPathMap[i];
            if (resolved === to || resolved.startsWith(to + path.sep)) {
                return path.join(from, path.relative(to, resolved));
            }
        }
        return null;
    };

    return {innerEnv, mountedPathMap, resolveMountedHostPath};
}

/**
 * @summary Deep-merges plain objects following Gemini CLI v0.38.1 `settings.ts` scope precedence (`systemDefaults < user < workspace < system`),
 * shallow-merging `mcpServers` per server name (`MergeStrategy.SHALLOW_MERGE`), replacing arrays/primitives, and discarding file-based `admin`
 * settings in `computeMergedSettings` (`settings.ts#L365-L388`).
 * @param {Object[]} scopes
 * @param {Object} [remoteAdminSettings]
 * @returns {Object}
 */
function mergeGeminiSettingsScopes(scopes, remoteAdminSettings = undefined) {
    const mergePair = (target, source, depth = 0) => {
        if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
        const out = {...target};
        for (const [key, val] of Object.entries(source)) {
            if (depth === 0 && key === 'mcpServers' && val && typeof val === 'object' && !Array.isArray(val)) {
                out.mcpServers = {
                    ...(out.mcpServers && typeof out.mcpServers === 'object' ? out.mcpServers : {}),
                    ...val
                };
            } else if (val && typeof val === 'object' && !Array.isArray(val) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
                out[key] = mergePair(out[key], val, depth + 1);
            } else if (val !== undefined) {
                out[key] = Array.isArray(val) ? [...val] : (val && typeof val === 'object' ? mergePair({}, val, depth + 1) : val);
            }
        }
        return out;
    };
    const merged = scopes.reduce((acc, scope) => mergePair(acc, scope, 0), {});

    // Gemini CLI v0.38.1 `LoadedSettings#computeMergedSettings` ignores all file-based `admin` settings and resets
    // `merged.admin` to schema defaults (`mcp.enabled: true`) overridden only by `_remoteAdminSettings?.admin`.
    const adminDefaults = {
        secureModeEnabled: false,
        extensions       : {enabled: true},
        mcp              : {enabled: true},
        skills           : {enabled: true}
    };
    merged.admin = mergePair(adminDefaults, remoteAdminSettings?.admin || {}, 1);
    return merged;
}

/**
 * @summary Evaluates the effective MCP server map Gemini CLI v0.38.1 constructs after merging `systemDefaults`, `user`,
 * trusted `workspace`, and `system` settings (discarding file-based `admin` settings per `settings.ts#L365-L388`) plus
 * `--allowed-mcp-server-names` / `mcp.allowed` / `mcp.excluded` filtering, either directly or inside the `--sandbox` container (`sandbox.ts`).
 * @param {Object} options
 * @param {String} options.armDir
 * @param {Object} [options.env=process.env]
 * @param {String[]} [options.cliArgs=[]]
 * @param {String} [options.defaultSystemSettingsPath]
 * @param {Boolean} [options.sandbox=false]
 * @param {Boolean} [options.useCurrentUser=false]
 * @param {String} [options.containerDefaultSystemSettingsPath='']
 * @param {Object} [options.remoteAdminSettings]
 * @returns {Promise<{mergedSettings: Object, mcpEnabled: Boolean, effectiveMcpServers: Object, effectiveEnv: Object}>}
 */
export async function resolveEffectiveGeminiMcpConfig({
    armDir,
    env                                = process.env,
    cliArgs                            = [],
    defaultSystemSettingsPath          = '',
    sandbox                            = false,
    useCurrentUser                     = false,
    containerDefaultSystemSettingsPath = '',
    remoteAdminSettings                = undefined
}) {
    const sandboxCtx   = sandbox ? resolveGeminiSandboxInnerEnv({workdir: armDir, hostEnv: env, useCurrentUser}) : null,
          effectiveEnv = sandboxCtx ? sandboxCtx.innerEnv : env;

    const readConfigJson = async (targetPath, {containerImageFallbackPath = ''} = {}) => {
        if (!targetPath) {
            if (containerImageFallbackPath && await fs.pathExists(containerImageFallbackPath)) {
                return fs.readJson(containerImageFallbackPath);
            }
            return {};
        }
        if (sandboxCtx) {
            const mappedHostPath = sandboxCtx.resolveMountedHostPath(targetPath);
            if (mappedHostPath && await fs.pathExists(mappedHostPath)) {
                return fs.readJson(mappedHostPath);
            }
            if (containerImageFallbackPath && await fs.pathExists(containerImageFallbackPath)) {
                return fs.readJson(containerImageFallbackPath);
            }
            return {};
        }
        return (await fs.pathExists(targetPath)) ? fs.readJson(targetPath) : {};
    };

    const effectiveHome       = effectiveEnv.GEMINI_CLI_HOME || effectiveEnv.HOME || os.homedir(),
          userSettingsPath    = path.join(effectiveHome, '.gemini', 'settings.json'),
          systemSettingsPath  = effectiveEnv.GEMINI_CLI_SYSTEM_SETTINGS_PATH || (sandbox ? '' : defaultSystemSettingsPath),
          systemDefaultsPath  = effectiveEnv.GEMINI_CLI_SYSTEM_DEFAULTS_PATH || (systemSettingsPath ? path.join(path.dirname(systemSettingsPath), 'system-defaults.json') : ''),
          trustedFoldersPath  = effectiveEnv.GEMINI_CLI_TRUSTED_FOLDERS_PATH || path.join(effectiveHome, '.gemini', 'trustedFolders.json'),
          workspaceConfigPath = path.join(armDir, '.gemini', 'settings.json');

    const [systemDefaults, userSettings, rawWorkspaceSettings, systemSettings, trustedFolders] = await Promise.all([
        readConfigJson(systemDefaultsPath),
        readConfigJson(userSettingsPath),
        readConfigJson(workspaceConfigPath),
        readConfigJson(systemSettingsPath, {containerImageFallbackPath: sandbox ? containerDefaultSystemSettingsPath : ''}),
        readConfigJson(trustedFoldersPath)
    ]);

    const realArmDir         = await fs.realpath(armDir).catch(() => path.resolve(armDir)),
          resolvedArmDir     = path.resolve(armDir),
          folderTrustEnabled = systemSettings?.security?.folderTrust?.enabled ?? userSettings?.security?.folderTrust?.enabled ?? false,
          isTrusted          = !folderTrustEnabled ||
              trustedFolders[realArmDir] === 'TRUST_FOLDER' ||
              trustedFolders[resolvedArmDir] === 'TRUST_FOLDER' ||
              trustedFolders[armDir] === 'TRUST_FOLDER',
          workspaceSettings  = isTrusted ? rawWorkspaceSettings : {};

    const mergedSettings = mergeGeminiSettingsScopes([systemDefaults, userSettings, workspaceSettings, systemSettings], remoteAdminSettings),
          mcpEnabled     = mergedSettings.admin?.mcp?.enabled ?? true;

    let cliAllowed = null;
    for (let i = 0; i < cliArgs.length; i++) {
        if (cliArgs[i] === '--allowed-mcp-server-names') {
            cliAllowed = cliAllowed || [];
            if (i + 1 < cliArgs.length && !cliArgs[i + 1].startsWith('-')) {
                cliAllowed.push(...cliArgs[i + 1].split(',').map(s => s.trim()).filter(Boolean));
                i++;
            }
        } else if (cliArgs[i].startsWith('--allowed-mcp-server-names=')) {
            cliAllowed = cliAllowed || [];
            cliAllowed.push(...cliArgs[i].slice('--allowed-mcp-server-names='.length).split(',').map(s => s.trim()).filter(Boolean));
        }
    }

    const rawServers   = mcpEnabled ? (mergedSettings.mcpServers || {}) : {},
          allowedNames = mcpEnabled ? (cliAllowed ?? mergedSettings.mcp?.allowed) : undefined,
          blockedNames = mcpEnabled ? (cliAllowed ? undefined : mergedSettings.mcp?.excluded) : undefined;

    const effectiveMcpServers = {};
    for (const [name, cfg] of Object.entries(rawServers)) {
        if (Array.isArray(allowedNames) && allowedNames.length > 0 && !allowedNames.includes(name)) continue;
        if (Array.isArray(blockedNames) && allowedNames !== cliAllowed && blockedNames.length > 0 && blockedNames.includes(name)) continue;
        effectiveMcpServers[name] = cfg;
    }

    return {mergedSettings, mcpEnabled, effectiveMcpServers, effectiveEnv};
}

/**
 * @summary Terminates any remaining local TCP listener on `port` and waits until the port is free.
 * @param {Number} port
 * @param {Number} [timeoutMs=3000]
 * @returns {Promise<void>}
 */
async function terminatePortListeners(port, timeoutMs = 3000) {
    const num = Number(port);
    if (!Number.isInteger(num) || num <= 0 || !(await isPortListening(num))) {
        return;
    }

    const signalListeners = async signal => {
        try {
            const {stdout} = await execFileAsync('lsof', ['-nP', `-iTCP:${num}`, '-sTCP:LISTEN', '-t']);
            const pids     = stdout
                .split('\n')
                .map(s => Number(s.trim()))
                .filter(pid => Number.isInteger(pid) && pid > 0 && pid !== process.pid);

            for (const pid of pids) {
                try { process.kill(-pid, signal); } catch {}
                try { process.kill(pid, signal); } catch {}
            }
        } catch {}
    };

    await signalListeners('SIGTERM');

    const deadline   = Date.now() + timeoutMs,
          escalateAt = Date.now() + Math.min(1000, Math.floor(timeoutMs / 2));
    let escalated    = false;

    while (Date.now() < deadline) {
        if (!(await isPortListening(num))) {
            return;
        }
        if (!escalated && Date.now() >= escalateAt) {
            escalated = true;
            await signalListeners('SIGKILL');
        }
        await new Promise(r => setTimeout(r, 50));
    }
}

/**
 * @summary Runs `verify.spec.mjs` against a running arm server, records pass/fail and duration,
 * and optionally appends a verification record (`recordType`) to `verifyLogPath`.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.url='http://localhost:8080']
 * @param {Number} [options.timeoutMs=15000]
 * @param {String|null} [options.verifyLogPath=null]
 * @param {String} [options.rootDir=ROOT_DIR]
 * @param {String} [options.recordType='benchmark_verification']
 * @returns {Promise<{type: String, timestamp: String, arm: String, pass: Boolean, durationMs: Number, output: String}>}
 */
export async function runArmVerification({
    arm,
    url           = 'http://localhost:8080',
    timeoutMs     = 15000,
    verifyLogPath = null,
    rootDir       = ROOT_DIR,
    recordType    = 'benchmark_verification'
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
        type      : recordType,
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
 * @summary Builds the CLI binary, arguments, and resolved model string for launching a coding-agent harness.
 * Defaults to `'sonnet'` only for `'claude-code'` and omits `-m` when `model` is omitted on `'gemini'` or `'codex'`.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.harness='claude-code']
 * @param {String} [options.model]
 * @param {String} options.prompt
 * @param {Boolean} [options.sandbox=false]
 * @param {String|null} [options.cmd=null]
 * @returns {{spawnBin: String, spawnArgs: String[], resolvedModel: String}}
 */
export function buildAgentSpawnSpec({
    arm,
    harness  = 'claude-code',
    model,
    prompt,
    sandbox  = false,
    cmd      = null,
    codexBin = 'codex'
}) {
    const resolvedModel = model !== undefined
        ? model
        : (harness === 'claude-code' ? 'sonnet' : '');

    if (cmd) {
        return {spawnBin: '/bin/sh', spawnArgs: ['-c', cmd], resolvedModel};
    }

    if (harness === 'codex') {
        return {
            spawnBin : codexBin || 'codex',
            spawnArgs: ['exec', '--json', '--dangerously-bypass-approvals-and-sandbox', ...(resolvedModel ? ['-m', resolvedModel] : []), prompt],
            resolvedModel
        };
    }

    if (harness === 'gemini') {
        const allowedMcp = arm === 'arm-a-react-ag-grid-mcp'
            ? ['--allowed-mcp-server-names', 'ag-mcp']
            : arm === 'arm-c-neo-kb-neural-link'
                ? ['--allowed-mcp-server-names', 'neural-link']
                : ['--allowed-mcp-server-names', '__none__'];

        return {
            spawnBin : 'gemini',
            spawnArgs: [
                '-p', prompt,
                ...(resolvedModel ? ['-m', resolvedModel] : []),
                '--output-format', 'stream-json',
                '--approval-mode', 'yolo',
                '-e', 'none',
                ...(sandbox ? ['--sandbox'] : []),
                ...allowedMcp
            ],
            resolvedModel
        };
    }

    return {
        spawnBin : 'claude',
        spawnArgs: [
            '-p', prompt,
            '--model', resolvedModel || 'sonnet',
            '--output-format', 'stream-json',
            '--verbose',
            '--mcp-config', './.mcp.json',
            '--strict-mcp-config',
            '--setting-sources', 'project,local',
            '--permission-mode', 'bypassPermissions',
            '--no-chrome'
        ],
        resolvedModel: resolvedModel || 'sonnet'
    };
}

/**
 * @summary Executes one benchmark arm end-to-end inside an isolated clean-room workspace and returns parsed telemetry.
 * @param {Object} options
 * @param {String} options.arm
 * @param {String} [options.harness='claude-code']
 * @param {String} [options.model] Defaults to `'sonnet'` for `'claude-code'`; omitted for `'gemini'` and `'codex'` so each CLI selects its own default.
 * @param {String|null} [options.cmd=null]
 * @param {String} [options.outDir]
 * @param {Number} [options.timeoutMs=900000]
 * @param {Number} [options.appPort]
 * @param {Number} [options.nlPort]
 * @param {Boolean} [options.keepStage=false]
 * @param {Boolean} [options.installDeps=true]
 * @param {Boolean} [options.sandbox=false]
 * @param {Boolean} [options.postExitVerify=false]
 * @param {Number} [options.postExitStartupTimeoutMs=15000]
 * @param {Number} [options.postExitVerifyTimeoutMs=15000]
 * @returns {Promise<{telemetry: Object, transcriptPath: String, verifyLogPath: String, postExitVerifyLogPath: String|null}>}
 */
export async function runCleanRoomArm({
    arm,
    harness                  = 'claude-code',
    model                    = undefined,
    cmd                      = null,
    outDir                   = path.join(ROOT_DIR, 'agent-benchmarks/results'),
    timeoutMs                = 900000,
    appPort,
    nlPort,
    keepStage                = false,
    installDeps              = true,
    sandbox                  = false,
    postExitVerify           = false,
    postExitStartupTimeoutMs = 15000,
    postExitVerifyTimeoutMs  = 15000,
    baseEnv                  = process.env,
    codexBin                 = 'codex'
}) {
    if (harness === 'codex' && cmd) {
        const overrideErr = new Error(
            `Unverified --cmd override cannot produce a comparable Codex benchmark result for ${arm}; use --codex-bin so verifyCodexMcpPreflight validates the effective CLI configuration.`
        );
        overrideErr.code = 'BENCHMARK_UNVERIFIED_CODEX_OVERRIDE';
        overrideErr.arm  = arm;
        throw overrideErr;
    }

    const resolvedOutDir           = path.resolve(ROOT_DIR, outDir),
          transcriptPath           = path.join(resolvedOutDir, `${arm}-transcript.jsonl`),
          outVerifyLogPath         = path.join(resolvedOutDir, `${arm}-verify-runs.jsonl`),
          outPostExitVerifyLogPath = path.join(resolvedOutDir, `${arm}-post-exit-verify.jsonl`);

    const staged               = await stageArmWorkspace({arm, appPort, nlPort, installDeps, baseEnv, harness, stageAuth: false}),
          stagedTranscriptPath = path.join(staged.stageRoot, `${arm}-live-transcript.jsonl`),
          prompt               = 'Read AGENTS.md and ../../tasks/grid-100k-multi-window/PROMPT.md first, then implement all requirements in this workspace, start the dev server in the background, verify in the running app, and run the benchmark verification command from AGENTS.md until all assertions pass (exit code 0).',
          childEnv             = buildCleanRoomChildEnv(staged, baseEnv);

    const {spawnBin, spawnArgs} = buildAgentSpawnSpec({
        arm,
        harness,
        model,
        prompt,
        sandbox,
        cmd,
        codexBin
    });

    let child             = null,
        runnerServerProc  = null,
        writeChain        = Promise.resolve(),
        stdoutBuf         = '',
        stderrBuf         = '',
        sawAgentEvent     = false,
        lastErrorLine     = '',
        childExitCode     = null,
        childExitSignal   = null,
        childTimedOut     = false;

    const processLine = rawLine => {
        const trimmed = rawLine.trim();
        if (!trimmed) return;
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                if (isAgentTranscriptEvent(parsed)) {
                    sawAgentEvent = true;
                } else if (parsed.type === 'turn.failed' && parsed.error?.message) {
                    lastErrorLine = redactCredentials(String(parsed.error.message));
                } else if (parsed.type === 'error' && (parsed.message || parsed.error?.message)) {
                    lastErrorLine = redactCredentials(String(parsed.message || parsed.error.message));
                } else if (parsed.type === 'item.completed' && parsed.item?.type === 'error' && parsed.item?.message) {
                    lastErrorLine = redactCredentials(String(parsed.item.message));
                } else if (parsed.is_error && (parsed.result || parsed.error)) {
                    lastErrorLine = redactCredentials(String(parsed.result || parsed.error));
                }
                if (!parsed.timestamp && !parsed.created_at) {
                    parsed.timestamp = new Date().toISOString();
                }
                const safeRecord = redactDiagnosticValue(parsed),
                      outLine    = JSON.stringify(safeRecord) + '\n';
                writeChain = writeChain.then(() => fs.appendFile(stagedTranscriptPath, outLine, 'utf8'));
            }
        } catch {}
    };

    try {
        // Gate Codex launches on credential-free, non-model `codex mcp list --json` discovery BEFORE touching `resolvedOutDir` or staging credentials
        if (harness === 'codex') {
            await verifyCodexMcpPreflight({
                arm,
                armDir  : staged.armDir,
                nlPort  : staged.nlPort,
                env     : childEnv,
                codexBin: spawnBin
            });
        }

        if (!cmd && (harness === 'codex' || harness === 'gemini')) {
            await stageHarnessCredentials(staged, {harness, baseEnv});
        }

        await fs.writeFile(stagedTranscriptPath, '', 'utf8');

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
                    settled       = true;
                    childTimedOut = true;
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

            child.stderr.on('data', chunk => {
                stderrBuf = (stderrBuf + chunk.toString('utf8')).slice(-16384);
            });

            child.once('error', err => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    const wrapped = new Error(`Failed to spawn CLI "${spawnBin}" for ${arm}: ${redactCredentials(err.message)}`);
                    wrapped.code  = err.code || 'BENCHMARK_CLI_SPAWN_ERROR';
                    reject(wrapped);
                }
            });

            child.once('exit', (code, signal) => {
                clearTimeout(timer);
                childExitCode   = code;
                childExitSignal = signal || null;
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

        const exitedUnsuccessfully = childTimedOut || childExitSignal !== null || (childExitCode !== null && childExitCode !== 0),
              isLaunchFailure      = !sawAgentEvent && exitedUnsuccessfully;

        if (isLaunchFailure) {
            const rawDiag = [
                lastErrorLine,
                stderrBuf.trim().split('\n').slice(-8).join(' | '),
                childTimedOut ? `CLI timed out before first agent event after ${timeoutMs}ms` : ''
            ].filter(Boolean).join(' — ');
            const launchRecord = {
                type      : 'benchmark_launch_failure',
                timestamp : new Date().toISOString(),
                arm,
                harness,
                exitCode  : childExitCode,
                signal    : childExitSignal,
                diagnostic: redactCredentials(rawDiag || `CLI exited before first agent event (code=${childExitCode}, signal=${childExitSignal})`).slice(0, 1000)
            };
            await fs.appendFile(stagedTranscriptPath, JSON.stringify(launchRecord) + '\n', 'utf8');
        }

        // Replace previous trial files in `resolvedOutDir` ONLY after admission and CLI spawn have succeeded
        await fs.ensureDir(resolvedOutDir);
        await fs.copy(stagedTranscriptPath, transcriptPath, {overwrite: true});
        await fs.remove(outVerifyLogPath);
        await fs.remove(outPostExitVerifyLogPath);

        const verificationRuns = await readVerificationRuns(staged.verifyLogPath);
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

        telemetry.runOutcome    = telemetry.launchFailure
            ? 'launch_failure'
            : (telemetry.pass ? 'passed' : 'task_failed');
        telemetry.launchFailure = telemetry.launchFailure || null;

        if (cmd && telemetry.harness === 'codex') {
            telemetry.harness    = 'custom-cmd';
            telemetry.comparable = false;
        }

        if (telemetry.harness === 'unknown' && harness) {
            telemetry.harness = cmd ? 'custom-cmd' : harness;
        }
        if (telemetry.model === 'unknown' && model) {
            telemetry.model = model;
        }
        if (!telemetry.versions.harnessVersion && !cmd && (spawnBin === codexBin || spawnBin === 'codex' || spawnBin === 'gemini' || spawnBin === 'claude')) {
            try {
                const {stdout} = await execFileAsync(spawnBin, ['--version'], {encoding: 'utf8', env: childEnv});
                const trimmed  = stdout.trim().split('\n')[0]?.trim();
                if (trimmed) telemetry.versions.harnessVersion = trimmed;
            } catch {}
        }

        if (postExitVerify && !telemetry.launchFailure) {
            let listening             = await isPortListening(staged.appPort),
                serverStartedByRunner = false;

            if (!listening) {
                const devScriptArgs = arm === 'arm-a-react-ag-grid-mcp'
                    ? ['run', 'dev']
                    : ['run', 'server-start:headless'];

                runnerServerProc = spawn('npm', devScriptArgs, {
                    cwd     : staged.armDir,
                    detached: true,
                    stdio   : 'ignore',
                    env     : childEnv
                });
                runnerServerProc.on('error', () => {});
                runnerServerProc.unref();
                serverStartedByRunner = true;

                const startupDeadline = Date.now() + postExitStartupTimeoutMs;
                while (Date.now() < startupDeadline) {
                    if (await isPortListening(staged.appPort)) {
                        listening = true;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 250));
                }
            }

            if (listening) {
                const postRun = await runArmVerification({
                    arm,
                    url          : staged.appUrl,
                    timeoutMs    : postExitVerifyTimeoutMs,
                    verifyLogPath: outPostExitVerifyLogPath,
                    rootDir      : staged.stageRoot,
                    recordType   : 'runner_post_exit_verification'
                });
                telemetry.postExitVerification = {
                    type      : 'runner_post_exit_verification',
                    ran       : true,
                    pass      : postRun.pass,
                    durationMs: postRun.durationMs,
                    timestamp : postRun.timestamp,
                    serverStartedByRunner
                };
            } else {
                const skippedRecord = {
                    type      : 'runner_post_exit_verification',
                    timestamp : new Date().toISOString(),
                    arm,
                    ran       : false,
                    pass      : null,
                    durationMs: null,
                    serverStartedByRunner,
                    reason    : 'server-not-listening'
                };
                await fs.ensureDir(path.dirname(outPostExitVerifyLogPath));
                await fs.appendFile(outPostExitVerifyLogPath, JSON.stringify(skippedRecord) + '\n', 'utf8');
                telemetry.postExitVerification = skippedRecord;
            }
        } else {
            telemetry.postExitVerification = null;
        }

        return {
            telemetry,
            transcriptPath,
            verifyLogPath        : outVerifyLogPath,
            postExitVerifyLogPath: postExitVerify ? outPostExitVerifyLogPath : null
        };
    } finally {
        if (runnerServerProc?.pid) {
            try { process.kill(-runnerServerProc.pid, 'SIGTERM'); } catch {}
        }
        if (child?.pid) {
            try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        }
        try {
            await execFileAsync('pkill', ['-TERM', '-f', staged.stageRoot]);
        } catch {}
        await terminatePortListeners(staged.appPort);
        if (staged.nlPort) {
            await terminatePortListeners(staged.nlPort);
        }
        await cleanupStagedCredentials(staged);
        if (!keepStage) {
            await fs.remove(staged.stageRoot);
        }
    }
}

/**
 * @summary Builds a structured comparison report object across the supplied comparable arm telemetry entries.
 * @param {Array<Object>} armResults
 * @returns {{generatedAt: String, task: String, arms: Array<Object>}}
 */
export function buildComparisonReport(armResults = []) {
    return {
        generatedAt: new Date().toISOString(),
        task       : 'grid-100k-multi-window',
        arms       : armResults
            .filter(entry => entry?.comparable !== false)
            .map(entry => redactDiagnosticValue(entry))
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
              framework   = entry.versions?.frameworkVersion || 'unknown',
              outcome     = entry.launchFailure || entry.runOutcome === 'launch_failure'
                  ? 'LAUNCH_FAILURE'
                  : (entry.pass ? 'PASS' : 'FAIL');
        return `| \`${entry.arm}\` | \`${entry.harness || 'unknown'}\` | \`${entry.model || 'unknown'}\` | \`${framework}\` | ${outcome} | ${timeToGreen} | ${entry.totalTokens?.total ?? 0} | ${tc.docsKbQueries ?? 0} | ${tc.neuralLinkRuntimeCalls ?? 0} | ${tc.fileEdits ?? 0} | ${tc.shellTestRuns ?? 0} | ${entry.verificationFailures ?? 0} |`;
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

    if (args.includes('--preflight-codex')) {
        const targetArms = args.includes('--run-all')
            ? [...ARMS]
            : (getAllFlags('--run-arm').length > 0 ? getAllFlags('--run-arm') : [...ARMS]);
        const codexBin = getFlag('--codex-bin') || 'codex',
              results  = [];

        for (const arm of targetArms) {
            const staged   = await stageArmWorkspace({
                arm,
                appPort    : getFlag('--app-port') ? Number(getFlag('--app-port')) : undefined,
                nlPort     : getFlag('--nl-port')  ? Number(getFlag('--nl-port'))  : undefined,
                installDeps: !args.includes('--no-install'),
                stageAuth  : false
            });
            const childEnv = buildCleanRoomChildEnv(staged, process.env);
            try {
                const check = await verifyCodexMcpPreflight({
                    arm,
                    armDir  : staged.armDir,
                    nlPort  : staged.nlPort,
                    env     : childEnv,
                    codexBin
                });
                results.push({
                    arm     : check.arm,
                    expected: check.expected,
                    observed: check.observed,
                    nlPort  : check.nlPort
                });
            } finally {
                await cleanupStagedCredentials(staged);
                if (!args.includes('--keep-stage')) {
                    await fs.remove(staged.stageRoot);
                }
            }
        }
        console.log(JSON.stringify({ok: true, arms: results}, null, 2));
        return;
    }

    const runArms = args.includes('--run-all') ? [...ARMS] : getAllFlags('--run-arm');
    if (runArms.length > 0) {
        const resolvedHarness = harnessOpt || (modelOpt?.startsWith('gemini') ? 'gemini' : 'claude-code'),
              codexBin        = getFlag('--codex-bin') || 'codex',
              armResults      = [];
        for (const arm of runArms) {
            const {telemetry} = await runCleanRoomArm({
                arm,
                harness       : resolvedHarness,
                model         : modelOpt ?? undefined,
                cmd           : getFlag('--cmd'),
                outDir,
                timeoutMs     : getFlag('--timeout-ms') ? Number(getFlag('--timeout-ms')) : 900000,
                appPort       : getFlag('--app-port')   ? Number(getFlag('--app-port'))   : undefined,
                nlPort        : getFlag('--nl-port')    ? Number(getFlag('--nl-port'))    : undefined,
                keepStage     : args.includes('--keep-stage'),
                installDeps   : !args.includes('--no-install'),
                sandbox       : args.includes('--sandbox'),
                postExitVerify: args.includes('--post-exit-verify'),
                codexBin
            });
            armResults.push(telemetry);
        }

        await writeComparisonReport(armResults, outDir);
        if (armResults.some(r => r.launchFailure || r.runOutcome === 'launch_failure')) {
            process.exitCode = 1;
        }
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
