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
|                           | chromium   | 14.84 (±0.27) | 11.98 (±3.83)  | +19.27%     |
|                           | firefox    | 15.00 (±0.63) | 15.00 (±0.00)  | 0.00%       |
|                           | webkit     | 15.00 (±1.10) | 14.80 (±0.75)  | +1.33%      |
|                           | **Average**| **14.95**        | **13.93**         | **+6.82%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 379.86 (±7.36) | 367.48 (±5.59) | +3.26%      |
|                           | firefox    | 430.00 (±4.20) | 442.00 (±7.80) | -2.79%      |
|                           | webkit     | 413.20 (±6.14) | 412.60 (±1.74) | +0.15%      |
|                           | **Average**| **407.69**        | **407.36**         | **+0.08%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 74.18 (±1.92) | 58.80 (±5.99)  | +20.73%     |
|                           | firefox    | 65.60 (±3.61) | 64.60 (±5.12)  | +1.52%      |
|                           | webkit     | 77.20 (±3.06) | 70.40 (±6.09)  | +8.81%      |
|                           | **Average**| **72.33**        | **64.60**         | **+10.68%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 3491.62 (±15.27) | 3451.66 (±43.42) | +1.14%      |
|                           | firefox    | 4347.20 (±72.68) | 4344.80 (±147.94) | +0.06%      |
|                           | webkit     | 3597.80 (±52.51) | 3566.40 (±15.01) | +0.87%      |
|                           | **Average**| **3812.21**        | **3787.62**         | **+0.64%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 14.82 (±0.61) | 11.96 (±3.74)  | +19.30%     |
|                           | firefox    | 13.20 (±1.72) | 14.00 (±0.63)  | -6.06%      |
|                           | webkit     | 13.80 (±0.75) | 14.40 (±0.49)  | -4.35%      |
|                           | **Average**| **13.94**        | **13.45**         | **+3.49%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 14.48 (±0.58) | 10.10 (±4.04)  | +30.25%     |
|                           | firefox    | 13.40 (±1.36) | 13.60 (±0.49)  | -1.49%      |
|                           | webkit     | 13.40 (±0.49) | 14.20 (±0.40)  | -5.97%      |
|                           | **Average**| **13.76**        | **12.63**         | **+8.19%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 8.00 (±0.22)  | 7.80 (±0.68)   | +2.50%      |
|                           | firefox    | 9.80 (±6.62)  | 9.20 (±6.49)   | +6.12%      |
|                           | webkit     | 16.20 (±7.60) | 10.00 (±6.03)  | +38.27%     |
|                           | **Average**| **11.33**        | **9.00**         | **+20.59%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 14.20 (±0.22) | 14.38 (±0.50)  | -1.27%      |
|                           | firefox    | 30.60 (±0.49) | 30.60 (±0.49)  | 0.00%       |
|                           | webkit     | 30.00 (±1.67) | 30.20 (±1.33)  | -0.67%      |
|                           | **Average**| **24.93**        | **25.06**         | **-0.51%**    |
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
| chromium   | N/A         |
| firefox    | N/A         |
| webkit     | N/A         |


## System Information

| Property   | Value       |
|------------|-------------|
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
