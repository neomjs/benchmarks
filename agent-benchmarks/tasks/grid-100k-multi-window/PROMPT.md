# Coding-Agent Task Specification: `grid-100k-multi-window`

> **Identical Prompt Across All 3 Arms (`arm-a-react-ag-grid-mcp`, `arm-b-neo-kb-only`, `arm-c-neo-kb-neural-link`).**
> Do not modify `verify.spec.mjs` or `data/generateRows.mjs`.

## Objective

Build a virtualized **100,000-row** data-grid application with **grouped column headers**, **deterministic sorting and region filtering**, and **cross-window row-detail synchronization** into a second browser window.

---

## Requirements

### 1. Deterministic `100,000`-Row Dataset
Import `generateRows` from `../../tasks/grid-100k-multi-window/data/generateRows.mjs` and load `generateRows(100000, 42)` into your grid.

Render a toolbar summary element `[data-testid="total-row-count"]` showing the current active (filtered) row count (`100000` initially).

Each record has the following shape:
```json
{
  "id": "ROW-000001",
  "accountName": "Alpha Baseline 1",
  "region": "EMEA",
  "arrUsd": 125000,
  "latencyMs": 18,
  "status": "Healthy",
  "owner": "A. Vance"
}
```

### 2. Grouped Column Headers
Configure the grid with two top-level column groups and six leaf columns:
1. **`Identity`** (column group header text `"Identity"`):
   - `id` (header `"ID"`)
   - `accountName` (header `"Account"`)
   - `region` (header `"Region"`)
2. **`Performance`** (column group header text `"Performance"`):
   - `arrUsd` (header `"ARR (USD)"`)
   - `latencyMs` (header `"Latency (ms)"`)
   - `status` (header `"Status"`)

### 3. Virtualization, Sorting & Region Filtering
- **Virtualization:** All `100,000` records must be loaded in the backing store/model while the DOM renders only the virtualized viewport slice (`< 250` `[role="row"]` DOM row elements at any time; both `Neo.grid.Container` and `ag-grid-react` emit `role="row"` natively).
- **Sorting (`[data-testid="sort-arr-desc"]`):** Provide a button `[data-testid="sort-arr-desc"]` (in addition to native column-header sort) that sorts the dataset by `arrUsd` **descending** (`ROW-000002` with `arrUsd: 999900` becomes the first row, while `ROW-000001` with `arrUsd: 125000` moves out of the top viewport). Provide `[data-testid="sort-reset"]` to restore the default `id` ascending order (`ROW-000001` first).
- **Region Filtering (`[data-testid="region-filter"]`):** Provide a `<select data-testid="region-filter">` element with `<option>` values `"ALL"`, `"EMEA"`, `"AMER"`, `"APAC"`, and `"LATAM"`. Selecting `"EMEA"` filters the grid rows to only records where `region === "EMEA"` (removing non-EMEA rows such as `ROW-000002` from the viewport) and updates `[data-testid="total-row-count"]` to the exact filtered EMEA row count.

### 4. Second-Window Detail Synchronization
- Provide a button `[data-testid="open-detail-window"]` that opens a second browser window (`window.open(..., 'gridDetailWindow')`) rendering the detail view container `[data-testid="detail-view"]`.
- When any grid row is clicked (or selected) in the primary window, synchronize that record into the second window's `[data-testid="detail-view"]` so that:
  - `[data-testid="detail-row-id"]` displays `row.id` (e.g. `ROW-000001`),
  - `[data-testid="detail-account-name"]` displays `row.accountName` (e.g. `Alpha Baseline 1`),
  - `[data-testid="detail-region"]` displays `row.region` (e.g. `EMEA`),
  - `[data-testid="detail-arr-usd"]` displays `String(row.arrUsd)` (e.g. `125000`), and
  - `[data-testid="detail-owner"]` displays `row.owner` (e.g. `A. Vance`).
- Selecting a different row in the primary window must live-update the open second window without opening a duplicate popup.

### 5. Zero Console / Page Errors
Both the primary grid window and the second detail window must run with zero uncaught `pageerror` exceptions and zero `console.error` messages.

---

## Verification

Run the arm-agnostic Playwright verification suite against your running dev server:
```bash
AGENT_BENCH_URL=http://localhost:<port> npx playwright test agent-benchmarks/tasks/grid-100k-multi-window/verify.spec.mjs
```
All assertions in `verify.spec.mjs` must pass (`exit code 0`).
