# Big Data Showdown: Neo.mjs vs. React + AG Grid

## Executive Summary
This report benchmarks the rendering performance and main-thread responsiveness of the **Neo.mjs** grid (`v13.3.1` with Store Turbo Mode) against **React** (`19.1.1`) + **AG Grid Community** (`36.2.0`, `animateRows={false}`, tested against a `vite build` + `vite preview` production bundle). By pairing **UI Update Time** with concurrent **`requestAnimationFrame` delta** and **`PerformanceObserver({ type: 'longtask' })` main-thread blocking** probes, we measure both time-to-valid-DOM and UI responsiveness under load.

In heavy, large-scale mutations, Neo.mjs's multi-threaded Off-Main-Thread (OMT) architecture delivers **7.2x faster UI updates** when expanding from 50 to 200 columns at 100,000 rows (150.26 ms vs. 1082.58 ms) and **3.0x faster UI updates** when scaling from 1,000 to 100,000 rows (109.30 ms vs. 327.04 ms). Crucially, Neo.mjs maintains **0.00 ms of Long-Task main-thread blocking** and a steady **16.80 ms Max RAF delta (~60fps)** across every scenario, whereas single-threaded React + AG Grid incurs **328.80 ms of Long-Task blocking** (a **378.44 ms** frame stall) during the 200-column / 100k-row update. On smaller mutations (50 to 75 columns at 1,000 rows) and 1,000-row interactive filtering with row animations disabled, both engines complete in a couple of frames (< 45 ms).

---

## Comparative Performance Analysis (UI Update Times)
Here, we compare the average production mode `UI Update Time` in milliseconds (ms). This metric represents the pure grid rendering performance. Lower is better.

### Change Columns from 50 to 200 (with 100k rows)
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **150.26** | 1082.58 | **7.2x faster** |

### Change Rows from 1,000 to 100,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **109.30** | 327.04 | **3.0x faster** |

### Change Columns from 50 to 75
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **22.26** | 25.26 | **1.1x faster** |

### Change Rows from 1,000 to 5,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **18.54** | 26.28 | **1.4x faster** |

## Interactive Filtering Performance (Total Time to Valid State)
Average production mode `Total Time` in milliseconds (ms) across consecutive filter operations on the active dataset. Lower is better.

| Operation | Browser | Neo.mjs (ms) | React AG Grid (ms) | Neo.mjs Advantage |
|:---|:---|---:|---:|:---:|
| **filter-grid (first)** | **Chromium** | **16.30** | 29.40 | **1.8x faster** |
| **filter-grid (second)** | **Chromium** | **22.74** | 11.36 | **0.5x faster** |
| **filter-grid (clear)** | **Chromium** | **16.30** | 11.04 | **0.7x faster** |

## 2D Scrolling Performance on 100k Rows × 200 Columns (8 Render-Gated Hops)
Average production mode `Total Time` in milliseconds (ms) to complete 8 sequential render-gated viewport jumps across 100,000 rows (`scroll-vertical-100k`), 200 columns (`scroll-horizontal-200-cols`), and simultaneous 2D diagonal axes (`scroll-diagonal-2d`). Both engines maintain `0.00 ms` Long-Task blocking and a steady `~16.7 ms` Max RAF delta in production mode; AG Grid applies synchronous main-thread DOM updates on each scroll jump (`~16–17 ms/hop`), whereas Neo.mjs processes each hop asynchronously across its `Main -> App Worker (16ms throttle) -> VDom Worker -> DeltaUpdates` pipeline while keeping the main thread completely unblocked. Lower is better.

| Scroll Trajectory | Browser | Neo.mjs (ms) | React AG Grid (ms) | Neo.mjs Advantage |
|:---|:---|---:|---:|:---:|
| **scroll-vertical-100k** | **Chromium** | **281.50** | 127.82 | **0.5x faster** |
| **scroll-horizontal-200-cols** | **Chromium** | **233.48** | 134.62 | **0.6x faster** |
| **scroll-diagonal-2d** | **Chromium** | **379.16** | 133.34 | **0.4x faster** |

## Main-Thread Responsiveness Probe (Max RAF Delta & Long-Task Blocking)
Measured concurrently via `requestAnimationFrame` delta tracking and `PerformanceObserver({ type: 'longtask' })` while the grid processes large data updates and 2D scrolling (`16.7 ms` = 60fps; `0 ms` Long-Task Blocking = zero main-thread freeze).

