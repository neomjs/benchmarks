# Neo Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 2996.80 | 3067.80 | 3025.82 ± 26.63 | 379.60 | 410.80 | 396.32 ± 11.67 |
| Chromium | prod | 2965.00 | 3049.10 | 3005.24 ± 31.47 | 382.90 | 398.10 | 387.88 ± 5.30 |
| Firefox | dev | 2135.00 | 2224.00 | 2171.40 ± 29.43 | 380.00 | 398.00 | 389.00 ± 7.43 |
| Firefox | prod | 2160.00 | 2179.00 | 2171.20 ± 8.38 | 390.00 | 401.00 | 397.60 ± 4.08 |
| Webkit | dev | 2803.00 | 3135.00 | 2899.00 ± 119.99 | 388.00 | 444.00 | 414.40 ± 18.60 |
| Webkit | prod | 2861.00 | 3135.00 | 2947.60 ± 99.69 | 390.00 | 436.00 | 411.40 ± 15.28 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 229.70 | 250.50 | 239.14 ± 9.11 | 141.80 | 173.20 | 156.74 ± 12.82 |
| Chromium | prod | 233.10 | 249.40 | 242.28 ± 7.36 | 149.10 | 173.20 | 160.36 ± 10.58 |
| Firefox | dev | 253.00 | 269.00 | 259.00 ± 5.33 | 153.00 | 157.00 | 156.20 ± 1.60 |
| Firefox | prod | 256.00 | 276.00 | 267.20 ± 8.80 | 153.00 | 171.00 | 159.60 ± 6.05 |
| Webkit | dev | 297.00 | 343.00 | 312.20 ± 16.65 | 166.00 | 185.00 | 172.00 ± 6.84 |
| Webkit | prod | 294.00 | 314.00 | 305.40 ± 8.24 | 163.00 | 207.00 | 183.60 ± 17.82 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 832.80 | 849.00 | 836.80 ± 6.14 | 144.90 | 163.40 | 155.96 ± 6.76 |
| Chromium | prod | 831.00 | 859.40 | 843.04 ± 10.43 | 153.10 | 168.10 | 159.62 ± 4.87 |
| Firefox | dev | 616.00 | 676.00 | 651.20 ± 23.40 | 102.00 | 140.00 | 123.00 ± 16.21 |
| Firefox | prod | 643.00 | 675.00 | 665.00 ± 12.76 | 112.00 | 142.00 | 130.40 ± 10.17 |
| Webkit | dev | 445.00 | 478.00 | 456.60 ± 12.67 | 126.00 | 147.00 | 138.60 ± 7.86 |
| Webkit | prod | 459.00 | 517.00 | 473.20 ± 21.97 | 122.00 | 153.00 | 145.20 ± 11.69 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 143.90 | 156.30 | 149.80 ± 4.88 | 33.90 | 42.50 | 37.42 ± 3.28 |
| Chromium | prod | 141.30 | 144.20 | 143.34 ± 1.05 | 27.50 | 34.60 | 32.32 ± 2.52 |
| Firefox | dev | 118.00 | 159.00 | 149.40 ± 15.76 | 17.00 | 46.00 | 39.20 ± 11.12 |
| Firefox | prod | 153.00 | 157.00 | 155.20 ± 1.60 | 42.00 | 45.00 | 43.20 ± 0.98 |
| Webkit | dev | 191.00 | 236.00 | 203.20 ± 16.70 | 48.00 | 67.00 | 56.40 ± 6.83 |
| Webkit | prod | 176.00 | 200.00 | 187.20 ± 8.23 | 45.00 | 58.00 | 51.40 ± 5.16 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 13.70 | 36.70 | 20.00 ± 8.44 |
| Chromium | prod | 13.30 | 16.00 | 14.56 ± 0.86 |
| Firefox | dev | 11.00 | 62.00 | 33.40 ± 16.62 |
| Firefox | prod | 12.00 | 36.00 | 25.80 ± 7.81 |
| Webkit | dev | 36.00 | 65.00 | 51.00 ± 12.08 |
| Webkit | prod | 57.00 | 65.00 | 60.00 ± 2.83 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 57.20 | 68.90 | 63.92 ± 3.80 |
| Chromium | prod | 60.70 | 69.90 | 65.06 ± 3.47 |
| Firefox | dev | 39.00 | 43.00 | 40.40 ± 1.36 |
| Firefox | prod | 39.00 | 41.00 | 40.00 ± 0.63 |
| Webkit | dev | 46.00 | 137.00 | 82.60 ± 33.30 |
| Webkit | prod | 46.00 | 106.00 | 63.20 ± 22.21 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 34.60 | 52.70 | 44.24 ± 7.78 |
| Chromium | prod | 31.50 | 69.00 | 41.56 ± 13.82 |
| Firefox | dev | 55.00 | 71.00 | 63.80 ± 6.18 |
| Firefox | prod | 51.00 | 73.00 | 58.20 ± 7.73 |
| Webkit | dev | 35.00 | 67.00 | 58.00 ± 11.90 |
| Webkit | prod | 37.00 | 86.00 | 68.20 ± 16.92 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

