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
|                           | chromium   | 3.02 (±0.04)  | 3.06 (±0.05)   | -1.32%      |
|                           | firefox    | 3.80 (±0.75)  | 3.00 (±0.00)   | +21.05%     |
|                           | webkit     | 3.20 (±0.40)  | 3.40 (±0.49)   | -6.25%      |
|                           | **Average**| **3.34**        | **3.15**         | **+5.59%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 413.90 (±21.36) | 401.00 (±8.74) | +3.12%      |
|                           | firefox    | 1009.40 (±31.90) | 1011.60 (±20.83) | -0.22%      |
|                           | webkit     | 411.00 (±9.17) | 401.20 (±3.66) | +2.38%      |
|                           | **Average**| **611.43**        | **604.60**         | **+1.12%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 65.38 (±0.24) | 64.82 (±0.69)  | +0.86%      |
|                           | firefox    | 131.40 (±7.81) | 127.80 (±3.76) | +2.74%      |
|                           | webkit     | 59.60 (±0.49) | 59.80 (±0.40)  | -0.34%      |
|                           | **Average**| **85.46**        | **84.14**         | **+1.54%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 3756.18 (±240.55) | 3899.24 (±298.70) | -3.81%      |
|                           | webkit     | 4652.40 (±144.35) | 4558.80 (±57.96) | +2.01%      |
|                           | **Average**| **4204.29**        | **4229.02**         | **-0.59%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 51.24 (±5.42) | 51.16 (±9.13)  | +0.16%      |
|                           | firefox    | 64.60 (±1.02) | 65.40 (±2.06)  | -1.24%      |
|                           | webkit     | 46.80 (±0.75) | 46.60 (±0.80)  | +0.43%      |
|                           | **Average**| **54.21**        | **54.39**         | **-0.32%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 8.24 (±0.34)  | 8.20 (±0.30)   | +0.49%      |
|                           | firefox    | 4.60 (±0.49)  | 5.20 (±0.40)   | -13.04%     |
|                           | webkit     | 4.60 (±0.49)  | 4.20 (±0.40)   | +8.70%      |
|                           | **Average**| **5.81**        | **5.87**         | **-0.92%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 49.52 (±5.92) | 45.98 (±7.74)  | +7.15%      |
|                           | firefox    | 64.40 (±1.85) | 64.40 (±2.65)  | 0.00%       |
|                           | webkit     | 46.20 (±0.75) | 45.60 (±0.49)  | +1.30%      |
|                           | **Average**| **53.37**        | **51.99**         | **+2.59%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 49.72 (±4.04) | 53.68 (±3.65)  | -7.96%      |
|                           | firefox    | 63.20 (±0.75) | 72.80 (±18.69) | -15.19%     |
|                           | webkit     | 46.40 (±1.20) | 45.40 (±1.02)  | +2.16%      |
|                           | **Average**| **53.11**        | **57.29**         | **-7.88%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Main Thread)**                            |            |                              |                               |
|                                             | chromium   | 31.6 (±0.5) / 1.0 (±0.0)     | 31.8 (±0.4) / 1.0 (±0.0)      |
|                                             | firefox    | 0.0 (±0.0) / 1.0 (±0.0)      | 0.0 (±0.0) / 1.0 (±0.0)       |
|                                             | webkit     | 31.0 (±0.0) / 1.0 (±0.0)     | 31.6 (±0.5) / 1.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 59.8 (±0.4) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 51.0 (±1.1) / 2.0 (±1.4)     | 50.8 (±0.7) / 1.8 (±1.8)      |
|                                             | firefox    | 10.0 (±0.0) / 41.0 (±0.6)    | 10.0 (±0.0) / 40.0 (±0.9)     |
|                                             | webkit     | 29.8 (±1.0) / 5.2 (±1.6)     | 30.2 (±0.4) / 4.2 (±0.4)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Scrolling Performance Under Duress**                            |            |                              |                               |
|                                             | chromium   | 33.4 (±0.5) / 7.8 (±1.2)     | 34.4 (±0.5) / 7.2 (±1.0)      |
|                                             | firefox    | 9.2 (±0.4) / 37.8 (±0.7)     | 9.2 (±0.4) / 38.0 (±0.6)      |
|                                             | webkit     | 17.4 (±0.5) / 55.6 (±2.7)    | 17.4 (±0.5) / 55.4 (±2.6)     |
|---------------------------------------------|------------|------------------------------|-------------------------------|


## Scrolling Fluidity Benchmarks

This table shows metrics related to how smoothly content updates during a scroll. For all metrics, lower is better.

| Benchmark                                   | Browser    | Dev Mode (Avg/Max Row Lag) | Dev Mode (Stale Frames) | Prod Mode (Avg/Max Row Lag) | Prod Mode (Stale Frames) |
|---------------------------------------------|------------|----------------------------|-------------------------|-----------------------------|--------------------------|
| **Scrolling Performance Under Duress**                            |            |                            |                         |                             |                          |
|                                             | chromium   | 75.4 (±1.2) / 226.8 (±33.1) | 134.8 (±2.6)            | 73.6 (±0.7) / 177.2 (±16.4) | 138.4 (±1.4)             |
|                                             | firefox    | 259.2 (±4.9) / 377.4 (±26.0) | 37.8 (±0.7)             | 257.9 (±4.1) / 377.0 (±1.1) | 38.0 (±0.6)              |
|                                             | webkit     | 141.0 (±3.5) / 241.2 (±28.9) | 70.8 (±1.8)             | 141.4 (±1.5) / 227.0 (±11.4) | 70.6 (±0.8)              |
|---------------------------------------------|------------|----------------------------|-------------------------|-----------------------------|--------------------------|


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
