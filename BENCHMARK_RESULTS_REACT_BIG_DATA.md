# React Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 5404.60 | 5517.00 | 5440.36 ± 42.88 | 2962.10 | 3022.70 | 2983.82 ± 20.57 |
| Chromium | prod | 5392.30 | 5729.10 | 5513.54 ± 121.00 | 2967.90 | 3071.10 | 2995.16 ± 38.91 |
| Firefox | dev | 6075.00 | 6247.00 | 6158.20 ± 59.93 | 4328.00 | 4453.00 | 4401.80 ± 49.96 |
| Firefox | prod | 6080.00 | 6227.00 | 6162.60 ± 49.54 | 4348.00 | 4460.00 | 4407.60 ± 45.61 |
| Webkit | dev | 7966.00 | 8296.00 | 8115.20 ± 139.05 | 5303.00 | 5500.00 | 5392.60 ± 77.94 |
| Webkit | prod | 7914.00 | 8072.00 | 7993.40 ± 52.62 | 5256.00 | 5338.00 | 5310.80 ± 30.99 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 219.10 | 232.60 | 223.00 ± 5.06 | 110.40 | 129.10 | 121.16 ± 6.03 |
| Chromium | prod | 220.10 | 240.60 | 225.90 ± 7.47 | 111.60 | 123.50 | 119.40 ± 4.45 |
| Firefox | dev | 213.00 | 231.00 | 219.00 ± 6.57 | 70.00 | 75.00 | 72.20 ± 1.72 |
| Firefox | prod | 212.00 | 218.00 | 214.80 ± 1.94 | 70.00 | 72.00 | 70.80 ± 0.75 |
| Webkit | dev | 157.00 | 174.00 | 161.20 ± 6.43 | 102.00 | 113.00 | 105.00 ± 4.15 |
| Webkit | prod | 156.00 | 160.00 | 158.40 ± 1.36 | 103.00 | 104.00 | 103.40 ± 0.49 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 1529.60 | 1593.90 | 1553.70 ± 23.95 | 898.60 | 932.50 | 911.80 ± 12.48 |
| Chromium | prod | 1538.50 | 1605.90 | 1560.22 ± 23.76 | 901.20 | 953.90 | 922.54 ± 18.71 |
| Firefox | dev | 1870.00 | 1923.00 | 1901.60 ± 19.68 | 1431.00 | 1484.00 | 1460.80 ± 20.03 |
| Firefox | prod | 1887.00 | 1921.00 | 1909.00 ± 12.21 | 1454.00 | 1483.00 | 1470.80 ± 10.23 |
| Webkit | dev | 1493.00 | 1548.00 | 1526.80 ± 19.30 | 1180.00 | 1231.00 | 1213.80 ± 18.30 |
| Webkit | prod | 1493.00 | 1540.00 | 1518.40 ± 17.37 | 1181.00 | 1231.00 | 1199.40 ± 17.45 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev | Min | Max | Avg ± StdDev |
| Chromium | dev | 249.80 | 274.70 | 255.48 ± 9.62 | 137.70 | 157.10 | 142.28 ± 7.44 |
| Chromium | prod | 249.80 | 256.60 | 251.52 ± 2.58 | 137.90 | 144.80 | 139.70 ± 2.60 |
| Firefox | dev | 267.00 | 271.00 | 269.20 ± 1.47 | 127.00 | 132.00 | 129.60 ± 1.85 |
| Firefox | prod | 267.00 | 276.00 | 271.00 ± 3.03 | 128.00 | 135.00 | 130.00 ± 2.61 |
| Webkit | dev | 188.00 | 193.00 | 190.20 ± 1.72 | 106.00 | 114.00 | 110.60 ± 2.65 |
| Webkit | prod | 187.00 | 192.00 | 189.40 ± 1.85 | 103.00 | 112.00 | 108.40 ± 3.67 |

## filter-grid (clear)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 115.90 | 137.50 | 123.52 ± 7.54 |
| Chromium | prod | 112.20 | 134.30 | 122.16 ± 8.53 |
| Firefox | dev | 122.00 | 142.00 | 132.00 ± 6.54 |
| Firefox | prod | 2.00 | 137.00 | 105.80 ± 52.14 |
| Webkit | dev | 88.00 | 111.00 | 95.80 ± 8.11 |
| Webkit | prod | 95.00 | 116.00 | 106.80 ± 8.26 |

## filter-grid (first)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 118.50 | 131.60 | 125.26 ± 5.42 |
| Chromium | prod | 93.40 | 141.00 | 126.16 ± 16.99 |
| Firefox | dev | 3.00 | 161.00 | 106.80 ± 54.39 |
| Firefox | prod | 118.00 | 151.00 | 131.80 ± 12.25 |
| Webkit | dev | 99.00 | 109.00 | 105.20 ± 3.97 |
| Webkit | prod | 105.00 | 134.00 | 112.40 ± 10.87 |

## filter-grid (second)

| Browser | Mode | Total Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: |
| | | Min | Max | Avg ± StdDev |
| Chromium | dev | 121.30 | 132.50 | 126.60 ± 4.26 |
| Chromium | prod | 119.80 | 134.20 | 127.86 ± 5.51 |
| Firefox | dev | 127.00 | 157.00 | 138.00 ± 10.83 |
| Firefox | prod | 125.00 | 140.00 | 132.60 ± 5.68 |
| Webkit | dev | 104.00 | 118.00 | 112.20 ± 5.95 |
| Webkit | prod | 87.00 | 122.00 | 111.80 ± 12.98 |



The data is aggregated over **5 run(s)**.

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

