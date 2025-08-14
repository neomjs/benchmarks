# Neo.mjs Big Data Grid Benchmark Results

## Change Rows from 1,000 to 5,000

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 136.80 | 158.00 | 143.40 |
| Chromium | prod | 133.10 | 162.60 | 143.50 |
| Firefox | dev | 141.00 | 180.00 | 159.20 |
| Firefox | prod | 157.00 | 175.00 | 162.00 |
| Webkit | dev | 183.00 | 193.00 | 189.60 |
| Webkit | prod | 183.00 | 199.00 | 191.80 |

## Change Columns from 50 to 75

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 232.70 | 251.10 | 243.64 |
| Chromium | prod | 234.00 | 250.90 | 241.30 |
| Firefox | dev | 256.00 | 274.00 | 260.40 |
| Firefox | prod | 257.00 | 290.00 | 275.60 |
| Webkit | dev | 286.00 | 313.00 | 298.60 |
| Webkit | prod | 286.00 | 304.00 | 297.60 |

## Filter Grid

| Browser  | Mode | Min (ms) | Max (ms) | Avg (ms) |
| :--- | :--- | ---: | ---: | ---: |
| Chromium | dev | 55.30 | 67.90 | 63.02 |
| Chromium | prod | 52.50 | 57.60 | 55.92 |
| Firefox | dev | 39.00 | 42.00 | 40.60 |
| Firefox | prod | 38.00 | 42.00 | 40.00 |
| Webkit | dev | 61.00 | 103.00 | 78.00 |
| Webkit | prod | 46.00 | 86.00 | 68.80 |

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

