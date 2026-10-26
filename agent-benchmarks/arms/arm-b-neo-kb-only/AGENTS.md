# Building on neo.mjs — what your agent should know first (Arm B: `neo-kb-only`)

Your harness read this file because `neo-app` wrote it into this workspace. It is the short version of
how neo.mjs thinks, so that the first app code you write reads like the engine's own. The engine,
its guides and working examples are installed under `node_modules/neo.mjs/`.

## §task
Read `../../tasks/grid-100k-multi-window/PROMPT.md` and implement all requirements in `apps/gridbench/`.
Import `generateRows` from `../../tasks/grid-100k-multi-window/data/generateRows.mjs`.

## §orientation
**The workspace.** Each app lives under `apps/<name>/`. `app.mjs` starts it with `Neo.app({mainView})`,
`view/` holds its classes, and `neo-config.json` is its engine configuration. `npm run server-start`
serves the workspace and opens it. `npm run build-themes` compiles `resources/scss/`.

**The engine runs your app in a worker.** Your classes run in the App worker; the main thread only
applies DOM deltas. A view is a tree of configs (`items`, `layout`, `cls`), not markup. You never
touch `document`; the engine renders through its own virtual DOM.

**Look things up, don't guess.** Every class and its documented configs are in
`node_modules/neo.mjs/src/`, the guides are in `node_modules/neo.mjs/learn/`, and working apps are in
`node_modules/neo.mjs/apps/` and `node_modules/neo.mjs/examples/`. Online, `https://neomjs.com/llms.txt`
indexes the docs as plain text.

## §skills
In this **Arm B (`neo-kb-only`)** control workspace, `useAiClient` is `false` (no live Neural Link runtime bridge):
- **`neo-app-authoring`** (`.agents/skills/neo-app-authoring/SKILL.md`) — read it before writing or changing anything under `apps/`. It covers the class shape, reactive configs, stores and models, state providers and styles.
- **`neo-mjs-knowledge-base`** — use the static Knowledge Base MCP server and `https://neomjs.com/llms.txt` to look up `Neo.grid.Container`, `Neo.data.Store`, grouped columns, and multi-window patterns.
