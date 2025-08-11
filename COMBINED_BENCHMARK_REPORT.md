# Combined Benchmark Report

## Duration Benchmarks

| Benchmark | Browser | Neo (ms) | Angular (ms) | React (ms) |
|---|---|---|---|---|
| **Clear rows** | | | | |
| | chromium | ❌ 12.26 | 6.44 | ✅ 3.28 |
| | firefox | 10.40 | ❌ 12.60 | ✅ 3.20 |
| | webkit | ❌ 12.60 | 12.00 | ✅ 3.60 |
|---|---|---|---|---|
| **Create 100k rows** | | | | |
| | chromium | ✅ 36.70 | 134.66 | ❌ 406.52 |
| | firefox | ✅ 43.00 | 316.40 | ❌ 981.40 |
| | webkit | ✅ 63.00 | 228.20 | ❌ 393.60 |
|---|---|---|---|---|
| **Create 10k rows** | | | | |
| | chromium | ✅ 19.00 | 36.66 | ❌ 66.90 |
| | firefox | ✅ 28.00 | 60.60 | ❌ 126.20 |
| | webkit | ✅ 35.60 | ❌ 65.40 | 59.80 |
|---|---|---|---|---|
| **Create 1M rows** | | | | |
| | chromium | ✅ 141.56 | 980.78 | ❌ 3612.60 |
| | firefox | ✅ 205.60 | ❌ 3166.20 | N/A |
| | webkit | ✅ 909.00 | 1875.40 | ❌ 4468.00 |
|---|---|---|---|---|
| **Remove row** | | | | |
| | chromium | ✅ 11.50 | 15.26 | ❌ 48.10 |
| | firefox | ✅ 9.20 | 15.80 | ❌ 64.00 |
| | webkit | ✅ 2.80 | 18.00 | ❌ 45.80 |
|---|---|---|---|---|
| **Select row** | | | | |
| | chromium | ❌ 13.72 | ✅ 6.16 | 9.78 |
| | firefox | ❌ 10.00 | ✅ 4.40 | 5.60 |
| | webkit | 7.40 | ❌ 8.00 | ✅ 5.00 |
|---|---|---|---|---|
| **Swap rows** | | | | |
| | chromium | 15.46 | ✅ 14.60 | ❌ 52.76 |
| | firefox | ✅ 10.00 | 16.40 | ❌ 63.20 |
| | webkit | ✅ 6.20 | 16.80 | ❌ 45.00 |
|---|---|---|---|---|
| **Update every 10th row** | | | | |
| | chromium | 20.58 | ✅ 16.74 | ❌ 52.44 |
| | firefox | 26.00 | ✅ 22.60 | ❌ 62.40 |
| | webkit | ✅ 17.00 | 21.20 | ❌ 45.00 |
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
| | chromium | ✅ 60.0 / ✅ 0.0 | 34.4 / ❌ 1.0 | ❌ 32.0 / ❌ 1.0 |
| | firefox | ✅ 60.0 / ✅ 0.0 | ❌ 0.0 / ❌ 1.0 | ❌ 0.0 / ❌ 1.0 |
| | webkit | ✅ 60.0 / ✅ 0.0 | 33.8 / ❌ 1.0 | ❌ 31.6 / ❌ 1.0 |
|---|---|---|---|---|
| **Real-time Feed UI Responsiveness** | | | | |
| | chromium | ✅ 60.0 / ✅ 0.0 | ✅ 60.0 / ✅ 0.0 | ❌ 50.0 / ❌ 1.2 |
| | firefox | ✅ 60.0 / ✅ 0.0 | 13.6 / ❌ 48.8 | ❌ 9.8 / 39.8 |
| | webkit | ✅ 60.0 / ✅ 0.0 | 45.0 / ✅ 0.0 | ❌ 30.2 / ❌ 4.6 |
|---|---|---|---|---|
