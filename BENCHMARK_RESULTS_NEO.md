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
|                           | chromium   | 14.34 (±2.44) | 12.04 (±3.87)  | +16.04%     |
|                           | firefox    | 14.60 (±0.49) | 14.20 (±0.40)  | +2.74%      |
|                           | webkit     | 14.40 (±0.49) | 14.80 (±0.40)  | -2.78%      |
|                           | **Average**| **14.45**        | **13.68**         | **+5.31%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 381.32 (±9.30) | 374.90 (±7.72) | +1.68%      |
|                           | firefox    | 434.80 (±8.30) | 434.60 (±7.23) | +0.05%      |
|                           | webkit     | 412.00 (±14.45) | 414.00 (±4.52) | -0.49%      |
|                           | **Average**| **409.37**        | **407.83**         | **+0.38%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 70.76 (±7.30) | 52.30 (±4.87)  | +26.09%     |
|                           | firefox    | 69.20 (±6.24) | 69.00 (±5.73)  | +0.29%      |
|                           | webkit     | 75.20 (±2.99) | 73.60 (±3.83)  | +2.13%      |
|                           | **Average**| **71.72**        | **64.97**         | **+9.42%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 3495.96 (±40.46) | 3433.60 (±13.76) | +1.78%      |
|                           | firefox    | 4464.80 (±193.24) | 4288.80 (±76.65) | +3.94%      |
|                           | webkit     | 3609.40 (±29.70) | 3539.00 (±97.22) | +1.95%      |
|                           | **Average**| **3856.72**        | **3753.80**         | **+2.67%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 12.06 (±3.00) | 11.66 (±3.95)  | +3.32%      |
|                           | firefox    | 14.40 (±0.49) | 14.80 (±0.40)  | -2.78%      |
|                           | webkit     | 14.20 (±0.40) | 14.00 (±0.63)  | +1.41%      |
|                           | **Average**| **13.55**        | **13.49**         | **+0.49%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 14.92 (±0.42) | 13.14 (±3.12)  | +11.93%     |
|                           | firefox    | 13.40 (±1.36) | 13.20 (±1.33)  | +1.49%      |
|                           | webkit     | 12.80 (±1.47) | 14.40 (±0.49)  | -12.50%     |
|                           | **Average**| **13.71**        | **13.58**         | **+0.92%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 8.38 (±0.54)  | 8.56 (±0.55)   | -2.15%      |
|                           | firefox    | 11.80 (±7.19) | 9.20 (±6.91)   | +22.03%     |
|                           | webkit     | 12.40 (±6.80) | 10.00 (±6.51)  | +19.35%     |
|                           | **Average**| **10.86**        | **9.25**         | **+14.79%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 15.54 (±4.26) | 13.94 (±0.41)  | +10.30%     |
|                           | firefox    | 29.40 (±0.80) | 30.40 (±0.80)  | -3.40%      |
|                           | webkit     | 30.60 (±0.49) | 29.40 (±1.62)  | +3.92%      |
|                           | **Average**| **25.18**        | **24.58**         | **+2.38%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (App Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|


## Browser Versions

| Browser    | Version     |
|------------|-------------|
| Chrome     | Google Chrome 138.0.7204.184 |
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
