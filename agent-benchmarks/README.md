# 3-Arm Coding-Agent Benchmark Harness (`neomjs/benchmarks#2`)

Alongside the runtime UI latency benchmarks in `neomjs/benchmarks` (`Total Blocking Time`, `TVS`, `FPS`, heap usage), this directory provides a reproducible **3-arm coding-agent ablation harness** that measures how reliably and quickly a frontier coding agent authors and verifies a `100,000`-row virtualized data-grid application with a synchronized second-window detail view.

---

## 1. The Three Experimental Arms

All three arms receive the **exact same task specification** ([`tasks/grid-100k-multi-window/PROMPT.md`](./tasks/grid-100k-multi-window/PROMPT.md)), the **exact same deterministic 100,000-row dataset generator** ([`tasks/grid-100k-multi-window/data/generateRows.mjs`](./tasks/grid-100k-multi-window/data/generateRows.mjs)), the **exact same "Verify in the running app before you call a change done" discipline**, and are graded by the **exact same arm-agnostic Playwright verification suite** ([`tasks/grid-100k-multi-window/verify.spec.mjs`](./tasks/grid-100k-multi-window/verify.spec.mjs)):

| Arm | Directory | Stack | Docs / Skills Surface | MCP Servers (`.mcp.json` / `.codex/config.toml`) | Purpose in Ablation |
|---|---|---|---|---|---|
| **Arm A** | [`arms/arm-a-react-ag-grid-mcp`](./arms/arm-a-react-ag-grid-mcp) | React `19.1.1` + `ag-grid-community@36.2.0` + `ag-grid-react@36.2.0` (Vite `7.1.2`) | AG Grid MCP docs & examples | `ag-mcp` (`npx -y ag-mcp`) | Baseline for mainstream React + AG Grid training priors + official vendor documentation MCP |
| **Arm B** | [`arms/arm-b-neo-kb-only`](./arms/arm-b-neo-kb-only) | `neo.mjs@13.3.1` (`useAiClient: false`) | `.agents/skills/neo-app-authoring` (`neo-agent-skills`) + `node_modules/neo.mjs/{learn,examples,src}` + `https://neomjs.com/llms.txt` | None (`mcpServers: {}`) | Isolates Neo.mjs engine authoring with static documentation and skills only (no live runtime MCP bridge) |
| **Arm C** | [`arms/arm-c-neo-kb-neural-link`](./arms/arm-c-neo-kb-neural-link) | `neo.mjs@13.3.1` (`useAiClient: "development"`) | Same static docs & skills as Arm B (`neo-app-authoring` + `neural-link` skill) | `neural-link` (`npx -y neo-neural-link`) | Isolates the verification-loop and token reduction gained by adding live multi-window runtime inspection via the Neural Link (`npx neo-app` default) |

---

## 2. Directory Layout

```text
agent-benchmarks/
├── README.md
├── playwright.config.mjs
├── agent-benchmark-harness.spec.mjs
├── tasks/
│   └── grid-100k-multi-window/
│       ├── PROMPT.md
│       ├── data/
│       │   └── generateRows.mjs
│       └── verify.spec.mjs
├── arms/
│   ├── arm-a-react-ag-grid-mcp/
│   ├── arm-b-neo-kb-only/
│   └── arm-c-neo-kb-neural-link/
├── runner/
│   └── runAgentBenchmark.mjs
└── results/
```

---

## 3. Running Verification & Collecting Telemetry

### Verify a Running Arm Workspace
Start the target arm's dev server and run `verify.spec.mjs` against its URL (each verification run is appended to `agent-benchmarks/results/<arm>-verify-runs.jsonl` by default):

```bash
# Verify Arm A (default Vite port 5174)
AGENT_BENCH_URL=http://localhost:5174 npx playwright test -c agent-benchmarks/playwright.config.mjs agent-benchmarks/tasks/grid-100k-multi-window/verify.spec.mjs

# Or via the runner CLI (which also logs verification attempts for timeToGreenMs / verificationFailures)
node ./agent-benchmarks/runner/runAgentBenchmark.mjs \
  --verify-arm arm-c-neo-kb-neural-link \
  --url http://localhost:8080/apps/gridbench/index.html
```

### Generate a 3-Arm Telemetry Report from Agent Transcripts
Pass per-arm JSONL transcripts (Claude Code, Codex CLI, or generic JSONL) to `runAgentBenchmark.mjs` using `--from-transcript <arm>=<path>` or `--arm-{a,b,c}-transcript`:

```bash
node ./agent-benchmarks/runner/runAgentBenchmark.mjs \
  --from-transcript arm-a-react-ag-grid-mcp=./transcripts/arm-a.jsonl \
  --from-transcript arm-b-neo-kb-only=./transcripts/arm-b.jsonl \
  --from-transcript arm-c-neo-kb-neural-link=./transcripts/arm-c.jsonl \
  --out-dir ./agent-benchmarks/results
```
