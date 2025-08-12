# Combined Benchmark Report

## Duration Benchmarks

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Create 1M rows** | | | | |
| | chromium | ✅ 548.28 | 969.60 | ❌ 3899.24 |
| | firefox | ✅ 715.00 | ❌ 3311.60 | Browser Crash |
| | webkit | ✅ 532.20 | 1996.20 | ❌ 4558.80 |
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
| **Clear rows** | | | | |
| | chromium | ❌ 12.16 | 6.46 | ✅ 3.06 |
| | firefox | 10.20 | ❌ 13.40 | ✅ 3.00 |
| | webkit | 7.80 | ❌ 12.00 | ✅ 3.40 |
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

## Scrolling Fluidity Benchmarks (Time to Valid State)

Lower is better.

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 100k Rows** | | | | |
| | chromium | 43.09 / 50.28 | ✅ 30.19 / 124.08 | ❌ 345.66 / 766.00 |
| | firefox | ✅ 45.18 / 49.80 | ❌ 258.47 / 295.00 | N/A |
| | webkit | ✅ 53.58 / 69.60 | 95.00 / 192.40 | ❌ 314.10 / 823.25 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 10k Rows** | | | | |
| | chromium | 33.75 / 46.32 | ✅ 16.77 / 29.46 | ❌ 37.74 / 70.94 |
| | firefox | ✅ 37.50 / 50.20 | 56.00 / 90.60 | ❌ 90.39 / 174.40 |
| | webkit | ❌ 46.62 / 50.40 | ✅ 21.32 / 40.20 | 37.49 / 103.20 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 1M Rows** | | | | |
| | chromium | ✅ 68.94 / 83.24 | ❌ 1166.56 / 1262.12 | Browser Crash |
| | firefox | N/A | N/A | N/A |
| | webkit | ✅ 218.25 / 272.00 | ❌ 247.41 / 1766.00 | Browser Crash |
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
