# Neo.mjs Big Data Grid Benchmark Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg | Min | Max | Avg |
| Chromium | dev | 2962.80 | 3018.40 | 2993.04 | 381.30 | 404.90 | 393.92 |
| Chromium | prod | 2994.50 | 3100.40 | 3029.36 | 379.40 | 394.60 | 384.86 |
| Firefox | dev | 2179.00 | 2319.00 | 2233.20 | 383.00 | 457.00 | 408.60 |
| Firefox | prod | 2196.00 | 2227.00 | 2214.60 | 394.00 | 413.00 | 401.60 |
| Webkit | dev | 2821.00 | 3261.00 | 2962.40 | 383.00 | 427.00 | 408.20 |
| Webkit | prod | 2893.00 | 3158.00 | 3043.80 | 404.00 | 471.00 | 435.60 |

## Change Columns from 50 to 75

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg | Min | Max | Avg |
| Chromium | dev | 230.80 | 251.20 | 242.62 | 149.40 | 172.70 | 163.42 |
| Chromium | prod | 234.10 | 250.90 | 246.06 | 149.20 | 164.90 | 154.60 |
| Firefox | dev | 256.00 | 290.00 | 267.00 | 149.00 | 189.00 | 165.80 |
| Firefox | prod | 256.00 | 274.00 | 264.00 | 149.00 | 161.00 | 155.00 |
| Webkit | dev | 295.00 | 326.00 | 313.40 | 165.00 | 195.00 | 181.00 |
| Webkit | prod | 295.00 | 320.00 | 301.60 | 150.00 | 168.00 | 163.40 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg | Min | Max | Avg |
| Chromium | dev | 832.20 | 852.40 | 839.98 | 152.30 | 165.40 | 159.38 |
| Chromium | prod | 833.30 | 865.90 | 849.34 | 158.60 | 171.90 | 163.54 |
| Firefox | dev | 638.00 | 680.00 | 667.20 | 105.00 | 137.00 | 126.20 |
| Firefox | prod | 656.00 | 692.00 | 677.00 | 112.00 | 146.00 | 133.40 |
| Webkit | dev | 445.00 | 481.00 | 459.00 | 136.00 | 168.00 | 147.20 |
| Webkit | prod | 439.00 | 476.00 | 451.00 | 119.00 | 140.00 | 132.40 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg | Min | Max | Avg |
| Chromium | dev | 128.00 | 166.90 | 147.88 | 28.40 | 47.60 | 36.10 |
| Chromium | prod | 136.90 | 155.70 | 143.78 | 31.80 | 42.10 | 37.12 |
| Firefox | dev | 135.00 | 157.00 | 149.40 | 28.00 | 44.00 | 40.00 |
| Firefox | prod | 154.00 | 170.00 | 160.00 | 42.00 | 45.00 | 43.60 |
| Webkit | dev | 178.00 | 208.00 | 197.20 | 49.00 | 63.00 | 58.20 |
| Webkit | prod | 191.00 | 235.00 | 206.20 | 50.00 | 65.00 | 57.80 |

## filter-grid

| Browser | Mode | Total Time (ms) | | | UI Update Time (ms) | | |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| | | Min | Max | Avg | Min | Max | Avg |
| Chromium | dev | 58.70 | 130.50 | 78.08 | N/A | N/A | N/A |
| Chromium | prod | 56.20 | 68.70 | 64.40 | N/A | N/A | N/A |
| Firefox | dev | 37.00 | 41.00 | 39.40 | N/A | N/A | N/A |
| Firefox | prod | 36.00 | 43.00 | 39.00 | N/A | N/A | N/A |
| Webkit | dev | 60.00 | 63.00 | 61.60 | N/A | N/A | N/A |
| Webkit | prod | 62.00 | 169.00 | 101.40 | N/A | N/A | N/A |

## System Information
* **OS:** macOS 15.5 (x64)
* **CPU:** Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz (16 cores @ 3.2GHz)
* **Memory:** 64GB
* **Node.js:** v22.3.0
* **Playwright:** 1.54.2

