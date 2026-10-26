# AGENTS.md — Neo.mjs App Workspace (Arm B: Static Docs + Skills Only, No Neural Link MCP)

This workspace was created with `npx neo-app`. Read this file before touching any code under `apps/` or `src/`.

## Write Neo.mjs, not a framework port

A Neo.mjs app runs inside an application worker; the main thread only applies DOM deltas and forwards events. Every view is a class extending a `Neo.*` base class (`Neo.container.Viewport`, `Neo.grid.Container`, `Neo.button.Base`, `Neo.form.field.ComboBox`), configured with reactive configs (`configName_: defaultValue`) and `afterSet*` hooks, and bound to a `Neo.data.Store` of `Neo.data.Model` records through a `Neo.state.Provider`.

There is no JSX, no hooks, no virtual-DOM diffing on the main thread, and no `document.querySelector` inside a component. Before authoring or editing any class in `apps/` or `src/`, read `.agents/skills/neo-app-authoring/SKILL.md`.

### Documentation & Examples Surface (Arm B — No Live Runtime MCP)
- **Authoring Skill:** `.agents/skills/neo-app-authoring/SKILL.md` (materialized on `npm install`).
- **Engine Source, Guides & Examples:** `node_modules/neo.mjs/src/grid/Container.mjs`, `node_modules/neo.mjs/learn/`, and `node_modules/neo.mjs/examples/grid/bigData/`.
- **Curated LLM Index:** `https://neomjs.com/llms.txt` and `https://neomjs.com/llms-full.txt`.
- **Constraint:** The `neural-link` runtime MCP server is intentionally disabled in this arm (`useAiClient: false`, `mcpServers: {}`).

## Verify in the running app before you call a change done

Code that compiles or passes a static read is not done. Start the workspace (`npm run server-start:headless`), open the app in a browser or Playwright session (`http://localhost:8080/apps/gridbench/index.html`), inspect the rendered DOM and console for errors, and run the benchmark acceptance suite (`node ../../runner/runAgentBenchmark.mjs --verify-arm arm-b-neo-kb-only --url http://localhost:8080/apps/gridbench/index.html`) before finishing.
