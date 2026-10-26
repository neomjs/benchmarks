# React Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 1816.90 | 1969.00 | 1902.70 ± 61.39 | 1058.90 | 1141.50 | 1088.68 ± 29.70 |
| Chromium | prod | 1872.50 | 2231.20 | 1955.64 ± 138.10 | 1090.50 | 1375.80 | 1157.14 ± 109.51 |

## Change Columns from 50 to 200 (with 100k rows) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 317.00 | 343.00 | 325.20 ± 9.13 |
| Chromium | prod | 328.00 | 347.00 | 337.00 ± 6.23 |

## Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 350.00 | 432.40 | 366.52 ± 32.94 |
| Chromium | prod | 366.70 | 383.40 | 376.68 ± 8.15 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 55.70 | 70.20 | 59.64 ± 5.54 | 38.00 | 45.20 | 39.78 ± 2.75 |
| Chromium | prod | 25.80 | 33.70 | 30.18 ± 2.69 | 15.20 | 29.40 | 22.68 ± 5.65 |

## Change Columns from 50 to 75 (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## Change Columns from 50 to 75 (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 38.30 | 50.40 | 47.43 ± 4.61 |
| Chromium | prod | 23.10 | 28.90 | 25.90 ± 2.12 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 514.30 | 863.60 | 594.34 ± 134.98 | 337.30 | 670.60 | 410.38 ± 130.26 |
| Chromium | prod | 506.50 | 535.80 | 515.24 ± 10.51 | 331.30 | 351.10 | 336.44 ± 7.38 |

## Change Rows from 1,000 to 100,000 (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 58.00 | 346.00 | 117.60 ± 114.21 |
| Chromium | prod | 58.00 | 63.00 | 60.60 ± 1.85 |

## Change Rows from 1,000 to 100,000 (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 100.00 | 383.30 | 170.42 ± 109.72 |
| Chromium | prod | 99.90 | 165.40 | 113.08 ± 26.16 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 59.50 | 85.20 | 70.88 ± 8.25 | 40.20 | 53.30 | 46.62 ± 4.52 |
| Chromium | prod | 42.00 | 44.20 | 42.70 ± 0.82 | 25.30 | 30.10 | 28.46 ± 1.74 |

## Change Rows from 1,000 to 5,000 (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## Change Rows from 1,000 to 5,000 (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 29.90 | 51.30 | 36.22 ± 7.83 |
| Chromium | prod | 20.80 | 24.70 | 22.48 ± 1.63 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 32.30 | 39.10 | 34.10 ± 2.54 |
| Chromium | prod | 10.80 | 13.00 | 11.96 ± 0.80 |

## filter-grid (clear) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## filter-grid (clear) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 32.10 | 40.60 | 35.68 ± 3.08 |
| Chromium | prod | 11.20 | 15.50 | 13.04 ± 1.57 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 43.40 | 52.00 | 47.98 ± 3.04 |
| Chromium | prod | 23.40 | 28.20 | 25.26 ± 1.70 |

## filter-grid (first) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## filter-grid (first) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 19.20 | 46.53 | 33.11 ± 9.24 |
| Chromium | prod | 20.60 | 23.10 | 21.89 ± 0.87 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 28.20 | 34.50 | 31.62 ± 2.48 |
| Chromium | prod | 10.90 | 13.90 | 12.42 ± 0.96 |

## filter-grid (second) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## filter-grid (second) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 24.80 | 47.90 | 34.82 ± 7.52 |
| Chromium | prod | 16.20 | 19.40 | 17.76 ± 1.03 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 27.0.1 (arm64)
* **CPU:** Apple M5 Max (18 cores @ UnknownGHz)
* **Memory:** 128GB
* **Node.js:** v25.9.0
* **Playwright:** 1.64.1

## Library Versions
* **Neo.mjs:** 13.3.1
* **React:** 19.1.1
* **AG Grid Community / React:** 36.2.0