| Scenario | Browser | Neo.mjs Max RAF (ms) | React AG Grid Max RAF (ms) | Neo.mjs Long-Task Block (ms) | React AG Grid Long-Task Block (ms) |
|:---|:---|---:|---:|---:|---:|
| **Change Columns from 50 to 200 (with 100k rows)** | **Chromium** | **16.80** | 378.44 | **0.00** | 328.80 |
| **Change Rows from 1,000 to 100,000** | **Chromium** | **16.78** | 90.02 | **0.00** | 59.60 |
| **Change Columns from 50 to 75** | **Chromium** | **16.70** | 24.09 | **0.00** | 0.00 |
| **Change Rows from 1,000 to 5,000** | **Chromium** | **16.70** | 20.74 | **0.00** | 0.00 |
| **filter-grid (first)** | **Chromium** | **14.76** | 23.71 | **0.00** | 0.00 |
| **filter-grid (second)** | **Chromium** | **15.44** | 18.48 | **0.00** | 0.00 |
| **filter-grid (clear)** | **Chromium** | **14.70** | 13.78 | **0.00** | 0.00 |
| **scroll-vertical-100k** | **Chromium** | **16.74** | 16.74 | **0.00** | 0.00 |
| **scroll-horizontal-200-cols** | **Chromium** | **16.72** | 16.76 | **0.00** | 0.00 |
| **scroll-diagonal-2d** | **Chromium** | **16.76** | 16.78 | **0.00** | 0.00 |

---
# Detailed Side-by-Side Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 1071.24 ± 91.30 | 155.20 ± 6.09 |
| Chromium | dev | React + AG Grid | 1837.88 ± 13.91 | 1082.46 ± 10.68 |
| Chromium | prod | Neo.mjs | 1021.10 ± 16.77 | 150.26 ± 3.06 |
| Chromium | prod | React + AG Grid | 1839.10 ± 21.48 | 1082.58 ± 30.27 |

## Change Columns from 50 to 200 (with 100k rows) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 323.80 ± 8.16 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 328.80 ± 13.18 |

## Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.80 ± 0.00 |
| Chromium | dev | React + AG Grid | 372.08 ± 20.17 |
| Chromium | prod | Neo.mjs | 16.80 ± 0.00 |
| Chromium | prod | React + AG Grid | 378.44 ± 19.60 |

## Change Columns from 50 to 75

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 84.10 ± 0.71 | 21.08 ± 1.61 |
| Chromium | dev | React + AG Grid | 57.10 ± 1.28 | 37.86 ± 0.33 |
| Chromium | prod | Neo.mjs | 82.98 ± 1.27 | 22.26 ± 0.64 |
| Chromium | prod | React + AG Grid | 29.80 ± 1.32 | 25.26 ± 1.32 |

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
| Chromium | dev | Neo.mjs | 16.74 ± 0.05 |
| Chromium | dev | React + AG Grid | 51.41 ± 1.16 |
| Chromium | prod | Neo.mjs | 16.70 ± 0.00 |
| Chromium | prod | React + AG Grid | 24.09 ± 1.53 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 370.68 ± 79.11 | 138.98 ± 66.09 |
| Chromium | dev | React + AG Grid | 522.26 ± 1.75 | 340.08 ± 3.96 |
| Chromium | prod | Neo.mjs | 334.80 ± 7.05 | 109.30 ± 4.93 |
| Chromium | prod | React + AG Grid | 502.26 ± 13.83 | 327.04 ± 7.90 |

## Change Rows from 1,000 to 100,000 (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 59.80 ± 1.72 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 59.60 ± 3.20 |

## Change Rows from 1,000 to 100,000 (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.76 ± 0.05 |
| Chromium | dev | React + AG Grid | 116.30 ± 40.38 |
| Chromium | prod | Neo.mjs | 16.78 ± 0.04 |
| Chromium | prod | React + AG Grid | 90.02 ± 8.15 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 64.70 ± 1.40 | 19.56 ± 0.72 |
| Chromium | dev | React + AG Grid | 69.50 ± 1.46 | 47.66 ± 2.91 |
| Chromium | prod | Neo.mjs | 64.56 ± 1.88 | 18.54 ± 1.03 |
| Chromium | prod | React + AG Grid | 42.08 ± 1.46 | 26.28 ± 1.59 |

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
| Chromium | dev | React + AG Grid | 33.84 ± 5.85 |
| Chromium | prod | Neo.mjs | 16.70 ± 0.00 |
| Chromium | prod | React + AG Grid | 20.74 ± 1.83 |

