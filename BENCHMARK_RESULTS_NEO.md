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
|                           | chromium   | 10.82 (±2.39) | 12.54 (±3.89)  | -15.90%     |
|                           | firefox    | 9.20 (±2.56)  | 9.80 (±0.40)   | -6.52%      |
|                           | webkit     | 11.00 (±1.10) | 13.00 (±7.40)  | -18.18%     |
|                           | **Average**| **10.34**        | **11.78**         | **-13.93%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 75.46 (±9.90) | 63.50 (±1.37)  | +15.85%     |
|                           | firefox    | 71.60 (±5.64) | 74.40 (±7.68)  | -3.91%      |
|                           | webkit     | 82.00 (±12.28) | 87.20 (±3.87)  | -6.34%      |
|                           | **Average**| **76.35**        | **75.03**         | **+1.73%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 41.12 (±1.51) | 23.08 (±7.65)  | +43.87%     |
|                           | firefox    | 22.20 (±4.49) | 21.00 (±4.24)  | +5.41%      |
|                           | webkit     | 34.80 (±13.01) | 28.40 (±4.63)  | +18.39%     |
|                           | **Average**| **32.71**        | **24.16**         | **+26.13%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 550.52 (±11.97) | 538.40 (±7.01) | +2.20%      |
|                           | firefox    | 677.60 (±15.16) | 682.00 (±14.18) | -0.65%      |
|                           | webkit     | 515.80 (±18.35) | 543.40 (±16.35) | -5.35%      |
|                           | **Average**| **581.31**        | **587.93**         | **-1.14%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 9.50 (±3.05)  | 9.52 (±3.88)   | -0.21%      |
|                           | firefox    | 15.00 (±6.16) | 8.80 (±1.33)   | +41.33%     |
|                           | webkit     | 2.40 (±0.49)  | 3.80 (±1.94)   | -58.33%     |
|                           | **Average**| **8.97**        | **7.37**         | **+17.77%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 8.12 (±3.09)  | 11.44 (±5.20)  | -40.89%     |
|                           | firefox    | 9.80 (±1.17)  | 12.60 (±5.20)  | -28.57%     |
|                           | webkit     | 6.00 (±0.00)  | 6.40 (±0.80)   | -6.67%      |
|                           | **Average**| **7.97**        | **10.15**         | **-27.26%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 14.70 (±2.71) | 15.76 (±2.51)  | -7.21%      |
|                           | firefox    | 17.80 (±2.79) | 9.60 (±3.07)   | +46.07%     |
|                           | webkit     | 10.80 (±3.82) | 8.00 (±2.00)   | +25.93%     |
|                           | **Average**| **14.43**        | **11.12**         | **+22.96%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 29.22 (±2.87) | 29.46 (±5.70)  | -0.82%      |
|                           | firefox    | 36.00 (±7.43) | 39.40 (±6.71)  | -9.44%      |
|                           | webkit     | 30.80 (±0.75) | 29.80 (±0.75)  | +3.25%      |
|                           | **Average**| **32.01**        | **32.89**         | **-2.75%**    |
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
