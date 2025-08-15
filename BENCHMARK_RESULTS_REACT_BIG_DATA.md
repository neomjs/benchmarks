# React Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 5401.90 | 5525.10 | 5436.02 ± 45.69 | 2957.00 | 3052.90 | 2985.74 ± 34.86 |
| Chromium | prod | 5399.30 | 5629.00 | 5481.18 ± 90.84 | 2969.80 | 3095.20 | 3006.58 ± 48.14 |
| Firefox | dev | 6085.00 | 6233.00 | 6176.40 ± 50.38 | 4342.00 | 4458.00 | 4421.80 ± 41.80 |
| Firefox | prod | 6079.00 | 6300.00 | 6171.60 ± 72.62 | 4325.00 | 4500.00 | 4414.20 ± 56.96 |
| Webkit | dev | 7934.00 | 8270.00 | 8069.20 ± 144.04 | 5274.00 | 5471.00 | 5350.20 ± 84.42 |
| Webkit | prod | 7936.00 | 8197.00 | 8043.40 ± 116.27 | 5255.00 | 5429.00 | 5327.00 ± 68.75 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 130.80 | 132.90 | 131.86 ± 0.79 | 21.30 | 34.00 | 26.30 ± 5.89 |
| Chromium | prod | 131.60 | 134.50 | 132.76 ± 1.34 | 33.20 | 34.10 | 33.56 ± 0.31 |
| Firefox | dev | 140.00 | 145.00 | 142.20 ± 1.60 | 0.00 | 0.00 | 0.00 ± 0.00 |
| Firefox | prod | 139.00 | 147.00 | 141.80 ± 2.93 | 0.00 | 0.00 | 0.00 ± 0.00 |
| Webkit | dev | 117.00 | 120.00 | 118.60 ± 1.20 | 63.00 | 65.00 | 63.80 ± 0.75 |
| Webkit | prod | 116.00 | 120.00 | 117.80 ± 1.33 | 62.00 | 64.00 | 63.20 ± 0.98 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 1509.80 | 1571.40 | 1533.42 ± 22.67 | 889.60 | 913.50 | 897.56 ± 8.26 |
| Chromium | prod | 1509.30 | 1572.50 | 1537.66 ± 20.65 | 890.80 | 931.00 | 906.46 ± 14.45 |
| Firefox | dev | 1885.00 | 1980.00 | 1912.00 ± 35.97 | 1449.00 | 1540.00 | 1473.20 ± 34.54 |
| Firefox | prod | 1886.00 | 1940.00 | 1910.60 ± 23.91 | 1446.00 | 1492.00 | 1468.20 ± 18.84 |
| Webkit | dev | 1482.00 | 1502.00 | 1495.00 ± 7.38 | 1176.00 | 1192.00 | 1186.00 ± 5.66 |
| Webkit | prod | 1472.00 | 1517.00 | 1495.20 ± 14.37 | 1164.00 | 1199.00 | 1182.20 ± 11.37 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 147.50 | 149.80 | 148.68 ± 0.96 | 36.00 | 37.10 | 36.46 ± 0.38 |
| Chromium | prod | 147.70 | 151.50 | 148.78 ± 1.44 | 36.00 | 37.10 | 36.58 ± 0.37 |
| Firefox | dev | 173.00 | 176.00 | 174.60 ± 1.36 | 33.00 | 35.00 | 33.60 ± 0.80 |
| Firefox | prod | 171.00 | 180.00 | 175.40 ± 3.26 | 32.00 | 35.00 | 33.20 ± 0.98 |
| Webkit | dev | 132.00 | 134.00 | 133.00 ± 0.89 | 54.00 | 56.00 | 55.00 ± 0.63 |
| Webkit | prod | 132.00 | 135.00 | 133.40 ± 1.20 | 49.00 | 56.00 | 53.80 ± 2.48 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 115.70 | 134.60 | 125.58 ± 6.49 |
| Chromium | prod | 114.00 | 140.40 | 126.78 ± 9.64 |
| Firefox | dev | 126.00 | 143.00 | 137.80 ± 6.11 |
| Firefox | prod | 135.00 | 142.00 | 138.80 ± 2.32 |
| Webkit | dev | 2.00 | 119.00 | 85.80 ± 43.24 |
| Webkit | prod | 92.00 | 118.00 | 105.20 ± 9.24 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 99.60 | 135.40 | 122.86 ± 13.29 |
| Chromium | prod | 2.90 | 133.60 | 98.38 ± 48.75 |
| Firefox | dev | 120.00 | 143.00 | 134.00 ± 8.92 |
| Firefox | prod | 118.00 | 205.00 | 145.80 ± 30.73 |
| Webkit | dev | 97.00 | 116.00 | 103.60 ± 6.74 |
| Webkit | prod | 101.00 | 116.00 | 108.40 ± 5.00 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 108.40 | 137.10 | 126.64 ± 9.86 |
| Chromium | prod | 124.30 | 151.90 | 135.36 ± 9.03 |
| Firefox | dev | 106.00 | 142.00 | 131.20 ± 13.73 |
| Firefox | prod | 127.00 | 144.00 | 135.60 ± 5.95 |
| Webkit | dev | 86.00 | 120.00 | 107.60 ± 11.55 |
| Webkit | prod | 111.00 | 123.00 | 114.20 ± 4.53 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

