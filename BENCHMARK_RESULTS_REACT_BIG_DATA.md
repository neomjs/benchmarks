# React Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 1818.10 | 1860.80 | 1837.88 ± 13.91 | 1065.20 | 1094.90 | 1082.46 ± 10.68 |
| Chromium | prod | 1814.30 | 1873.10 | 1839.10 ± 21.48 | 1034.50 | 1120.70 | 1082.58 ± 30.27 |

## Change Columns from 50 to 200 (with 100k rows) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 312.00 | 337.00 | 323.80 ± 8.16 |
| Chromium | prod | 307.00 | 343.00 | 328.80 ± 13.18 |

## Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 350.00 | 410.30 | 372.08 ± 20.17 |
| Chromium | prod | 350.00 | 408.90 | 378.44 ± 19.60 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 54.90 | 58.60 | 57.10 ± 1.28 | 37.30 | 38.30 | 37.86 ± 0.33 |
| Chromium | prod | 28.70 | 32.30 | 29.80 ± 1.32 | 24.10 | 27.70 | 25.26 ± 1.32 |

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
| Chromium | dev | 49.10 | 52.10 | 51.41 ± 1.16 |
| Chromium | prod | 22.50 | 26.80 | 24.09 ± 1.53 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 519.30 | 524.60 | 522.26 ± 1.75 | 334.20 | 344.00 | 340.08 ± 3.96 |
| Chromium | prod | 483.10 | 518.20 | 502.26 ± 13.83 | 314.00 | 335.60 | 327.04 ± 7.90 |

## Change Rows from 1,000 to 100,000 (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 58.00 | 63.00 | 59.80 ± 1.72 |
| Chromium | prod | 55.00 | 63.00 | 59.60 ± 3.20 |

## Change Rows from 1,000 to 100,000 (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 83.30 | 166.60 | 116.30 ± 40.38 |
| Chromium | prod | 83.30 | 100.00 | 90.02 ± 8.15 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 67.80 | 71.50 | 69.50 ± 1.46 | 42.50 | 50.60 | 47.66 ± 2.91 |
| Chromium | prod | 40.60 | 44.80 | 42.08 ± 1.46 | 24.00 | 28.30 | 26.28 ± 1.59 |

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
| Chromium | dev | 27.60 | 44.90 | 33.84 ± 5.85 |
| Chromium | prod | 19.10 | 24.20 | 20.74 ± 1.83 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 29.60 | 33.60 | 31.40 ± 1.34 |
| Chromium | prod | 10.80 | 11.60 | 11.04 ± 0.30 |

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
| Chromium | dev | 30.60 | 36.70 | 34.22 ± 2.21 |
| Chromium | prod | 11.10 | 18.60 | 13.78 ± 2.63 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 46.90 | 56.00 | 52.22 ± 3.38 |
| Chromium | prod | 25.50 | 34.10 | 29.40 ± 2.75 |

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
| Chromium | dev | 30.10 | 47.40 | 38.79 ± 6.63 |
| Chromium | prod | 20.20 | 29.30 | 23.71 ± 3.01 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 26.20 | 35.80 | 30.60 ± 3.52 |
| Chromium | prod | 8.50 | 12.60 | 11.36 ± 1.46 |

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
| Chromium | dev | 20.40 | 34.40 | 28.04 ± 5.84 |
| Chromium | prod | 12.10 | 24.40 | 18.48 ± 3.92 |

## scroll-diagonal-2d

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 133.50 | 134.10 | 133.78 ± 0.19 |
| Chromium | prod | 133.10 | 133.60 | 133.34 ± 0.22 |

## scroll-diagonal-2d (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## scroll-diagonal-2d (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 16.70 | 16.70 | 16.70 ± 0.00 |
| Chromium | prod | 16.70 | 16.80 | 16.78 ± 0.04 |

## scroll-horizontal-200-cols

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 122.10 | 129.00 | 125.94 ± 2.44 |
| Chromium | prod | 134.40 | 134.80 | 134.62 ± 0.13 |

## scroll-horizontal-200-cols (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## scroll-horizontal-200-cols (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 16.70 | 16.80 | 16.72 ± 0.04 |
| Chromium | prod | 16.70 | 16.80 | 16.76 ± 0.05 |

## scroll-vertical-100k

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 148.50 | 175.50 | 157.88 ± 10.36 |
| Chromium | prod | 123.40 | 130.90 | 127.82 ± 3.05 |

## scroll-vertical-100k (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 0.00 | 0.00 ± 0.00 |

## scroll-vertical-100k (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 33.20 | 33.40 | 33.32 ± 0.07 |
| Chromium | prod | 16.70 | 16.80 | 16.74 ± 0.05 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 27.0.1 (arm64)
* **CPU:** Apple M5 Max (18 cores @ UnknownGHz)
* **Memory:** 128GB
* **Node.js:** v25.9.0
* **Playwright:** 1.64.1

## Library Versions
* **Neo.mjs:** 13.3.1 (npm) + neomjs/neo#20116 hot-path sync (056f5493c2)
* **React:** 19.1.1
* **AG Grid Community / React:** 36.2.0

