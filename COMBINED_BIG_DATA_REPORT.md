# Big Data Showdown: Neo.mjs vs. React + AG Grid

## Executive Summary
This report benchmarks the rendering performance and main-thread responsiveness of the **Neo.mjs** grid (`v13.3.1` with Store Turbo Mode) against **React** (`19.1.1`) + **AG Grid Community** (`36.2.0`, `animateRows={false}`, tested against a `vite build` + `vite preview` production bundle). By pairing **UI Update Time** with concurrent **`requestAnimationFrame` delta** and **`PerformanceObserver({ type: 'longtask' })` main-thread blocking** probes, we measure both time-to-valid-DOM and UI responsiveness under load.

In heavy, large-scale mutations, Neo.mjs's multi-threaded Off-Main-Thread (OMT) architecture delivers **3.2x faster UI updates** when expanding from 50 to 200 columns at 100,000 rows (356.34 ms vs. 1157.14 ms) and **1.4x faster UI updates** when scaling from 1,000 to 100,000 rows (234.28 ms vs. 336.44 ms). Crucially, Neo.mjs maintains **0.00 ms of Long-Task main-thread blocking** and a steady **16.78 ms Max RAF delta (~60fps)** across every scenario, whereas single-threaded React + AG Grid incurs **337.00 ms of Long-Task blocking** (a **376.68 ms** frame stall) during the 200-column / 100k-row update. On smaller mutations (50 to 75 columns at 1,000 rows) and 1,000-row interactive filtering with row animations disabled, both engines complete in a couple of frames (< 45 ms).

---

## Comparative Performance Analysis (UI Update Times)
Here, we compare the average production mode `UI Update Time` in milliseconds (ms). This metric represents the pure grid rendering performance. Lower is better.

### Change Columns from 50 to 200 (with 100k rows)
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **356.34** | 1157.14 | **3.2x faster** |

### Change Rows from 1,000 to 100,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **234.28** | 336.44 | **1.4x faster** |

### Change Columns from 50 to 75
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **42.90** | 22.68 | **0.5x faster** |

### Change Rows from 1,000 to 5,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **35.82** | 28.46 | **0.8x faster** |

## Interactive Filtering Performance (Total Time to Valid State)
Average production mode `Total Time` in milliseconds (ms) across consecutive filter operations on the active dataset. Lower is better.

| Operation | Browser | Neo.mjs (ms) | React AG Grid (ms) | Neo.mjs Advantage |
|:---|:---|---:|---:|:---:|
| **filter-grid (first)** | **Chromium** | **16.18** | 25.26 | **1.6x faster** |
| **filter-grid (second)** | **Chromium** | **19.54** | 12.42 | **0.6x faster** |
| **filter-grid (clear)** | **Chromium** | **16.16** | 11.96 | **0.7x faster** |

## Main-Thread Responsiveness Probe (Max RAF Delta & Long-Task Blocking)
Measured concurrently via `requestAnimationFrame` delta tracking and `PerformanceObserver({ type: 'longtask' })` while the grid processes large data updates (`16.7 ms` = 60fps; `0 ms` Long-Task Blocking = zero main-thread freeze).

| Scenario | Browser | Neo.mjs Max RAF (ms) | React AG Grid Max RAF (ms) | Neo.mjs Long-Task Block (ms) | React AG Grid Long-Task Block (ms) |
|:---|:---|---:|---:|---:|---:|
| **Change Columns from 50 to 200 (with 100k rows)** | **Chromium** | **16.78** | 376.68 | **0.00** | 337.00 |
| **Change Rows from 1,000 to 100,000** | **Chromium** | **16.76** | 113.08 | **0.00** | 60.60 |
| **Change Columns from 50 to 75** | **Chromium** | **16.72** | 25.90 | **0.00** | 0.00 |
| **Change Rows from 1,000 to 5,000** | **Chromium** | **16.72** | 22.48 | **0.00** | 0.00 |
| **filter-grid (first)** | **Chromium** | **14.62** | 21.89 | **0.00** | 0.00 |
| **filter-grid (second)** | **Chromium** | **14.98** | 17.76 | **0.00** | 0.00 |
| **filter-grid (clear)** | **Chromium** | **14.62** | 13.04 | **0.00** | 0.00 |

---
# Detailed Side-by-Side Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 1191.14 ± 25.00 | 347.82 ± 6.72 |
| Chromium | dev | React + AG Grid | 1902.70 ± 61.39 | 1088.68 ± 29.70 |
| Chromium | prod | Neo.mjs | 1177.98 ± 16.14 | 356.34 ± 4.72 |
| Chromium | prod | React + AG Grid | 1955.64 ± 138.10 | 1157.14 ± 109.51 |

## Change Columns from 50 to 200 (with 100k rows) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 325.20 ± 9.13 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 337.00 ± 6.23 |

## Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.80 ± 0.00 |
| Chromium | dev | React + AG Grid | 366.52 ± 32.94 |
| Chromium | prod | Neo.mjs | 16.78 ± 0.04 |
| Chromium | prod | React + AG Grid | 376.68 ± 8.15 |

