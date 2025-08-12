# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (`/apps/benchmarks/`).
- **Production Mode**: Using the optimized build output (`/dist/production/apps/benchmarks/`).

The data is aggregated over **5 run(s)**. The value in parentheses (±) is the standard deviation.

## Duration Benchmarks

This table shows the average execution time in milliseconds (ms). Lower is better.

| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
| **Clear rows**               |            |               |                |             |
|                           | chromium   | 6.42 (±0.17)  | 6.46 (±0.16)   | -0.62%      |
|                           | firefox    | 13.20 (±0.40) | 13.40 (±0.80)  | -1.52%      |
|                           | webkit     | 11.40 (±0.49) | 12.00 (±0.63)  | -5.26%      |
|                           | **Average**| **10.34**        | **10.62**         | **-2.71%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 135.64 (±1.98) | 136.56 (±2.57) | -0.68%      |
|                           | firefox    | 334.60 (±11.57) | 331.00 (±5.62) | +1.08%      |
|                           | webkit     | 244.40 (±3.01) | 248.80 (±9.11) | -1.80%      |
|                           | **Average**| **238.21**        | **238.79**         | **-0.24%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 38.88 (±1.02) | 38.92 (±1.03)  | -0.10%      |
|                           | firefox    | 63.20 (±0.75) | 62.40 (±1.20)  | +1.27%      |
|                           | webkit     | 68.40 (±3.72) | 71.20 (±4.87)  | -4.09%      |
|                           | **Average**| **56.83**        | **57.51**         | **-1.20%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 963.84 (±10.54) | 969.60 (±9.22) | -0.60%      |
|                           | firefox    | 3309.60 (±79.50) | 3311.60 (±72.20) | -0.06%      |
|                           | webkit     | 1986.40 (±46.59) | 1996.20 (±46.98) | -0.49%      |
|                           | **Average**| **2086.61**        | **2092.47**         | **-0.28%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 13.06 (±0.48) | 12.96 (±0.71)  | +0.77%      |
|                           | firefox    | 20.60 (±1.02) | 19.60 (±0.49)  | +4.85%      |
|                           | webkit     | 18.20 (±0.40) | 18.80 (±0.75)  | -3.30%      |
|                           | **Average**| **17.29**        | **17.12**         | **+0.96%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 4.42 (±1.50)  | 4.96 (±1.46)   | -12.22%     |
|                           | firefox    | 6.80 (±5.23)  | 2.60 (±0.49)   | +61.76%     |
|                           | webkit     | 5.00 (±2.53)  | 4.40 (±1.85)   | +12.00%     |
|                           | **Average**| **5.41**        | **3.99**         | **+26.26%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 13.22 (±0.41) | 13.18 (±0.26)  | +0.30%      |
|                           | firefox    | 20.20 (±0.75) | 19.20 (±0.40)  | +4.95%      |
|                           | webkit     | 18.40 (±1.50) | 18.00 (±0.63)  | +2.17%      |
|                           | **Average**| **17.27**        | **16.79**         | **+2.78%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 17.90 (±1.27) | 18.98 (±0.43)  | -6.03%      |
|                           | firefox    | 24.80 (±0.98) | 27.00 (±2.76)  | -8.87%      |
|                           | webkit     | 22.80 (±0.75) | 23.60 (±1.20)  | -3.51%      |
|                           | **Average**| **21.83**        | **23.19**         | **-6.23%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Main Thread)**                            |            |                              |                               |
|                                             | chromium   | 34.0 (±0.0) / 1.0 (±0.0)     | 34.0 (±0.0) / 1.0 (±0.0)      |
|                                             | firefox    | 0.0 (±0.0) / 1.0 (±0.0)      | 0.0 (±0.0) / 1.0 (±0.0)       |
|                                             | webkit     | 32.8 (±0.4) / 1.0 (±0.0)     | 32.8 (±0.4) / 1.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 13.2 (±0.4) / 48.8 (±0.7)    | 13.4 (±0.5) / 49.0 (±0.9)     |
|                                             | webkit     | 44.2 (±1.5) / 0.0 (±0.0)     | 47.0 (±1.7) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|


## Scrolling Fluidity Benchmarks

This table shows metrics related to how smoothly content updates during a scroll. For all metrics, lower is better.

| Benchmark                                   | Browser    | Dev Mode (Avg Time to Valid State / Max Time to Valid State) | Dev Mode (Update Success Rate) | Prod Mode (Avg Time to Valid State / Max Time to Valid State) | Prod Mode (Update Success Rate) |
|---------------------------------------------|------------|--------------------------------------------------------------|--------------------------------|---------------------------------------------------------------|---------------------------------|


## Browser Versions

| Browser    | Version     |
|------------|-------------|
| Chrome     | Google Chrome 139.0.7258.67 |
| Firefox    | Mozilla Firefox 141.0.3 |
| Safari     | Safari kMDItemVersion = "18.5" |


## System Information

| Property   | Value       |
|------------|-------------|
| OS Name    | macOS       |
| OS Version | 15.5        |
| Total RAM  | 64GB |
| CPU Cores  | 16 |
| Node.js    | v22.3.0     |
| Playwright | 1.54.2      |
| Platform   | darwin      |
| Architecture | x64         |


## Known Issues

- **React benchmark: Create 1M rows (Firefox)**: This test is skipped for Firefox due to known Out-of-Memory issues when attempting to render 1 million rows.

---

*This file is auto-generated. Do not edit manually.*
