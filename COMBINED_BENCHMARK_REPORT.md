# Combined Benchmark Report

## Duration Benchmarks

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Create 1M Rows** | | | | |
| | chromium | ✅ 555.48 | 958.52 | ❌ 3776.56 |
| | firefox | ✅ 696.00 | ❌ 3127.60 | N/A |
| | webkit | ✅ 538.20 | 1899.80 | ❌ 4426.20 |
|---|---|---|---|---|
| **Create 100k Rows** | | | | |
| | chromium | ✅ 70.54 | 134.36 | ❌ 397.74 |
| | firefox | ✅ 71.60 | 313.60 | ❌ 992.80 |
| | webkit | ✅ 81.40 | 227.00 | ❌ 395.00 |
|---|---|---|---|---|
| **Create 10k Rows** | | | | |
| | chromium | ✅ 25.26 | 37.42 | ❌ 65.26 |
| | firefox | ✅ 20.20 | 60.00 | ❌ 124.40 |
| | webkit | ✅ 29.00 | ❌ 70.60 | 58.60 |
|---|---|---|---|---|
| **Clear Rows** | | | | |
| | chromium | ❌ 11.30 | 6.36 | ✅ 3.06 |
| | firefox | 12.60 | ❌ 13.60 | ✅ 3.60 |
| | webkit | 11.20 | ❌ 11.40 | ✅ 3.60 |
|---|---|---|---|---|
| **Remove Row** | | | | |
| | chromium | ✅ 10.38 | 12.78 | ❌ 47.88 |
| | firefox | ✅ 10.20 | 19.20 | ❌ 64.80 |
| | webkit | ✅ 7.60 | 17.80 | ❌ 45.20 |
|---|---|---|---|---|
| **Select Row** | | | | |
| | chromium | ❌ 11.34 | ✅ 4.06 | 8.28 |
| | firefox | ❌ 12.80 | ✅ 4.60 | 5.40 |
| | webkit | ❌ 7.80 | 4.40 | ✅ 4.00 |
|---|---|---|---|---|
| **Swap Rows** | | | | |
| | chromium | 18.34 | ✅ 12.64 | ❌ 52.98 |
| | firefox | ✅ 16.00 | 19.00 | ❌ 63.80 |
| | webkit | ✅ 11.40 | 17.20 | ❌ 44.80 |
|---|---|---|---|---|
| **Update Every 10th Row** | | | | |
| | chromium | 25.78 | ✅ 18.16 | ❌ 51.88 |
| | firefox | 29.40 | ✅ 24.60 | ❌ 70.20 |
| | webkit | 31.20 | ✅ 22.20 | ❌ 44.60 |
|---|---|---|---|---|

## UI Responsiveness Benchmarks

| Benchmark | Browser | Neo (FPS / Long Frames) | Angular (FPS / Long Frames) | React (FPS / Long Frames) |
|---|---|---|---|---|
| **Heavy Calculation (Task Worker) UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ❌ 0.2 |
|---|---|---|---|---|
| **Heavy Calculation UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | 34.0 / ❌ 1.0 | ❌ 31.4 / ❌ 1.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ❌ 0.0 / ❌ 1.0 | ❌ 0.0 / ❌ 1.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | 33.6 / ❌ 1.0 | ❌ 31.4 / ❌ 1.0 |
|---|---|---|---|---|
| **Real-time Feed UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ❌ 49.4 / ❌ 2.4 |
| | firefox | ✅ 60.0 / ✅ 0.0 | 13.0 / ❌ 49.8 | ❌ 9.8 / 40.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | 46.2 / 0.2 | ❌ 29.6 / ❌ 7.4 |
|---|---|---|---|---|

## Scrolling Fluidity Benchmarks (Time to Valid State)

Lower is better.

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 1M Rows** | | | | |
| | chromium | ✅ 66.71 / 87.50 | ❌ 1135.84 / 1258.03 | Browser Crash |
| | firefox | N/A | N/A | N/A |
| | webkit | ✅ 207.77 / 263.00 | ❌ 254.53 / 1770.40 | Browser Crash |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 100k Rows** | | | | |
| | chromium | 40.36 / 50.68 | ✅ 28.29 / 122.92 | ❌ 348.05 / 850.94 |
| | firefox | ✅ 44.61 / 50.40 | ❌ 252.57 / 303.60 | N/A |
| | webkit | ✅ 54.15 / 79.40 | 92.75 / 183.60 | ❌ 321.12 / 833.80 |
|---|---|---|---|---|
| **Scrolling Performance Under Duress 10k Rows** | | | | |
| | chromium | 33.68 / 47.22 | ✅ 16.32 / 28.10 | ❌ 38.32 / 64.64 |
| | firefox | ✅ 36.77 / 50.20 | 52.76 / 84.60 | ❌ 89.65 / 170.80 |
| | webkit | ❌ 46.81 / 63.40 | ✅ 21.46 / 36.80 | 37.82 / 123.20 |
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
