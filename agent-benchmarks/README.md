# 3-Arm Coding-Agent Benchmark Harness (`neomjs/benchmarks#2`)

Alongside the runtime UI performance benchmarks (`tests/neo-big-data.spec.mjs` vs `tests/react-big-data.spec.mjs`), `agent-benchmarks/` measures **how reliably and quickly a frontier coding agent builds and verifies a multi-window 100,000-row data-grid application** across three distinct MCP substrates:

| Arm | Workspace Directory | Stack | MCP & Agent Discovery Surface | Purpose |
|---|---|---|---|---|
| **Arm A (`react-ag-grid-mcp`)** | `agent-benchmarks/arms/arm-a-react-ag-grid-mcp/` | React 19 + `ag-grid-community@36.2.0` + Vite | `ag-mcp` (`npx -y ag-mcp`) | Baseline for high pre-training familiarity + official documentation MCP server |
| **Arm B (`neo-kb-only`)** | `agent-benchmarks/arms/arm-b-neo-kb-only/` | `neo.mjs@13.3.1` + `neo-agent-skills@^0.1.62` | `neo-mjs-knowledge-base` + `AGENTS.md` + `/llms.txt` (`useAiClient: false`) | Control arm isolating static documentation & skills without live runtime introspection |
| **Arm C (`neo-kb-neural-link`)** | `agent-benchmarks/arms/arm-c-neo-kb-neural-link/` | `neo.mjs@13.3.1` + `neo-agent-skills@^0.1.62` | `neo-mjs-knowledge-base` + `neo-neural-link` (`useAiClient: "development"`) | Full Two-Hemispheres arm with live VDOM/Store/Component/Multi-Window inspection |

---

## Directory Layout

- `tasks/grid-100k-multi-window/PROMPT.md` — Canonical task specification given identically to all 3 arms.
- `tasks/grid-100k-multi-window/data/generateRows.mjs` — Seeded Mulberry32 PRNG generating the identical `100,000`-row dataset across all 3 arms.
- `tasks/grid-100k-multi-window/verify.spec.mjs` — Arm-agnostic Playwright verification suite asserting `100,000`-row virtualization, `Identity` / `Performance` grouped column headers, deterministic `arrUsd` sort and `region` filter, and second-window (`window.open`) row-detail synchronization with zero console/page errors.
- `arms/{arm-a-react-ag-grid-mcp,arm-b-neo-kb-only,arm-c-neo-kb-neural-link}/` — Clean starting workspaces with `.mcp.json`, `.codex/config.toml`, `AGENTS.md`, and `CLAUDE.md`.
- `runner/runAgentBenchmark.mjs` — Automated verification runner and transcript telemetry collector emitting JSON and Markdown comparison reports (`pass`, `timeToGreenMs`, `totalTokens`, `toolCallsByServer`, `verificationFailures`).

---

## Usage

### 1. Verify a Running Arm Workspace
```bash
node agent-benchmarks/runner/runAgentBenchmark.mjs \
  --verify-arm arm-c-neo-kb-neural-link \
  --url http://localhost:8080
```

### 2. Collect Telemetry from Agent Transcripts & Emit Comparison Report
```bash
node agent-benchmarks/runner/runAgentBenchmark.mjs \
  --arm-a-transcript path/to/arm-a.jsonl \
  --arm-b-transcript path/to/arm-b.jsonl \
  --arm-c-transcript path/to/arm-c.jsonl \
  --out-dir agent-benchmarks/results
```
