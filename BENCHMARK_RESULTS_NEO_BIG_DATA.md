# Neo Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 3013.90 | 3117.50 | 3060.08 ± 39.51 | 385.70 | 410.90 | 400.62 ± 10.91 |
| Chromium | prod | 3002.40 | 3065.50 | 3026.40 ± 24.73 | 386.10 | 399.00 | 393.02 ± 4.71 |
| Firefox | dev | 2173.00 | 2227.00 | 2194.00 ± 21.17 | 380.00 | 399.00 | 391.60 ± 7.09 |
| Firefox | prod | 2144.00 | 2260.00 | 2186.80 ± 40.19 | 386.00 | 398.00 | 390.60 ± 4.41 |
| Webkit | dev | 2901.00 | 3146.00 | 2963.60 ± 92.86 | 399.00 | 432.00 | 413.80 ± 11.86 |
| Webkit | prod | 2859.00 | 3128.00 | 3031.20 ± 97.63 | 396.00 | 434.00 | 412.60 ± 13.23 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 75.30 | 89.30 | 80.70 ± 6.50 | 26.90 | 32.70 | 29.94 ± 2.03 |
| Chromium | prod | 75.00 | 88.90 | 80.96 ± 6.33 | 27.10 | 31.50 | 28.76 ± 1.96 |
| Firefox | dev | 87.00 | 98.00 | 90.60 ± 4.32 | 31.00 | 33.00 | 31.80 ± 0.75 |
| Firefox | prod | 88.00 | 99.00 | 92.60 ± 3.77 | 31.00 | 46.00 | 34.80 ± 5.64 |
| Webkit | dev | 112.00 | 165.00 | 130.80 ± 17.90 | 42.00 | 77.00 | 56.00 ± 11.59 |
| Webkit | prod | 94.00 | 127.00 | 116.60 ± 12.50 | 39.00 | 54.00 | 47.00 ± 6.23 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 833.20 | 866.60 | 849.82 ± 10.64 | 155.70 | 161.50 | 159.78 ± 2.10 |
| Chromium | prod | 833.70 | 865.10 | 852.58 ± 11.69 | 154.90 | 161.80 | 158.14 ± 2.37 |
| Firefox | dev | 675.00 | 708.00 | 691.00 ± 10.45 | 138.00 | 154.00 | 144.80 ± 5.84 |
| Firefox | prod | 643.00 | 708.00 | 679.60 ± 21.51 | 105.00 | 157.00 | 133.00 ± 16.72 |
| Webkit | dev | 428.00 | 463.00 | 452.20 ± 13.04 | 118.00 | 146.00 | 135.80 ± 9.72 |
| Webkit | prod | 457.00 | 627.00 | 494.00 ± 66.54 | 136.00 | 192.00 | 152.80 ± 20.86 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 95.50 | 107.10 | 100.58 ± 4.97 | 24.30 | 34.50 | 27.18 ± 3.77 |
| Chromium | prod | 96.20 | 109.20 | 101.54 ± 6.10 | 24.20 | 34.40 | 27.10 ± 3.78 |
| Firefox | dev | 103.00 | 106.00 | 105.40 ± 1.20 | 35.00 | 38.00 | 36.40 ± 1.36 |
| Firefox | prod | 107.00 | 109.00 | 107.40 ± 0.80 | 34.00 | 39.00 | 37.20 ± 1.72 |
| Webkit | dev | 112.00 | 143.00 | 129.20 ± 14.13 | 31.00 | 57.00 | 46.00 ± 11.88 |
| Webkit | prod | 112.00 | 129.00 | 121.40 ± 7.74 | 31.00 | 54.00 | 43.40 ± 9.91 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 24.90 | 27.90 | 26.50 ± 1.17 |
| Chromium | prod | 26.90 | 28.40 | 27.58 ± 0.56 |
| Firefox | dev | 40.00 | 48.00 | 45.00 ± 3.69 |
| Firefox | prod | 34.00 | 49.00 | 42.60 ± 7.03 |
| Webkit | dev | 33.00 | 45.00 | 37.60 ± 4.63 |
| Webkit | prod | 29.00 | 55.00 | 44.20 ± 9.33 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 59.00 | 79.90 | 74.48 ± 7.82 |
| Chromium | prod | 76.70 | 82.10 | 79.78 ± 2.06 |
| Firefox | dev | 54.00 | 58.00 | 56.60 ± 1.36 |
| Firefox | prod | 44.00 | 58.00 | 49.40 ± 5.89 |
| Webkit | dev | 95.00 | 99.00 | 97.20 ± 1.60 |
| Webkit | prod | 89.00 | 98.00 | 94.80 ± 3.19 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 20.50 | 29.30 | 26.22 ± 3.41 |
| Chromium | prod | 27.90 | 29.70 | 29.04 ± 0.62 |
| Firefox | dev | 31.00 | 50.00 | 37.80 ± 6.62 |
| Firefox | prod | 31.00 | 47.00 | 40.60 ± 7.06 |
| Webkit | dev | 46.00 | 74.00 | 64.00 ± 9.78 |
| Webkit | prod | 50.00 | 83.00 | 65.60 ± 11.36 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

