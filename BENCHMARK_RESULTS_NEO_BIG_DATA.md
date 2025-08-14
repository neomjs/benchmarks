# Neo.mjs Big Data Grid Benchmark Results

## Change Columns (Large)

| Type | Browser | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | :--- | ---: | ---: | ---: |
| UI Update Time | Chromium | dev | 378.00 | 400.50 | 383.54 |
| UI Update Time | Chromium | prod | 379.90 | 401.30 | 391.50 |
| UI Update Time | Firefox | dev | 387.00 | 402.00 | 393.20 |
| UI Update Time | Firefox | prod | 384.00 | 432.00 | 399.40 |
| UI Update Time | Webkit | dev | 394.00 | 439.00 | 418.80 |
| UI Update Time | Webkit | prod | 387.00 | 450.00 | 414.60 |

## Change Columns from 50 to 75

| Type | Browser | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | :--- | ---: | ---: | ---: |
| UI Update Time | Chromium | dev | 148.20 | 170.80 | 154.52 |
| UI Update Time | Chromium | prod | 148.20 | 170.40 | 157.86 |
| UI Update Time | Firefox | dev | 157.00 | 172.00 | 163.80 |
| UI Update Time | Firefox | prod | 158.00 | 174.00 | 164.60 |
| UI Update Time | Webkit | dev | 161.00 | 231.00 | 176.80 |
| UI Update Time | Webkit | prod | 150.00 | 200.00 | 170.60 |

## Change Rows (Large)

| Type | Browser | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | :--- | ---: | ---: | ---: |
| UI Update Time | Chromium | dev | 153.30 | 163.20 | 157.76 |
| UI Update Time | Chromium | prod | 153.20 | 168.50 | 159.72 |
| UI Update Time | Firefox | dev | 132.00 | 145.00 | 139.80 |
| UI Update Time | Firefox | prod | 131.00 | 146.00 | 138.40 |
| UI Update Time | Webkit | dev | 140.00 | 155.00 | 143.60 |
| UI Update Time | Webkit | prod | 129.00 | 161.00 | 144.20 |

## Change Rows from 1,000 to 5,000

| Type | Browser | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | :--- | ---: | ---: | ---: |
| UI Update Time | Chromium | dev | 33.20 | 42.10 | 37.20 |
| UI Update Time | Chromium | prod | 34.30 | 40.70 | 37.82 |
| UI Update Time | Firefox | dev | 23.00 | 54.00 | 40.80 |
| UI Update Time | Firefox | prod | 29.00 | 47.00 | 40.80 |
| UI Update Time | Webkit | dev | 62.00 | 75.00 | 64.80 |
| UI Update Time | Webkit | prod | 49.00 | 64.00 | 58.40 |

## Filter Grid

| Type | Browser | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | :--- | ---: | ---: | ---: |
| Total Time | Chromium | dev | 52.90 | 66.40 | 62.52 |
| Total Time | Chromium | prod | 65.20 | 68.30 | 67.24 |
| Total Time | Firefox | dev | 37.00 | 42.00 | 40.00 |
| Total Time | Firefox | prod | 40.00 | 43.00 | 41.60 |
| Total Time | Webkit | dev | 45.00 | 77.00 | 60.80 |
| Total Time | Webkit | prod | 45.00 | 106.00 | 67.20 |

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

