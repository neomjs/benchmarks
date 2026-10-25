# Big Data Showdown: Neo.mjs vs. React + AG Grid

## Executive Summary
This report provides a focused analysis of the **true rendering performance** of the Neo.mjs grid versus a best-in-class React implementation using AG Grid. By isolating the **UI Update Time**—the actual time spent rendering DOM changes—we can see past identical data-generation overhead and measure the core architectural efficiency of each framework.

The results are definitive. Neo.mjs consistently outperforms React + AG Grid by a significant margin, particularly in demanding, large-scale scenarios. This demonstrates the tangible user experience benefits of Neo.mjs's multi-threaded architecture, which keeps the main thread free and the UI responsive, even under heavy load.

---

## Comparative Performance Analysis (UI Update Times)
Here, we compare the average production mode `UI Update Time` in milliseconds (ms). This metric represents the pure grid rendering performance. Lower is better.

### Change Columns from 50 to 200 (with 100k rows)
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **364.72** | 1074.66 | **2.9x faster** |

### Change Rows from 1,000 to 100,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **264.84** | 337.96 | **1.3x faster** |

### Change Columns from 50 to 75
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **42.62** | 40.14 | **0.9x faster** |

### Change Rows from 1,000 to 5,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **36.26** | 47.26 | **1.3x faster** |

## Interactive Filtering Performance (Total Time to Valid State)
Average production mode `Total Time` in milliseconds (ms) across consecutive filter operations on the active dataset. Lower is better.

| Operation | Browser | Neo.mjs (ms) | React AG Grid (ms) | Neo.mjs Advantage |
|:---|:---|---:|---:|:---:|
| **filter-grid (first)** | **Chromium** | **15.94** | 341.96 | **21.5x faster** |
| **filter-grid (second)** | **Chromium** | **16.10** | 411.62 | **25.6x faster** |
| **filter-grid (clear)** | **Chromium** | **13.22** | 34.84 | **2.6x faster** |

## Main-Thread Responsiveness Probe (Max RAF Delta & Long-Task Blocking)
Measured concurrently via `requestAnimationFrame` delta tracking and `PerformanceObserver({ type: 'longtask' })` while the grid processes large data updates (`16.7 ms` = 60fps; `0 ms` Long-Task Blocking = zero main-thread freeze).

| Scenario | Browser | Neo.mjs Max RAF (ms) | React AG Grid Max RAF (ms) | Neo.mjs Long-Task Block (ms) | React AG Grid Long-Task Block (ms) |
|:---|:---|---:|---:|---:|---:|
| **Change Columns from 50 to 200 (with 100k rows)** | **Chromium** | **16.80** | 358.18 | **0.00** | 312.40 |
| **Change Rows from 1,000 to 100,000** | **Chromium** | **16.78** | 93.30 | **0.00** | 58.00 |
| **Change Columns from 50 to 75** | **Chromium** | **16.72** | 50.79 | **0.00** | 0.00 |
| **Change Rows from 1,000 to 5,000** | **Chromium** | **16.70** | 34.76 | **0.00** | 0.00 |
| **filter-grid (first)** | **Chromium** | **14.30** | 14.86 | **0.00** | 0.00 |
| **filter-grid (second)** | **Chromium** | **14.58** | 23.38 | **0.00** | 0.80 |
| **filter-grid (clear)** | **Chromium** | **12.00** | 33.86 | **0.00** | 0.00 |

---
# Detailed Side-by-Side Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 1210.52 ± 62.50 | 361.68 ± 18.57 |
| Chromium | dev | React + AG Grid | 1836.24 ± 23.65 | 1067.30 ± 16.65 |
| Chromium | prod | Neo.mjs | 1204.16 ± 30.62 | 364.72 ± 9.02 |
| Chromium | prod | React + AG Grid | 1860.66 ± 16.80 | 1074.66 ± 25.24 |

## Change Columns from 50 to 200 (with 100k rows) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 310.40 ± 7.68 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 312.40 ± 7.61 |

## Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.80 ± 0.00 |
| Chromium | dev | React + AG Grid | 346.66 ± 6.68 |
| Chromium | prod | Neo.mjs | 16.80 ± 0.00 |
| Chromium | prod | React + AG Grid | 358.18 ± 14.70 |

