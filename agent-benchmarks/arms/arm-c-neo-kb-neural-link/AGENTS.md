# AGENTS.md — Neo.mjs App Workspace (Arm C: Static Docs + Skills + Neural Link MCP)

This workspace was created with `npx neo-app`. Read this file before touching any code under `apps/` or `src/`.

## Write Neo.mjs, not a framework port

A Neo.mjs app runs inside an application worker; the main thread only applies DOM deltas and forwards events. Every view is a class extending a `Neo.*` base class (`Neo.container.Viewport`, `Neo.grid.Container`, `Neo.button.Base`, `Neo.form.field.ComboBox`), configured with reactive configs (`configName_: defaultValue`) and `afterSet*` hooks, and bound to a `Neo.data.Store` of `Neo.data.Model` records through a `Neo.state.Provider`.

There is no JSX, no hooks, no virtual-DOM diffing on the main thread, and no `document.querySelector` inside a component. Before authoring or editing any class in `apps/` or `src/`, read `.agents/skills/neo-app-authoring/SKILL.md`.

### Documentation, Examples & Live Runtime Surface (Arm C — Neural Link Enabled)
- **Authoring & Runtime Skills:** `.agents/skills/neo-app-authoring/SKILL.md` and `.agents/skills/neural-link/SKILL.md` (materialized on `npm install`).
- **Engine Source, Guides & Examples:** `node_modules/neo.mjs/src/grid/Container.mjs`, `node_modules/neo.mjs/learn/`, and `node_modules/neo.mjs/examples/grid/bigData/`.
- **Curated LLM Index:** `https://neomjs.com/llms.txt` and `https://neomjs.com/llms-full.txt`.
- **Live Runtime Inspection (`neural-link` MCP):** Enabled (`useAiClient: "development"`, `npx -y neo-neural-link`).

## Verify in the running app before you call a change done

Code that compiles or passes a static read is not done. Start the workspace (`npm run server-start:headless`), open the app in a browser or Playwright session (`http://localhost:8080/apps/gridbench/index.html`), inspect the live runtime via the `neural-link` MCP server (see `.agents/skills/neural-link/SKILL.md` — `healthcheck`, `get_component_tree`, `inspect_store`, `get_window_topology`, `get_console_logs`), and run the benchmark acceptance suite (`node ../../runner/runAgentBenchmark.mjs --verify-arm arm-c-neo-kb-neural-link --url http://localhost:8080/apps/gridbench/index.html`) before finishing.
