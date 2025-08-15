# React Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 5517.40 | 5656.10 | 5569.06 ± 46.64 | 2997.20 | 3127.90 | 3042.66 ± 49.57 |
| Chromium | prod | 5484.20 | 5685.40 | 5566.54 ± 69.89 | 3017.40 | 3198.70 | 3069.44 ± 66.08 |
| Firefox | dev | 6080.00 | 6366.00 | 6198.60 ± 95.94 | 4342.00 | 4519.00 | 4424.00 ± 65.61 |
| Firefox | prod | 6169.00 | 6364.00 | 6269.60 ± 73.73 | 4399.00 | 4566.00 | 4473.20 ± 54.20 |
| Webkit | dev | 8143.00 | 8391.00 | 8239.80 ± 84.68 | 5435.00 | 5507.00 | 5464.80 ± 29.57 |
| Webkit | prod | 7597.00 | 8162.00 | 8010.00 ± 210.96 | 4896.00 | 5413.00 | 5277.20 ± 193.71 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 130.10 | 136.50 | 132.52 ± 2.72 | 21.20 | 34.20 | 26.04 ± 5.77 |
| Chromium | prod | 131.70 | 136.50 | 134.06 ± 2.00 | 18.10 | 35.50 | 30.80 ± 6.40 |
| Firefox | dev | 139.00 | 141.00 | 140.20 ± 0.75 | 0.00 | 0.00 | 0.00 ± 0.00 |
| Firefox | prod | 141.00 | 147.00 | 144.60 ± 2.06 | 0.00 | 0.00 | 0.00 ± 0.00 |
| Webkit | dev | 118.00 | 144.00 | 124.60 ± 9.83 | 64.00 | 74.00 | 66.80 ± 3.66 |
| Webkit | prod | 118.00 | 120.00 | 118.60 ± 0.80 | 63.00 | 64.00 | 63.60 ± 0.49 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 1536.80 | 1609.60 | 1570.32 ± 26.94 | 900.50 | 974.30 | 931.78 ± 28.42 |
| Chromium | prod | 1537.10 | 1603.40 | 1569.28 ± 22.64 | 903.10 | 931.30 | 914.80 ± 11.18 |
| Firefox | dev | 1900.00 | 1937.00 | 1915.80 ± 17.34 | 1461.00 | 1502.00 | 1478.80 ± 18.24 |
| Firefox | prod | 1907.00 | 2041.00 | 1950.20 ± 48.72 | 1461.00 | 1596.00 | 1507.60 ± 47.99 |
| Webkit | dev | 1471.00 | 1560.00 | 1526.20 ± 30.24 | 1164.00 | 1241.00 | 1214.00 ± 26.62 |
| Webkit | prod | 1502.00 | 1580.00 | 1525.20 ± 30.20 | 1189.00 | 1265.00 | 1211.60 ± 29.84 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 148.40 | 152.00 | 150.20 ± 1.41 | 36.30 | 38.00 | 37.06 ± 0.56 |
| Chromium | prod | 148.10 | 151.00 | 149.48 ± 1.05 | 36.20 | 37.10 | 36.76 ± 0.33 |
| Firefox | dev | 171.00 | 178.00 | 173.80 ± 3.06 | 32.00 | 34.00 | 33.00 ± 0.89 |
| Firefox | prod | 175.00 | 181.00 | 176.80 ± 2.40 | 32.00 | 34.00 | 33.00 ± 0.63 |
| Webkit | dev | 133.00 | 136.00 | 133.60 ± 1.20 | 48.00 | 56.00 | 53.80 ± 2.93 |
| Webkit | prod | 131.00 | 139.00 | 134.80 ± 2.71 | 47.00 | 57.00 | 54.80 ± 3.92 |

## filter-grid

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 25.90 | 28.70 | 26.74 ± 1.01 |
| Chromium | prod | 26.10 | 28.00 | 27.26 ± 0.63 |
| Firefox | dev | 32.00 | 34.00 | 32.80 ± 0.75 |
| Firefox | prod | 30.00 | 34.00 | 32.20 ± 1.47 |
| Webkit | dev | 33.00 | 35.00 | 33.60 ± 0.80 |
| Webkit | prod | 33.00 | 35.00 | 33.60 ± 0.80 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

