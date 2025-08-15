# Neo Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 2979.60 | 3096.50 | 3044.12 ± 41.06 | 387.30 | 416.90 | 396.80 ± 10.58 |
| Chromium | prod | 2992.30 | 3134.80 | 3032.24 ± 52.46 | 383.30 | 415.80 | 398.58 ± 12.70 |
| Firefox | dev | 2177.00 | 2947.00 | 2358.60 ± 295.17 | 381.00 | 409.00 | 393.60 ± 8.94 |
| Firefox | prod | 2128.00 | 2413.00 | 2210.60 ± 103.50 | 382.00 | 421.00 | 393.60 ± 14.16 |
| Webkit | dev | 2930.00 | 3098.00 | 2984.60 ± 61.27 | 412.00 | 438.00 | 427.80 ± 9.56 |
| Webkit | prod | 2902.00 | 3220.00 | 3010.20 ± 109.52 | 403.00 | 441.00 | 427.00 ± 13.37 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 232.60 | 250.60 | 239.64 ± 8.16 | 148.70 | 169.30 | 155.30 ± 8.08 |
| Chromium | prod | 230.00 | 251.00 | 243.24 ± 8.85 | 148.00 | 172.60 | 157.12 ± 10.02 |
| Firefox | dev | 257.00 | 274.00 | 267.00 ± 7.77 | 140.00 | 162.00 | 156.40 ± 8.26 |
| Firefox | prod | 258.00 | 273.00 | 264.00 ± 7.35 | 143.00 | 162.00 | 152.60 ± 8.06 |
| Webkit | dev | 298.00 | 344.00 | 314.20 ± 18.84 | 162.00 | 195.00 | 176.40 ± 14.47 |
| Webkit | prod | 296.00 | 329.00 | 309.80 ± 12.83 | 162.00 | 201.00 | 173.80 ± 14.36 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 832.10 | 877.30 | 847.46 ± 16.38 | 149.40 | 174.40 | 161.62 ± 8.11 |
| Chromium | prod | 832.40 | 924.40 | 860.98 ± 32.42 | 155.10 | 174.60 | 163.72 ± 6.45 |
| Firefox | dev | 672.00 | 822.00 | 712.80 ± 55.83 | 109.00 | 157.00 | 137.00 ± 15.56 |
| Firefox | prod | 639.00 | 817.00 | 692.40 ± 64.85 | 110.00 | 181.00 | 136.60 ± 25.52 |
| Webkit | dev | 443.00 | 547.00 | 470.80 ± 38.81 | 118.00 | 200.00 | 145.20 ± 28.70 |
| Webkit | prod | 439.00 | 499.00 | 463.80 ± 19.53 | 136.00 | 153.00 | 143.60 ± 6.47 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 143.90 | 153.60 | 147.58 ± 3.31 | 33.40 | 45.20 | 37.72 ± 3.96 |
| Chromium | prod | 130.80 | 149.00 | 140.72 ± 7.62 | 31.30 | 45.70 | 36.44 ± 5.15 |
| Firefox | dev | 136.00 | 157.00 | 148.60 ± 9.18 | 26.00 | 46.00 | 34.00 ± 8.65 |
| Firefox | prod | 141.00 | 157.00 | 153.20 ± 6.11 | 27.00 | 46.00 | 40.60 ± 6.95 |
| Webkit | dev | 184.00 | 205.00 | 193.40 ± 6.71 | 48.00 | 67.00 | 59.60 ± 6.28 |
| Webkit | prod | 193.00 | 208.00 | 199.40 ± 6.02 | 61.00 | 68.00 | 63.60 ± 2.42 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 22.90 | 33.40 | 29.46 ± 3.94 |
| Chromium | prod | 31.50 | 34.10 | 32.40 ± 0.94 |
| Firefox | dev | 32.00 | 48.00 | 37.00 ± 6.03 |
| Firefox | prod | 32.00 | 51.00 | 38.60 ± 7.09 |
| Webkit | dev | 33.00 | 59.00 | 48.20 ± 9.99 |
| Webkit | prod | 7.00 | 63.00 | 39.60 ± 20.98 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 62.80 | 73.80 | 66.46 ± 3.95 |
| Chromium | prod | 62.70 | 67.70 | 65.20 ± 1.73 |
| Firefox | dev | 39.00 | 58.00 | 47.80 ± 7.30 |
| Firefox | prod | 40.00 | 63.00 | 50.40 ± 8.16 |
| Webkit | dev | 77.00 | 114.00 | 95.40 ± 11.79 |
| Webkit | prod | 93.00 | 141.00 | 106.80 ± 18.53 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 19.60 | 33.30 | 28.48 ± 4.86 |
| Chromium | prod | 15.40 | 33.30 | 27.68 ± 6.52 |
| Firefox | dev | 31.00 | 37.00 | 33.00 ± 2.10 |
| Firefox | prod | 31.00 | 63.00 | 43.80 ± 11.72 |
| Webkit | dev | 40.00 | 73.00 | 56.20 ± 11.65 |
| Webkit | prod | 33.00 | 83.00 | 62.40 ± 17.55 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