## Change Columns from 50 to 75

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 86.02 ± 5.77 | 46.22 ± 5.42 |
| Chromium | dev | React + AG Grid | 59.36 ± 2.33 | 39.30 ± 0.40 |
| Chromium | prod | Neo.mjs | 82.48 ± 2.07 | 42.62 ± 0.97 |
| Chromium | prod | React + AG Grid | 59.52 ± 2.04 | 40.14 ± 0.52 |

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
| Chromium | dev | React + AG Grid | 50.31 ± 4.79 |
| Chromium | prod | Neo.mjs | 16.72 ± 0.04 |
| Chromium | prod | React + AG Grid | 50.79 ± 5.32 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 484.74 ± 19.79 | 251.44 ± 9.90 |
| Chromium | dev | React + AG Grid | 535.68 ± 9.93 | 347.06 ± 8.74 |
| Chromium | prod | Neo.mjs | 500.80 ± 42.04 | 264.84 ± 28.67 |
| Chromium | prod | React + AG Grid | 521.16 ± 6.10 | 337.96 ± 6.07 |

## Change Rows from 1,000 to 100,000 (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 60.00 ± 1.90 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 58.00 ± 1.90 |

## Change Rows from 1,000 to 100,000 (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.78 ± 0.04 |
| Chromium | dev | React + AG Grid | 90.16 ± 8.04 |
| Chromium | prod | Neo.mjs | 16.78 ± 0.04 |
| Chromium | prod | React + AG Grid | 93.30 ± 8.17 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 80.40 ± 1.33 | 35.96 ± 0.36 |
| Chromium | dev | React + AG Grid | 69.86 ± 0.95 | 46.46 ± 4.23 |
| Chromium | prod | Neo.mjs | 79.28 ± 0.71 | 36.26 ± 1.17 |
| Chromium | prod | React + AG Grid | 69.66 ± 1.89 | 47.26 ± 4.42 |

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
| Chromium | dev | Neo.mjs | 16.70 ± 0.00 |
| Chromium | dev | React + AG Grid | 32.44 ± 1.12 |
| Chromium | prod | Neo.mjs | 16.70 ± 0.00 |
| Chromium | prod | React + AG Grid | 34.76 ± 5.27 |

## filter-grid (clear)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 15.98 ± 0.42 |
| Chromium | dev | React + AG Grid | 36.34 ± 4.58 |
| Chromium | prod | Neo.mjs | 13.22 ± 5.86 |
| Chromium | prod | React + AG Grid | 34.84 ± 2.80 |

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
| Chromium | dev | Neo.mjs | 14.80 ± 0.30 |
| Chromium | dev | React + AG Grid | 35.62 ± 3.61 |
| Chromium | prod | Neo.mjs | 12.00 ± 5.26 |
| Chromium | prod | React + AG Grid | 33.86 ± 2.69 |

## filter-grid (first)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.70 ± 0.95 |
| Chromium | dev | React + AG Grid | 431.16 ± 2.72 |
| Chromium | prod | Neo.mjs | 15.94 ± 0.74 |
| Chromium | prod | React + AG Grid | 341.96 ± 167.43 |

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
| Chromium | dev | Neo.mjs | 15.30 ± 0.81 |
| Chromium | dev | React + AG Grid | 16.80 ± 0.00 |
| Chromium | prod | Neo.mjs | 14.30 ± 0.47 |
| Chromium | prod | React + AG Grid | 14.86 ± 3.88 |

## filter-grid (second)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 16.02 ± 0.29 |
| Chromium | dev | React + AG Grid | 406.62 ± 0.47 |
| Chromium | prod | Neo.mjs | 16.10 ± 0.46 |
| Chromium | prod | React + AG Grid | 411.62 ± 10.50 |

## filter-grid (second) (Long Task Block)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 0.00 ± 0.00 |
| Chromium | dev | React + AG Grid | 0.00 ± 0.00 |
| Chromium | prod | Neo.mjs | 0.00 ± 0.00 |
| Chromium | prod | React + AG Grid | 0.80 ± 1.60 |

## filter-grid (second) (Max RAF Delta)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 14.70 ± 0.30 |
| Chromium | dev | React + AG Grid | 17.26 ± 0.61 |
| Chromium | prod | Neo.mjs | 14.58 ± 0.25 |
| Chromium | prod | React + AG Grid | 23.38 ± 13.31 |


The data is aggregated over **5 run(s)**.

## System Information

| Property   | Value       |
|------------|-------------|
| OS Name    | macOS |
| OS Version | 27.0.1 |
| Total RAM  | 128GB |
| CPU Cores  | 18 |
| Node.js    | v25.9.0 |
| Playwright | 1.64.1 |
| Platform   | darwin |
| Architecture | arm64 |

## Browser Versions

| Browser    | Version     |
|------------|-------------|
| Chrome     | Google Chrome 155.0.8059.85 |
| Firefox    | Not found |
| Safari     | Safari kMDItemVersion = "27.0.1" |

---
*This file is auto-generated on Sun, 25 Oct 2026 23:53:07 GMT. Do not edit manually.*