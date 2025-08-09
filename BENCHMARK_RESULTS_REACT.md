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
|                           | chromium   | 3.38 (±0.07)  | 3.32 (±0.07)   | +1.78%      |
|                           | firefox    | 3.60 (±0.49)  | 3.60 (±0.49)   | 0.00%       |
|                           | webkit     | 3.20 (±0.40)  | 3.40 (±0.49)   | -6.25%      |
|                           | **Average**| **3.39**        | **3.44**         | **-1.38%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 403.56 (±9.78) | 386.04 (±2.62) | +4.34%      |
|                           | firefox    | 972.60 (±9.83) | 971.60 (±2.73) | +0.10%      |
|                           | webkit     | 392.40 (±10.44) | 387.20 (±2.48) | +1.33%      |
|                           | **Average**| **589.52**        | **581.61**         | **+1.34%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 68.34 (±4.11) | 65.96 (±0.65)  | +3.48%      |
|                           | firefox    | 124.60 (±1.85) | 125.00 (±1.41) | -0.32%      |
|                           | webkit     | 59.40 (±0.80) | 59.20 (±0.40)  | +0.34%      |
|                           | **Average**| **84.11**        | **83.39**         | **+0.86%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 3708.00 (±252.60) | 3591.60 (±198.23) | +3.14%      |
|                           | webkit     | 4423.20 (±120.27) | 4378.60 (±84.69) | +1.01%      |
|                           | **Average**| **4065.60**        | **3985.10**         | **+1.98%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 48.60 (±6.71) | 52.86 (±5.45)  | -8.77%      |
|                           | firefox    | 64.00 (±1.26) | 62.80 (±0.75)  | +1.88%      |
|                           | webkit     | 45.20 (±0.40) | 46.00 (±0.89)  | -1.77%      |
|                           | **Average**| **52.60**        | **53.89**         | **-2.45%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 9.82 (±0.18)  | 9.80 (±0.25)   | +0.20%      |
|                           | firefox    | 5.60 (±0.49)  | 5.60 (±0.49)   | 0.00%       |
|                           | webkit     | 4.80 (±0.40)  | 4.60 (±0.49)   | +4.17%      |
|                           | **Average**| **6.74**        | **6.67**         | **+1.09%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 51.62 (±5.61) | 48.10 (±4.78)  | +6.82%      |
|                           | firefox    | 62.40 (±0.80) | 61.60 (±0.80)  | +1.28%      |
|                           | webkit     | 44.00 (±1.26) | 44.40 (±1.02)  | -0.91%      |
|                           | **Average**| **52.67**        | **51.37**         | **+2.48%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 57.70 (±3.02) | 48.84 (±6.53)  | +15.36%     |
|                           | firefox    | 62.00 (±0.63) | 61.60 (±0.80)  | +0.65%      |
|                           | webkit     | 45.40 (±2.87) | 44.00 (±1.26)  | +3.08%      |
|                           | **Average**| **55.03**        | **51.48**         | **+6.46%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Main Thread)**                            |            |                              |                               |
|                                             | chromium   | 32.0 (±0.0) / 1.0 (±0.0)     | 32.0 (±0.0) / 1.0 (±0.0)      |
|                                             | firefox    | 0.0 (±0.0) / 1.0 (±0.0)      | 0.0 (±0.0) / 1.0 (±0.0)       |
|                                             | webkit     | 31.8 (±0.4) / 1.0 (±0.0)     | 32.0 (±0.0) / 1.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 50.6 (±1.0) / 1.4 (±0.8)     | 51.0 (±0.0) / 2.2 (±0.7)      |
|                                             | firefox    | 10.0 (±0.0) / 40.6 (±0.8)    | 10.0 (±0.0) / 40.8 (±1.0)     |
|                                             | webkit     | 30.2 (±0.4) / 4.0 (±0.0)     | 30.0 (±0.0) / 4.4 (±0.5)      |
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
