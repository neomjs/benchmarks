# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (`/apps/benchmarks/`).
- **Production Mode**: Using the optimized build output (`/dist/production/apps/benchmarks/`).

The data is aggregated over **10 run(s)**. The value in parentheses (±) is the standard deviation.

## Duration Benchmarks

This table shows the average execution time in milliseconds (ms). Lower is better.

| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
| **Clear rows**               |            |               |                |             |
|                           | chromium   | 10.22 (±1.72) | 12.16 (±0.86)  | -18.98%     |
|                           | firefox    | 10.40 (±1.02) | 10.20 (±1.72)  | +1.92%      |
|                           | webkit     | 7.60 (±2.73)  | 7.80 (±2.56)   | -2.63%      |
|                           | **Average**| **9.41**        | **10.05**         | **-6.87%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 70.78 (±4.98) | 69.74 (±4.97)  | +1.47%      |
|                           | firefox    | 72.20 (±6.40) | 72.80 (±5.31)  | -0.83%      |
|                           | webkit     | 71.20 (±4.75) | 90.80 (±5.71)  | -27.53%     |
|                           | **Average**| **71.39**        | **77.78**         | **-8.95%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 37.08 (±5.20) | 24.76 (±7.47)  | +33.23%     |
|                           | firefox    | 23.00 (±3.74) | 23.00 (±5.40)  | 0.00%       |
|                           | webkit     | 35.80 (±6.31) | 25.40 (±3.93)  | +29.05%     |
|                           | **Average**| **31.96**        | **24.39**         | **+23.70%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 553.38 (±13.13) | 548.28 (±15.12) | +0.92%      |
|                           | firefox    | 702.20 (±6.18) | 715.00 (±45.51) | -1.82%      |
|                           | webkit     | 549.20 (±59.37) | 532.20 (±14.72) | +3.10%      |
|                           | **Average**| **601.59**        | **598.49**         | **+0.52%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 10.24 (±3.32) | 10.46 (±1.41)  | -2.15%      |
|                           | firefox    | 10.00 (±1.90) | 14.00 (±4.60)  | -40.00%     |
|                           | webkit     | 4.80 (±2.64)  | 5.40 (±3.01)   | -12.50%     |
|                           | **Average**| **8.35**        | **9.95**         | **-19.25%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 12.20 (±4.62) | 15.30 (±5.11)  | -25.41%     |
|                           | firefox    | 11.80 (±3.12) | 11.60 (±4.27)  | +1.69%      |
|                           | webkit     | 8.40 (±2.73)  | 9.00 (±6.00)   | -7.14%      |
|                           | **Average**| **10.80**        | **11.97**         | **-10.80%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 9.42 (±6.11)  | 17.78 (±2.26)  | -88.75%     |
|                           | firefox    | 14.00 (±3.74) | 12.60 (±4.32)  | +10.00%     |
|                           | webkit     | 10.60 (±5.57) | 8.40 (±4.32)   | +20.75%     |
|                           | **Average**| **11.34**        | **12.93**         | **-13.99%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 28.34 (±4.52) | 24.64 (±4.20)  | +13.06%     |
|                           | firefox    | 35.80 (±7.60) | 36.40 (±8.16)  | -1.68%      |
|                           | webkit     | 31.20 (±0.75) | 30.20 (±1.47)  | +3.21%      |
|                           | **Average**| **31.78**        | **30.41**         | **+4.30%**    |
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
| **Scrolling Performance Under Duress**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|


## Scrolling Fluidity Benchmarks

This table shows metrics related to how smoothly content updates during a scroll. For all metrics, lower is better.

| Benchmark                                   | Browser    | Avg/Max Row Lag | Stale Frames |
|---------------------------------------------|------------|-----------------|--------------|
| **Scrolling Performance Under Duress**                            |            |                 |              |
|                                             | chromium   | 1.0 (±0.0) / 1.0 (±0.0) | 0.0 (±0.0)   |
|                                             | firefox    | 1.0 (±0.0) / 1.0 (±0.0) | 0.0 (±0.0)   |
|                                             | webkit     | 1.0 (±0.0) / 1.0 (±0.0) | 0.0 (±0.0)   |
|---------------------------------------------|------------|-----------------|--------------|


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