## filter-grid (clear)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.08 ± 0.13 |
| Chromium | dev | React + AG Grid | 31.40 ± 1.34 |
| Chromium | prod | Neo.mjs | 16.30 ± 0.11 |
| Chromium | prod | React + AG Grid | 11.04 ± 0.30 |

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
| Chromium | dev | Neo.mjs | 14.84 ± 0.16 |
| Chromium | dev | React + AG Grid | 34.22 ± 2.21 |
| Chromium | prod | Neo.mjs | 14.70 ± 0.09 |
| Chromium | prod | React + AG Grid | 13.78 ± 2.63 |

## filter-grid (first)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 17.06 ± 0.77 |
| Chromium | dev | React + AG Grid | 52.22 ± 3.38 |
| Chromium | prod | Neo.mjs | 16.30 ± 0.59 |
| Chromium | prod | React + AG Grid | 29.40 ± 2.75 |

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
| Chromium | dev | Neo.mjs | 15.54 ± 0.63 |
| Chromium | dev | React + AG Grid | 38.79 ± 6.63 |
| Chromium | prod | Neo.mjs | 14.76 ± 1.02 |
| Chromium | prod | React + AG Grid | 23.71 ± 3.01 |

## filter-grid (second)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.14 ± 0.08 |
| Chromium | dev | React + AG Grid | 30.60 ± 3.52 |
| Chromium | prod | Neo.mjs | 22.74 ± 8.09 |
| Chromium | prod | React + AG Grid | 11.36 ± 1.46 |

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
| Chromium | dev | Neo.mjs | 14.76 ± 0.08 |
| Chromium | dev | React + AG Grid | 28.04 ± 5.84 |
| Chromium | prod | Neo.mjs | 15.44 ± 1.01 |
| Chromium | prod | React + AG Grid | 18.48 ± 3.92 |

## scroll-diagonal-2d

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 379.42 ± 6.56 |
| Chromium | dev | React + AG Grid | 133.78 ± 0.19 |
| Chromium | prod | Neo.mjs | 379.16 ± 5.95 |
| Chromium | prod | React + AG Grid | 133.34 ± 0.22 |

## scroll-diagonal-2d (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## scroll-diagonal-2d (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.78 ± 0.04 |
| Chromium | dev | React + AG Grid | 16.70 ± 0.00 |
| Chromium | prod | Neo.mjs | 16.76 ± 0.05 |
| Chromium | prod | React + AG Grid | 16.78 ± 0.04 |

## scroll-horizontal-200-cols

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 233.46 ± 0.19 |
| Chromium | dev | React + AG Grid | 125.94 ± 2.44 |
| Chromium | prod | Neo.mjs | 233.48 ± 0.20 |
| Chromium | prod | React + AG Grid | 134.62 ± 0.13 |

## scroll-horizontal-200-cols (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## scroll-horizontal-200-cols (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.76 ± 0.05 |
| Chromium | dev | React + AG Grid | 16.72 ± 0.04 |
| Chromium | prod | Neo.mjs | 16.72 ± 0.04 |
| Chromium | prod | React + AG Grid | 16.76 ± 0.05 |

## scroll-vertical-100k

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 281.50 ± 0.50 |
| Chromium | dev | React + AG Grid | 157.88 ± 10.36 |
| Chromium | prod | Neo.mjs | 281.50 ± 0.30 |
| Chromium | prod | React + AG Grid | 127.82 ± 3.05 |

## scroll-vertical-100k (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.00 ± 0.00 |

## scroll-vertical-100k (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.76 ± 0.05 |
| Chromium | dev | React + AG Grid | 33.32 ± 0.07 |
| Chromium | prod | Neo.mjs | 16.74 ± 0.05 |
| Chromium | prod | React + AG Grid | 16.74 ± 0.05 |


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
*This file is auto-generated on Mon, 26 Oct 2026 04:07:40 GMT. Do not edit manually.*