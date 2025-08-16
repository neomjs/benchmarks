# Neo Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 2963.70 | 2997.50 | 2979.26 ± 11.24 | 380.20 | 400.90 | 386.78 ± 7.58 |
| Chromium | prod | 2974.60 | 3172.90 | 3043.60 ± 72.15 | 384.90 | 403.50 | 395.26 ± 7.65 |
| Firefox | dev | 2142.00 | 2222.00 | 2170.20 ± 29.49 | 382.00 | 391.00 | 386.80 ± 3.66 |
| Firefox | prod | 2154.00 | 2204.00 | 2171.00 ± 17.85 | 383.00 | 402.00 | 390.60 ± 6.53 |
| Webkit | dev | 2765.00 | 2962.00 | 2892.20 ± 67.46 | 382.00 | 424.00 | 405.40 ± 14.35 |
| Webkit | prod | 2799.00 | 3015.00 | 2896.40 ± 70.56 | 380.00 | 483.00 | 419.20 ± 40.88 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 75.00 | 87.50 | 77.64 ± 4.93 | 25.70 | 31.60 | 27.60 ± 2.13 |
| Chromium | prod | 75.20 | 88.40 | 78.32 ± 5.06 | 26.40 | 32.10 | 28.18 ± 2.04 |
| Firefox | dev | 90.00 | 102.00 | 94.80 ± 4.26 | 31.00 | 39.00 | 33.60 ± 2.87 |
| Firefox | prod | 84.00 | 96.00 | 91.80 ± 4.12 | 30.00 | 33.00 | 31.60 ± 1.02 |
| Webkit | dev | 95.00 | 124.00 | 112.40 ± 13.43 | 29.00 | 51.00 | 43.80 ± 8.61 |
| Webkit | prod | 98.00 | 133.00 | 119.80 ± 11.62 | 32.00 | 57.00 | 47.00 ± 8.17 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 830.90 | 847.00 | 835.48 ± 5.85 | 157.80 | 163.90 | 161.02 ± 2.46 |
| Chromium | prod | 832.80 | 996.00 | 871.20 ± 62.70 | 149.70 | 225.20 | 169.48 ± 28.04 |
| Firefox | dev | 662.00 | 706.00 | 688.00 ± 17.03 | 112.00 | 154.00 | 137.80 ± 13.91 |
| Firefox | prod | 629.00 | 675.00 | 656.40 ± 17.42 | 104.00 | 137.00 | 122.00 ± 12.70 |
| Webkit | dev | 440.00 | 480.00 | 453.60 ± 14.32 | 126.00 | 136.00 | 130.60 ± 3.56 |
| Webkit | prod | 434.00 | 476.00 | 455.20 ± 15.71 | 115.00 | 165.00 | 140.00 ± 18.68 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 96.10 | 100.10 | 98.04 ± 1.43 | 23.90 | 27.50 | 25.54 ± 1.25 |
| Chromium | prod | 96.10 | 100.30 | 98.58 ± 1.40 | 24.10 | 26.10 | 25.28 ± 0.78 |
| Firefox | dev | 100.00 | 112.00 | 105.60 ± 4.59 | 34.00 | 37.00 | 35.60 ± 1.02 |
| Firefox | prod | 98.00 | 110.00 | 103.20 ± 4.35 | 35.00 | 38.00 | 36.40 ± 1.36 |
| Webkit | dev | 109.00 | 126.00 | 118.40 ± 7.00 | 30.00 | 53.00 | 41.40 ± 9.58 |
| Webkit | prod | 112.00 | 143.00 | 128.60 ± 11.74 | 31.00 | 60.00 | 50.00 ± 10.43 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 26.00 | 33.30 | 28.12 ± 2.69 |
| Chromium | prod | 25.00 | 33.30 | 28.54 ± 3.07 |
| Firefox | dev | 33.00 | 50.00 | 38.00 ± 6.13 |
| Firefox | prod | 5.00 | 48.00 | 31.80 ± 14.27 |
| Webkit | dev | 30.00 | 43.00 | 37.20 ± 4.26 |
| Webkit | prod | 35.00 | 70.00 | 47.80 ± 13.01 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 58.50 | 78.80 | 66.52 ± 9.47 |
| Chromium | prod | 58.40 | 80.50 | 67.34 ± 7.99 |
| Firefox | dev | 54.00 | 59.00 | 56.00 ± 1.79 |
| Firefox | prod | 45.00 | 58.00 | 55.00 ± 5.02 |
| Webkit | dev | 89.00 | 115.00 | 101.60 ± 9.99 |
| Webkit | prod | 87.00 | 110.00 | 95.40 ± 8.14 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 22.70 | 31.10 | 25.58 ± 3.01 |
| Chromium | prod | 22.80 | 29.60 | 27.34 ± 2.45 |
| Firefox | dev | 29.00 | 50.00 | 38.40 ± 8.78 |
| Firefox | prod | 32.00 | 49.00 | 38.40 ± 7.50 |
| Webkit | dev | 63.00 | 70.00 | 66.00 ± 2.28 |
| Webkit | prod | 38.00 | 74.00 | 55.00 ± 12.57 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

