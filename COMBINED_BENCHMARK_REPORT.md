# Combined Benchmark Report

## Duration Benchmarks

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Clear rows** | | | | |
| | chromium | ❌ 12.16 | 6.46 | ✅ 3.06 |
| | firefox | 10.20 | ❌ 13.40 | ✅ 3.00 |
| | webkit | 7.80 | ❌ 12.00 | ✅ 3.40 |
|---|---|---|---|---|
| **Create 100k rows** | | | | |
| | chromium | ✅ 69.74 | 136.56 | ❌ 401.00 |
| | firefox | ✅ 72.80 | 331.00 | ❌ 1011.60 |
| | webkit | ✅ 90.80 | 248.80 | ❌ 401.20 |
|---|---|---|---|---|
| **Create 10k rows** | | | | |
| | chromium | ✅ 24.76 | 38.92 | ❌ 64.82 |
| | firefox | ✅ 23.00 | 62.40 | ❌ 127.80 |
| | webkit | ✅ 25.40 | ❌ 71.20 | 59.80 |
|---|---|---|---|---|
| **Create 1M rows** | | | | |
| | chromium | ✅ 548.28 | 969.60 | ❌ 3899.24 |
| | firefox | ✅ 715.00 | ❌ 3311.60 | Browser Crash |
| | webkit | ✅ 532.20 | 1996.20 | ❌ 4558.80 |
|---|---|---|---|---|
| **Remove row** | | | | |
| | chromium | ✅ 10.46 | 12.96 | ❌ 51.16 |
| | firefox | ✅ 14.00 | 19.60 | ❌ 65.40 |
| | webkit | ✅ 5.40 | 18.80 | ❌ 46.60 |
|---|---|---|---|---|
| **Select row** | | | | |
| | chromium | ❌ 15.30 | ✅ 4.96 | 8.20 |
| | firefox | ❌ 11.60 | ✅ 2.60 | 5.20 |
| | webkit | ❌ 9.00 | 4.40 | ✅ 4.20 |
|---|---|---|---|---|
| **Swap rows** | | | | |
| | chromium | 17.78 | ✅ 13.18 | ❌ 45.98 |
| | firefox | ✅ 12.60 | 19.20 | ❌ 64.40 |
| | webkit | ✅ 8.40 | 18.00 | ❌ 45.60 |
|---|---|---|---|---|
| **Update every 10th row** | | | | |
| | chromium | 24.64 | ✅ 18.98 | ❌ 53.68 |
| | firefox | 36.40 | ✅ 27.00 | ❌ 72.80 |
| | webkit | 30.20 | ✅ 23.60 | ❌ 45.40 |
|---|---|---|---|---|

## UI Responsiveness Benchmarks

| Benchmark | Browser | Neo (FPS / Long Frames) | Angular (FPS / Long Frames) | React (FPS / Long Frames) |
|---|---|---|---|---|
| **Heavy Calculation (Task Worker) UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
|---|---|---|---|---|
| **Heavy Calculation UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | 34.0 / ❌ 1.0 | ❌ 31.8 / ❌ 1.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ❌ 0.0 / ❌ 1.0 | ❌ 0.0 / ❌ 1.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | 32.8 / ❌ 1.0 | ❌ 31.6 / ❌ 1.0 |
|---|---|---|---|---|
| **Real-time Feed UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ❌ 50.8 / ❌ 1.8 |
| | firefox | ✅ 60.0 / ✅ 0.0 | 13.4 / ❌ 49.0 | ❌ 10.0 / 40.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | 47.0 / ✅ 0.0 | ❌ 30.2 / ❌ 4.2 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 100k Rows UI Responsiveness** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 10k Rows UI Responsiveness** | | | | |
| | chromium | N/A | N/A | N/A |
| | firefox | N/A | N/A | N/A |
| | webkit | N/A | N/A | N/A |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 1M Rows UI Responsiveness** | | | | |
| | chromium | N/A | N/A | Browser Crash |
| | firefox | N/A | N/A | Browser Crash |
| | webkit | N/A | N/A | Browser Crash |
|---|---|---|---|---|

## Scrolling Fluidity Benchmarks (Time to Valid State)

Lower is better.

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 100k Rows** | | | | |
| | chromium | 43.09 / 50.28 | ✅ 40.27 / 125.90 | ❌ 345.66 / 766.00 |
| | firefox | ✅ 45.18 / 49.80 | ❌ 273.60 / 332.00 | N/A |
| | webkit | ✅ 53.58 / 69.60 | 96.65 / 206.00 | ❌ 314.10 / 823.25 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 10k Rows** | | | | |
| | chromium | 33.75 / 46.32 | ✅ 15.59 / 24.70 | ❌ 37.74 / 70.94 |
| | firefox | ✅ 37.50 / 50.20 | 52.40 / 69.00 | ❌ 90.39 / 174.40 |
| | webkit | ❌ 46.62 / 50.40 | ✅ 21.20 / 39.00 | 37.49 / 103.20 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 1M Rows** | | | | |
| | chromium | ✅ 68.94 / 83.24 | ❌ 1163.38 / 1195.50 | Browser Crash |
| | firefox | N/A | N/A | N/A |
| | webkit | ❌ 218.25 / 272.00 | ✅ 188.95 / 1796.00 | Browser Crash |
|---|---|---|---|---|


## Scrolling Fluidity Benchmarks (Update Success Rate)

Higher is better.

| Benchmark | Browser | Neo (%) | Angular (%) | React (%) |
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
| **Scrolling Performance Under Duress 1M Rows** | | | | |
| | chromium | ✅ 100.00 | ✅ 100.00 | Browser Crash |
| | firefox | N/A | N/A | N/A |
| | webkit | ✅ 100.00 | ✅ 100.00 | Browser Crash |
|---|---|---|---|---|
