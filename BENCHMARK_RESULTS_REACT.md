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
|                           | chromium   | 3.30 (±0.06)  | 3.38 (±0.07)   | -2.42%      |
|                           | firefox    | 3.60 (±0.80)  | 3.60 (±0.49)   | 0.00%       |
|                           | webkit     | 3.80 (±0.40)  | 4.00 (±1.55)   | -5.26%      |
|                           | **Average**| **3.57**        | **3.66**         | **-2.62%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 413.58 (±14.18) | 409.06 (±8.55) | +1.09%      |
|                           | firefox    | 987.00 (±8.79) | 1005.60 (±15.47) | -1.88%      |
|                           | webkit     | 414.20 (±13.08) | 409.20 (±12.95) | +1.21%      |
|                           | **Average**| **604.93**        | **607.95**         | **-0.50%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 67.38 (±0.97) | 67.28 (±1.55)  | +0.15%      |
|                           | firefox    | 129.40 (±4.32) | 127.20 (±0.40) | +1.70%      |
|                           | webkit     | 62.40 (±2.06) | 60.20 (±1.17)  | +3.53%      |
|                           | **Average**| **86.39**        | **84.89**         | **+1.74%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 3678.10 (±204.43) | 3962.32 (±405.49) | -7.73%      |
|                           | webkit     | 4576.80 (±205.11) | 4620.00 (±49.42) | -0.94%      |
|                           | **Average**| **4127.45**        | **4291.16**         | **-3.97%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 55.02 (±2.59) | 47.90 (±4.39)  | +12.94%     |
|                           | firefox    | 65.40 (±0.80) | 65.40 (±1.62)  | 0.00%       |
|                           | webkit     | 47.00 (±1.90) | 47.40 (±1.02)  | -0.85%      |
|                           | **Average**| **55.81**        | **53.57**         | **+4.01%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 10.00 (±0.21) | 10.08 (±0.52)  | -0.80%      |
|                           | firefox    | 5.60 (±0.49)  | 6.00 (±0.00)   | -7.14%      |
|                           | webkit     | 4.80 (±0.40)  | 4.40 (±0.49)   | +8.33%      |
|                           | **Average**| **6.80**        | **6.83**         | **-0.39%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 52.02 (±2.13) | 52.22 (±12.88) | -0.38%      |
|                           | firefox    | 63.60 (±0.80) | 65.80 (±1.72)  | -3.46%      |
|                           | webkit     | 47.00 (±1.41) | 46.00 (±1.55)  | +2.13%      |
|                           | **Average**| **54.21**        | **54.67**         | **-0.86%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 51.80 (±1.65) | 64.28 (±14.22) | -24.09%     |
|                           | firefox    | 67.40 (±9.81) | 64.80 (±1.60)  | +3.86%      |
|                           | webkit     | 45.20 (±1.94) | 45.80 (±0.40)  | -1.33%      |
|                           | **Average**| **54.80**        | **58.29**         | **-6.37%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Main Thread)**                            |            |                              |                               |
|                                             | chromium   | 31.6 (±0.5) / 1.0 (±0.0)     | 31.8 (±0.4) / 1.0 (±0.0)      |
|                                             | firefox    | 0.2 (±0.4) / 1.0 (±0.0)      | 0.0 (±0.0) / 1.0 (±0.0)       |
|                                             | webkit     | 31.6 (±0.5) / 1.0 (±0.0)     | 32.0 (±0.0) / 1.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 59.6 (±0.8) / 0.2 (±0.4)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 49.4 (±1.4) / 3.0 (±1.3)     | 48.2 (±3.2) / 2.6 (±1.4)      |
|                                             | firefox    | 10.0 (±0.0) / 40.4 (±0.8)    | 10.2 (±0.4) / 41.2 (±1.0)     |
|                                             | webkit     | 29.4 (±0.8) / 6.4 (±2.5)     | 29.0 (±0.6) / 6.8 (±2.3)      |
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


## Known Issues

- **React benchmark: Create 1M rows (Firefox)**: This test is skipped for Firefox due to known Out-of-Memory issues when attempting to render 1 million rows.

---

*This file is auto-generated. Do not edit manually.*
