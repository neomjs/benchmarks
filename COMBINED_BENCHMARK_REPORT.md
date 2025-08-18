# Combined Benchmark Report

## Duration Benchmarks

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Create 1M Rows** | | | | |
| | chromium | ✅ 553.54 | 962.26 | ❌ 3531.90 |
| | firefox | ✅ 706.00 | ❌ 3101.20 | N/A |
| | webkit | ✅ 515.80 | 1880.80 | ❌ 4573.80 |
|---|---|---|---|---|
| **Create 100k Rows** | | | | |
| | chromium | ✅ 66.34 | 132.84 | ❌ 403.48 |
| | firefox | ✅ 69.60 | 311.20 | ❌ 987.00 |
| | webkit | ✅ 76.80 | 226.60 | ❌ 397.40 |
|---|---|---|---|---|
| **Create 10k Rows** | | | | |
| | chromium | ✅ 17.98 | 37.32 | ❌ 65.16 |
| | firefox | ✅ 22.20 | 59.40 | ❌ 124.60 |
| | webkit | ✅ 32.80 | ❌ 70.00 | 60.60 |
|---|---|---|---|---|
| **Clear Rows** | | | | |
| | chromium | ❌ 9.22 | 6.18 | ✅ 3.22 |
| | firefox | 10.00 | ❌ 13.20 | ✅ 3.60 |
| | webkit | 8.20 | ❌ 11.00 | ✅ 3.40 |
|---|---|---|---|---|
| **Remove Row** | | | | |
| | chromium | ✅ 0.64 | 12.94 | ❌ 55.28 |
| | firefox | ✅ 0.60 | 19.80 | ❌ 62.80 |
| | webkit | ✅ 1.00 | 18.20 | ❌ 45.80 |
|---|---|---|---|---|
| **Select Row** | | | | |
| | chromium | ❌ 13.62 | ✅ 4.14 | 9.02 |
| | firefox | ❌ 11.60 | 7.40 | ✅ 5.80 |
| | webkit | ❌ 6.80 | ✅ 3.00 | 4.60 |
|---|---|---|---|---|
| **should change the amount of columns** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **should change the amount of rows** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **should filter the grid by firstname** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **should handle large data changes: 100k rows then 200 cols** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **should load the app and display the initial grid data** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **Swap Rows** | | | | |
| | chromium | 17.84 | ✅ 12.72 | ❌ 52.52 |
| | firefox | ✅ 15.80 | 18.60 | ❌ 62.40 |
| | webkit | ✅ 6.20 | 16.80 | ❌ 44.80 |
|---|---|---|---|---|
| **Update Every 10th Row** | | | | |
| | chromium | 29.10 | ✅ 18.46 | ❌ 54.04 |
| | firefox | 39.00 | ✅ 24.80 | ❌ 62.20 |
| | webkit | 30.60 | ✅ 22.20 | ❌ 47.00 |
|---|---|---|---|---|

## UI Responsiveness Benchmarks

| Benchmark | Browser | Neo (FPS / Long Frames) | Angular (FPS / Long Frames) | React (FPS / Long Frames) |
|---|---|---|---|---|
| **Heavy Calculation (Task Worker) UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
| | webkit | ❌ 59.8 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
|---|---|---|---|---|
| **Heavy Calculation UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | 34.2 / ❌ 1.0 | ❌ 32.0 / ❌ 1.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ❌ 0.0 / ❌ 1.0 | ❌ 0.0 / ❌ 1.0 |
| | webkit | ✅ 60.0 / ✅ 0.2 | 33.8 / ❌ 1.0 | ❌ 31.4 / ❌ 1.0 |
|---|---|---|---|---|
| **Real-time Feed UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ❌ 51.2 / ❌ 1.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | 55.0 / 1.8 | ❌ 10.0 / ❌ 40.6 |
| | webkit | ✅ 60.0 / ✅ 0.2 | 45.8 / ✅ 0.2 | ❌ 30.0 / ❌ 5.4 |
|---|---|---|---|---|

## Scrolling Fluidity Benchmarks (Time to Valid State)

Lower is better.

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 1M Rows** | | | | |
| | chromium | ✅ 67.06 / 83.28 | ❌ 359.58 / 479.16 | Browser Crash |
| | firefox | N/A | N/A | N/A |
| | webkit | ❌ 198.61 / 239.80 | ✅ 114.07 / 735.20 | Browser Crash |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 100k Rows** | | | | |
| | chromium | ✅ 41.95 / 49.92 | 43.09 / 61.58 | ❌ 325.66 / 820.98 |
| | firefox | ✅ 46.19 / 66.60 | ❌ 164.80 / 193.80 | N/A |
| | webkit | ✅ 52.09 / 73.20 | 54.13 / 82.80 | ❌ 289.67 / 750.60 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 10k Rows** | | | | |
| | chromium | 33.76 / 49.76 | ✅ 20.51 / 26.52 | ❌ 40.22 / 79.12 |
| | firefox | ✅ 37.09 / 49.60 | 43.11 / 65.80 | ❌ 91.14 / 168.80 |
| | webkit | ❌ 46.56 / 53.60 | ✅ 25.39 / 49.60 | 37.43 / 102.40 |
|---|---|---|---|---|


## Scrolling Fluidity Benchmarks (Update Success Rate)

Higher is better.

| Benchmark | Browser | Neo (%) | Angular (%) | React (%) |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 1M Rows** | | | | |
| | chromium | ✅ 100.00 | ✅ 100.00 | Browser Crash |
| | firefox | N/A | N/A | N/A |
| | webkit | ✅ 100.00 | ✅ 100.00 | Browser Crash |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 100k Rows** | | | | |
| | chromium | ✅ 100.00 | ✅ 100.00 | ✅ 100.00 |
| | firefox | ✅ 100.00 | ✅ 100.00 | N/A |
| | webkit | ✅ 100.00 | ✅ 100.00 | ✅ 100.00 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 10k Rows** | | | | |
| | chromium | ✅ 100.00 | ✅ 100.00 | ✅ 100.00 |
| | firefox | ✅ 100.00 | ✅ 100.00 | ✅ 100.00 |
| | webkit | ✅ 100.00 | ✅ 100.00 | ✅ 100.00 |
|---|---|---|---|---|
