# AGENTS.md — Arm A (`react-ag-grid-mcp`)

## Task & Tooling Surface

- **Task Specification:** Read [`../../tasks/grid-100k-multi-window/PROMPT.md`](../../tasks/grid-100k-multi-window/PROMPT.md) before writing code.
- **Stack:** React 19 + `ag-grid-community@36.2.0` + `ag-grid-react@36.2.0` (MIT Community edition).
- **MCP Surface:** Official AG Grid MCP server (`ag-mcp` configured in `.mcp.json` and `.codex/config.toml`). Use `ag-mcp` to query version-matched AG Grid v36 documentation, column grouping (`children`), sorting/filtering APIs, and React examples.

## Verify in the running app before you call a change done

Code that compiles or passes a static read is not done. Start the workspace (`npm run dev`), open the app in a browser or Playwright session (`http://localhost:5174`), inspect the rendered DOM and console for errors, and run the benchmark acceptance suite (`node ../../runner/runAgentBenchmark.mjs --verify-arm arm-a-react-ag-grid-mcp --url http://localhost:5174`) before finishing.
