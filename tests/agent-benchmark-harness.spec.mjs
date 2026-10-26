import {test, expect} from '@playwright/test';
import fs             from 'fs-extra';
import http           from 'node:http';
import path           from 'path';
import {generateRows} from '../agent-benchmarks/tasks/grid-100k-multi-window/data/generateRows.mjs';
import {
    ARMS,
    classifyToolCall,
    parseTranscriptTelemetry,
    buildComparisonReport,
    formatComparisonMarkdown,
    runArmVerification
} from '../agent-benchmarks/runner/runAgentBenchmark.mjs';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

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

    test('all three arm workspaces carry isolated starter trees and distinct MCP configurations', async () => {
        expect(ARMS).toEqual([
            'arm-a-react-ag-grid-mcp',
            'arm-b-neo-kb-only',
            'arm-c-neo-kb-neural-link'
        ]);

        const armAMcp = await fs.readJson(path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-a-react-ag-grid-mcp/.mcp.json')),
              armBMcp = await fs.readJson(path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-b-neo-kb-only/.mcp.json')),
              armCMcp = await fs.readJson(path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-c-neo-kb-neural-link/.mcp.json'));

        expect(Object.keys(armAMcp.mcpServers)).toEqual(['ag-mcp']);
        expect(Object.keys(armBMcp.mcpServers)).toEqual(['neo-mjs-knowledge-base']);
        expect(Object.keys(armCMcp.mcpServers)).toEqual(['neo-mjs-knowledge-base', 'neural-link']);

        const armBNeoConfig = await fs.readJson(path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-b-neo-kb-only/apps/gridbench/neo-config.json')),
              armCNeoConfig = await fs.readJson(path.join(ROOT_DIR, 'agent-benchmarks/arms/arm-c-neo-kb-neural-link/apps/gridbench/neo-config.json'));

        expect(armBNeoConfig.useAiClient).toBe(false);
        expect(armCNeoConfig.useAiClient).toBe('development');
    });

    test('parseTranscriptTelemetry and buildComparisonReport emit structured JSON and Markdown telemetry', () => {
        expect(classifyToolCall({serverName: 'ag-mcp', toolName: 'search_docs'})).toBe('docsKbQueries');
        expect(classifyToolCall({serverName: 'neo-mjs-knowledge-base', toolName: 'ask_knowledge_base'})).toBe('docsKbQueries');
        expect(classifyToolCall({serverName: 'neo-mjs-neural-link', toolName: 'inspect_store'})).toBe('neuralLinkRuntimeCalls');
        expect(classifyToolCall({toolName: 'write_file'})).toBe('fileEdits');
        expect(classifyToolCall({toolName: 'run_command'})).toBe('shellTestRuns');

        const sampleTranscript = [
            JSON.stringify({
                timestamp: '2026-10-26T16:00:00.000Z',
                usage    : {inputTokens: 1200, outputTokens: 300, cachedTokens: 400},
                toolCalls: [
                    {serverName: 'neo-mjs-knowledge-base', toolName: 'ask_knowledge_base'},
                    {toolName: 'write_file'}
                ]
            }),
            JSON.stringify({
                timestamp         : '2026-10-26T16:02:30.000Z',
                usage             : {inputTokens: 1500, outputTokens: 250, cachedTokens: 800},
                verificationPassed: true,
                toolCalls         : [
                    {serverName: 'neo-mjs-neural-link', toolName: 'get_component_tree'},
                    {serverName: 'neo-mjs-neural-link', toolName: 'inspect_store'},
                    {toolName: 'run_command'}
                ]
            })
        ].join('\n');

        const telemetry = parseTranscriptTelemetry(sampleTranscript, {arm: 'arm-c-neo-kb-neural-link'});

        expect(telemetry).toEqual({
            arm              : 'arm-c-neo-kb-neural-link',
            pass             : true,
            timeToGreenMs    : 150000,
            totalTokens      : {inputTokens: 2700, outputTokens: 550, cachedTokens: 1200, total: 3250},
            toolCallsByServer: {
                docsKbQueries         : 1,
                neuralLinkRuntimeCalls: 2,
                fileEdits             : 1,
                shellTestRuns         : 1,
                other                 : 0
            },
            verificationFailures: 0
        });

        const report   = buildComparisonReport([telemetry]),
              markdown = formatComparisonMarkdown(report);

        expect(report.arms).toHaveLength(1);
        expect(markdown).toContain('arm-c-neo-kb-neural-link');
        expect(markdown).toContain('150000');
        expect(markdown).toContain('3250');
    });

    test('verify.spec.mjs fails on starter shell and passes against a compliant 100k multi-window server', async () => {
        const rows           = generateRows(100000, 42);
        let   serveCompliant = false;

        const referenceHtml = `<!doctype html>
<html>
<head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Reference Grid</title></head>
<body>
  <script>
    const params = new URLSearchParams(location.search);
    const channel = new BroadcastChannel('grid-detail-sync');
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
        let list = region === 'ALL' ? allRows : allRows.filter(r => r.region === region);
        if (sortMode === 'arr-desc') {
          list = [...list].sort((a, b) => b.arrUsd - a.arrUsd);
        }
        const slice = list.slice(0, 50);
        const container = document.getElementById('grid-rows');
        container.innerHTML = slice.map(r => \`<div role="row" data-id="\${r.id}"><span>\${r.id}</span> <span>\${r.accountName}</span> <span>\${r.region}</span> <span>\${r.arrUsd}</span></div>\`).join('');
        container.querySelectorAll('[role="row"]').forEach((el, idx) => {
          el.onclick = () => channel.postMessage(slice[idx]);
        });
        document.querySelector('[data-testid="total-row-count"]').textContent = String(list.length);
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
            res.end(serveCompliant ? referenceHtml : '<html><body><h1>Unimplemented Starter</h1></body></html>');
        });

        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const {port} = server.address();
        const url    = `http://127.0.0.1:${port}`;

        try {
            const redResult = await runArmVerification({arm: 'arm-a-react-ag-grid-mcp', url, timeoutMs: 1200});
            expect(redResult.pass).toBe(false);

            serveCompliant = true;
            const greenResult = await runArmVerification({arm: 'arm-c-neo-kb-neural-link', url, timeoutMs: 10000});
            expect(greenResult.pass, greenResult.output).toBe(true);
        } finally {
            await new Promise(resolve => server.close(resolve));
        }
    });
});
