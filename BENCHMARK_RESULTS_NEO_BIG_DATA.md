# Neo.mjs Big Data Grid Benchmark Results

## Change Rows from 1,000 to 5,000

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 132.10 | 153.00 | 145.18 |
| Chromium | prod | 132.70 | 150.00 | 137.22 |
| Firefox | dev | 142.00 | 159.00 | 154.80 |
| Firefox | prod | 140.00 | 159.00 | 154.60 |
| Webkit | dev | 165.00 | 210.00 | 191.20 |
| Webkit | prod | 190.00 | 204.00 | 196.40 |

## Change Columns from 50 to 75

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 232.80 | 236.40 | 234.42 |
| Chromium | prod | 231.80 | 250.90 | 243.58 |
| Firefox | dev | 252.00 | 274.00 | 262.40 |
| Firefox | prod | 252.00 | 273.00 | 261.20 |
| Webkit | dev | 283.00 | 329.00 | 307.60 |
| Webkit | prod | 294.00 | 316.00 | 307.00 |

## Filter Grid

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 59.00 | 68.40 | 64.64 |
| Chromium | prod | 64.00 | 70.70 | 67.28 |
| Firefox | dev | 38.00 | 43.00 | 40.40 |
| Firefox | prod | 37.00 | 60.00 | 43.20 |
| Webkit | dev | 45.00 | 67.00 | 58.80 |
| Webkit | prod | 47.00 | 63.00 | 56.80 |

## Change Rows From 1,000 To 100,000

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 835.50 | 880.00 | 856.14 |
| Chromium | prod | 835.10 | 910.80 | 865.74 |
| Firefox | dev | 650.00 | 708.00 | 680.40 |
| Firefox | prod | 674.00 | 692.00 | 684.40 |
| Webkit | dev | 457.00 | 464.00 | 461.40 |
| Webkit | prod | 455.00 | 486.00 | 472.00 |

## Change Columns from 50 to 200 (with 100k rows)

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 2973.90 | 3071.20 | 3042.00 |
| Chromium | prod | 3030.70 | 3184.00 | 3097.00 |
| Firefox | dev | 2160.00 | 2232.00 | 2204.80 |
| Firefox | prod | 2178.00 | 2329.00 | 2243.00 |
| Webkit | dev | 2848.00 | 3188.00 | 3030.20 |
| Webkit | prod | 2923.00 | 3169.00 | 3075.40 |

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

