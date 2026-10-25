# React Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 1813.50 | 1881.10 | 1836.24 ± 23.65 | 1038.20 | 1089.90 | 1067.30 ± 16.65 |
| Chromium | prod | 1842.40 | 1892.20 | 1860.66 ± 16.80 | 1033.00 | 1108.00 | 1074.66 ± 25.24 |

## Change Columns from 50 to 200 (with 100k rows) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 297.00 | 320.00 | 310.40 ± 7.68 |
| Chromium | prod | 299.00 | 320.00 | 312.40 ± 7.61 |

## Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 333.30 | 350.00 | 346.66 ± 6.68 |
| Chromium | prod | 333.40 | 374.20 | 358.18 ± 14.70 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 57.20 | 63.70 | 59.36 ± 2.33 | 38.60 | 39.70 | 39.30 ± 0.40 |
| Chromium | prod | 57.20 | 63.30 | 59.52 ± 2.04 | 39.30 | 40.80 | 40.14 ± 0.52 |

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
| Chromium | dev | 40.90 | 53.80 | 50.31 ± 4.79 |
| Chromium | prod | 40.50 | 55.13 | 50.79 ± 5.32 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 520.40 | 547.30 | 535.68 ± 9.93 | 336.30 | 359.00 | 347.06 ± 8.74 |
| Chromium | prod | 512.80 | 529.80 | 521.16 ± 6.10 | 332.30 | 349.30 | 337.96 ± 6.07 |

## Change Rows from 1,000 to 100,000 (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 58.00 | 63.00 | 60.00 ± 1.90 |
| Chromium | prod | 56.00 | 61.00 | 58.00 ± 1.90 |

## Change Rows from 1,000 to 100,000 (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 83.40 | 100.00 | 90.16 ± 8.04 |
| Chromium | prod | 83.30 | 100.00 | 93.30 ± 8.17 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 68.40 | 71.20 | 69.86 ± 0.95 | 40.40 | 51.60 | 46.46 ± 4.23 |
| Chromium | prod | 67.30 | 73.10 | 69.66 ± 1.89 | 42.90 | 54.10 | 47.26 ± 4.42 |

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
| Chromium | dev | 31.30 | 33.90 | 32.44 ± 1.12 |
| Chromium | prod | 30.30 | 44.70 | 34.76 ± 5.27 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 32.50 | 45.00 | 36.34 ± 4.58 |
| Chromium | prod | 30.80 | 37.20 | 34.84 ± 2.80 |

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
| Chromium | dev | 32.10 | 41.50 | 35.62 ± 3.61 |
| Chromium | prod | 30.80 | 37.20 | 33.86 ± 2.69 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 428.20 | 434.60 | 431.16 ± 2.72 |
| Chromium | prod | 7.10 | 426.60 | 341.96 ± 167.43 |

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
| Chromium | dev | 16.80 | 16.80 | 16.80 ± 0.00 |
| Chromium | prod | 7.10 | 16.80 | 14.86 ± 3.88 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 406.20 | 407.50 | 406.62 ± 0.47 |
| Chromium | prod | 406.00 | 432.60 | 411.62 ± 10.50 |

## filter-grid (second) (Long Task Block)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 0.00 | 0.00 | 0.00 ± 0.00 |
| Chromium | prod | 0.00 | 4.00 | 0.80 ± 1.60 |

## filter-grid (second) (Max RAF Delta)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 16.70 | 18.10 | 17.26 ± 0.61 |
| Chromium | prod | 16.70 | 50.00 | 23.38 ± 13.31 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 27.0.1 (arm64)
* **CPU:** Apple M5 Max (18 cores @ UnknownGHz)
* **Memory:** 128GB
* **Node.js:** v25.9.0
* **Playwright:** 1.64.1

