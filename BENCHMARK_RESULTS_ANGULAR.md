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
|                           | chromium   | 6.54 (±0.17)  | 6.44 (±0.10)   | +1.53%      |
|                           | firefox    | 12.80 (±1.94) | 12.60 (±1.36)  | +1.56%      |
|                           | webkit     | 12.40 (±0.80) | 12.00 (±0.63)  | +3.23%      |
|                           | **Average**| **10.58**        | **10.35**         | **+2.21%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 135.08 (±1.34) | 134.66 (±1.51) | +0.31%      |
|                           | firefox    | 318.00 (±9.03) | 316.40 (±6.50) | +0.50%      |
|                           | webkit     | 222.40 (±9.75) | 228.20 (±5.56) | -2.61%      |
|                           | **Average**| **225.16**        | **226.42**         | **-0.56%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 36.68 (±0.37) | 36.66 (±0.57)  | +0.05%      |
|                           | firefox    | 60.40 (±1.50) | 60.60 (±1.50)  | -0.33%      |
|                           | webkit     | 68.80 (±1.17) | 65.40 (±5.68)  | +4.94%      |
|                           | **Average**| **55.29**        | **54.22**         | **+1.94%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 983.94 (±5.20) | 980.78 (±13.75) | +0.32%      |
|                           | firefox    | 3163.00 (±74.91) | 3166.20 (±70.71) | -0.10%      |
|                           | webkit     | 1894.80 (±51.86) | 1875.40 (±23.42) | +1.02%      |
|                           | **Average**| **2013.91**        | **2007.46**         | **+0.32%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 14.88 (±0.32) | 15.26 (±0.51)  | -2.55%      |
|                           | firefox    | 17.00 (±1.79) | 15.80 (±0.40)  | +7.06%      |
|                           | webkit     | 18.60 (±0.49) | 18.00 (±0.63)  | +3.23%      |
|                           | **Average**| **16.83**        | **16.35**         | **+2.81%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 6.70 (±2.37)  | 6.16 (±2.11)   | +8.06%      |
|                           | firefox    | 6.00 (±6.00)  | 4.40 (±2.80)   | +26.67%     |
|                           | webkit     | 8.40 (±4.96)  | 8.00 (±4.05)   | +4.76%      |
|                           | **Average**| **7.03**        | **6.19**         | **+12.04%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 14.84 (±0.22) | 14.60 (±0.23)  | +1.62%      |
|                           | firefox    | 15.60 (±1.36) | 16.40 (±1.02)  | -5.13%      |
|                           | webkit     | 17.20 (±0.98) | 16.80 (±0.40)  | +2.33%      |
|                           | **Average**| **15.88**        | **15.93**         | **-0.34%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 18.42 (±0.19) | 16.74 (±1.12)  | +9.12%      |
|                           | firefox    | 22.80 (±2.71) | 22.60 (±1.85)  | +0.88%      |
|                           | webkit     | 22.00 (±0.63) | 21.20 (±0.40)  | +3.64%      |
|                           | **Average**| **21.07**        | **20.18**         | **+4.24%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Main Thread)**                            |            |                              |                               |
|                                             | chromium   | 34.2 (±0.7) / 1.0 (±0.0)     | 34.4 (±0.5) / 1.0 (±0.0)      |
|                                             | firefox    | 0.2 (±0.4) / 1.0 (±0.0)      | 0.0 (±0.0) / 1.0 (±0.0)       |
|                                             | webkit     | 33.4 (±0.5) / 1.0 (±0.0)     | 33.8 (±0.4) / 1.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 13.4 (±0.8) / 49.6 (±1.0)    | 13.6 (±1.2) / 48.8 (±2.0)     |
|                                             | webkit     | 45.2 (±1.6) / 0.0 (±0.0)     | 45.0 (±0.6) / 0.0 (±0.0)      |
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