## Change Columns from 50 to 75

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 82.52 ± 0.68 | 42.98 ± 0.58 |
| Chromium | dev | React + AG Grid | 59.64 ± 5.54 | 39.78 ± 2.75 |
| Chromium | prod | Neo.mjs | 83.20 ± 0.97 | 42.90 ± 0.68 |
| Chromium | prod | React + AG Grid | 30.18 ± 2.69 | 22.68 ± 5.65 |

## Change Columns from 50 to 75 (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## Change Columns from 50 to 75 (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.70 ± 0.00 |
| Chromium | dev | React + AG Grid | 47.43 ± 4.61 |
| Chromium | prod | Neo.mjs | 16.72 ± 0.04 |
| Chromium | prod | React + AG Grid | 25.90 ± 2.12 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 468.00 ± 6.75 | 240.50 ± 6.19 |
| Chromium | dev | React + AG Grid | 594.34 ± 134.98 | 410.38 ± 130.26 |
| Chromium | prod | Neo.mjs | 457.46 ± 7.85 | 234.28 ± 8.07 |
| Chromium | prod | React + AG Grid | 515.24 ± 10.51 | 336.44 ± 7.38 |

## Change Rows from 1,000 to 100,000 (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 117.60 ± 114.21 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 60.60 ± 1.85 |

## Change Rows from 1,000 to 100,000 (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.74 ± 0.05 |
| Chromium | dev | React + AG Grid | 170.42 ± 109.72 |
| Chromium | prod | Neo.mjs | 16.76 ± 0.05 |
| Chromium | prod | React + AG Grid | 113.08 ± 26.16 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 78.88 ± 3.40 | 36.16 ± 0.38 |
| Chromium | dev | React + AG Grid | 70.88 ± 8.25 | 46.62 ± 4.52 |
| Chromium | prod | Neo.mjs | 80.48 ± 0.53 | 35.82 ± 1.10 |
| Chromium | prod | React + AG Grid | 42.70 ± 0.82 | 28.46 ± 1.74 |

## Change Rows from 1,000 to 5,000 (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## Change Rows from 1,000 to 5,000 (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.72 ± 0.04 |
| Chromium | dev | React + AG Grid | 36.22 ± 7.83 |
| Chromium | prod | Neo.mjs | 16.72 ± 0.04 |
| Chromium | prod | React + AG Grid | 22.48 ± 1.63 |

## filter-grid (clear)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.22 ± 0.12 |
| Chromium | dev | React + AG Grid | 34.10 ± 2.54 |
| Chromium | prod | Neo.mjs | 16.16 ± 0.45 |
| Chromium | prod | React + AG Grid | 11.96 ± 0.80 |

## filter-grid (clear) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## filter-grid (clear) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 14.66 ± 0.08 |
| Chromium | dev | React + AG Grid | 35.68 ± 3.08 |
| Chromium | prod | Neo.mjs | 14.62 ± 0.22 |
| Chromium | prod | React + AG Grid | 13.04 ± 1.57 |

## filter-grid (first)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 15.96 ± 0.95 |
| Chromium | dev | React + AG Grid | 47.98 ± 3.04 |
| Chromium | prod | Neo.mjs | 16.18 ± 0.57 |
| Chromium | prod | React + AG Grid | 25.26 ± 1.70 |

## filter-grid (first) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## filter-grid (first) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 14.52 ± 1.16 |
| Chromium | dev | React + AG Grid | 33.11 ± 9.24 |
| Chromium | prod | Neo.mjs | 14.62 ± 0.89 |
| Chromium | prod | React + AG Grid | 21.89 ± 0.87 |

## filter-grid (second)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 19.64 ± 6.55 |
| Chromium | dev | React + AG Grid | 31.62 ± 2.48 |
| Chromium | prod | Neo.mjs | 19.54 ± 6.75 |
| Chromium | prod | React + AG Grid | 12.42 ± 0.96 |

## filter-grid (second) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## filter-grid (second) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 15.18 ± 0.85 |
| Chromium | dev | React + AG Grid | 34.82 ± 7.52 |
| Chromium | prod | Neo.mjs | 14.98 ± 0.87 |
| Chromium | prod | React + AG Grid | 17.76 ± 1.03 |


The data is aggregated over **5 run(s)**.

## System Information

| Property   | Value       |
|------------|-------------|
| OS Name    | macOS |
| OS Version | 27.0.1 |
| CPU Model  | Apple M5 Max |
| CPU Cores  | 18 |
| Total RAM  | 128GB |
| Node.js    | v25.9.0 |
| Playwright | 1.64.1 |
| Platform   | darwin |
| Architecture | arm64 |

## Library Versions

| Library    | Version     |
|------------|-------------|
| Neo.mjs    | 13.3.1 |
| React      | 19.1.1 |
| AG Grid Community / React | 36.2.0 |

## Browser Versions

| Browser    | Version     |
|------------|-------------|
| Chrome     | Google Chrome 155.0.8059.85 |
| Firefox    | Not found |
| Safari     | Safari kMDItemVersion = "27.0.1" |

---
*This file is auto-generated on Mon, 26 Oct 2026 00:19:20 GMT. Do not edit manually.*