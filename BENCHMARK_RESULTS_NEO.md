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
|                           | chromium   | 10.86 (±3.53) | 12.26 (±0.96)  | -12.89%     |
|                           | firefox    | 10.40 (±0.49) | 10.40 (±0.80)  | 0.00%       |
|                           | webkit     | 12.80 (±0.40) | 12.60 (±1.02)  | +1.56%      |
|                           | **Average**| **11.35**        | **11.75**         | **-3.52%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 46.62 (±9.88) | 36.70 (±5.93)  | +21.28%     |
|                           | firefox    | 38.60 (±2.94) | 43.00 (±4.69)  | -11.40%     |
|                           | webkit     | 60.20 (±9.72) | 63.00 (±4.82)  | -4.65%      |
|                           | **Average**| **48.47**        | **47.57**         | **+1.87%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 38.32 (±4.53) | 19.00 (±4.05)  | +50.42%     |
|                           | firefox    | 30.40 (±4.76) | 28.00 (±4.47)  | +7.89%      |
|                           | webkit     | 33.60 (±5.08) | 35.60 (±2.33)  | -5.95%      |
|                           | **Average**| **34.11**        | **27.53**         | **+19.27%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 143.96 (±12.75) | 141.56 (±2.36) | +1.67%      |
|                           | firefox    | 206.40 (±3.98) | 205.60 (±7.50) | +0.39%      |
|                           | webkit     | 1616.60 (±1766.05) | 909.00 (±1460.04) | +43.77%     |
|                           | **Average**| **655.65**        | **418.72**         | **+36.14%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 9.56 (±2.87)  | 11.50 (±4.38)  | -20.29%     |
|                           | firefox    | 10.20 (±0.75) | 9.20 (±2.14)   | +9.80%      |
|                           | webkit     | 4.80 (±3.60)  | 2.80 (±0.40)   | +41.67%     |
|                           | **Average**| **8.19**        | **7.83**         | **+4.32%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 8.08 (±3.95)  | 13.72 (±6.45)  | -69.80%     |
|                           | firefox    | 10.00 (±0.00) | 10.00 (±0.63)  | 0.00%       |
|                           | webkit     | 5.80 (±0.40)  | 7.40 (±2.80)   | -27.59%     |
|                           | **Average**| **7.96**        | **10.37**         | **-30.32%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 6.54 (±3.93)  | 15.46 (±5.32)  | -136.39%    |
|                           | firefox    | 12.00 (±3.85) | 10.00 (±4.38)  | +16.67%     |
|                           | webkit     | 6.20 (±0.40)  | 6.20 (±0.40)   | +0.00%      |
|                           | **Average**| **8.25**        | **10.55**         | **-27.97%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 16.32 (±6.37) | 20.58 (±4.78)  | -26.10%     |
|                           | firefox    | 26.40 (±1.50) | 26.00 (±0.89)  | +1.52%      |
|                           | webkit     | 19.20 (±4.45) | 17.00 (±0.00)  | +11.46%     |
|                           | **Average**| **20.64**        | **21.19**         | **-2.68%**    |
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
