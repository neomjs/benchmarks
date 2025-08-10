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
|                           | chromium   | 3.28 (±0.10)  | 3.28 (±0.10)   | 0.00%       |
|                           | firefox    | 3.40 (±0.49)  | 3.20 (±0.40)   | +5.88%      |
|                           | webkit     | 3.40 (±0.49)  | 3.60 (±0.49)   | -5.88%      |
|                           | **Average**| **3.36**        | **3.36**         | **0.00%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 396.90 (±20.66) | 406.52 (±32.49) | -2.42%      |
|                           | firefox    | 977.00 (±9.08) | 981.40 (±12.75) | -0.45%      |
|                           | webkit     | 389.80 (±8.80) | 393.60 (±10.40) | -0.97%      |
|                           | **Average**| **587.90**        | **593.84**         | **-1.01%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 66.80 (±0.62) | 66.90 (±0.24)  | -0.15%      |
|                           | firefox    | 126.80 (±0.75) | 126.20 (±0.98) | +0.47%      |
|                           | webkit     | 59.20 (±1.17) | 59.80 (±1.17)  | -1.01%      |
|                           | **Average**| **84.27**        | **84.30**         | **-0.04%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 3850.40 (±179.53) | 3612.60 (±202.94) | +6.18%      |
|                           | webkit     | 4418.00 (±110.31) | 4468.00 (±108.46) | -1.13%      |
|                           | **Average**| **4134.20**        | **4040.30**         | **+2.27%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 57.66 (±4.97) | 48.10 (±6.43)  | +16.58%     |
|                           | firefox    | 63.80 (±1.72) | 64.00 (±1.26)  | -0.31%      |
|                           | webkit     | 45.20 (±0.40) | 45.80 (±1.33)  | -1.33%      |
|                           | **Average**| **55.55**        | **52.63**         | **+5.26%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 9.64 (±0.36)  | 9.78 (±0.33)   | -1.45%      |
|                           | firefox    | 6.00 (±0.63)  | 5.60 (±0.80)   | +6.67%      |
|                           | webkit     | 4.80 (±0.40)  | 5.00 (±0.00)   | -4.17%      |
|                           | **Average**| **6.81**        | **6.79**         | **+0.29%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 46.30 (±4.79) | 52.76 (±6.74)  | -13.95%     |
|                           | firefox    | 62.60 (±1.62) | 63.20 (±1.60)  | -0.96%      |
|                           | webkit     | 44.60 (±0.49) | 45.00 (±0.89)  | -0.90%      |
|                           | **Average**| **51.17**        | **53.65**         | **-4.86%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 53.86 (±3.77) | 52.44 (±6.01)  | +2.64%      |
|                           | firefox    | 62.80 (±0.75) | 62.40 (±1.20)  | +0.64%      |
|                           | webkit     | 44.40 (±0.49) | 45.00 (±0.89)  | -1.35%      |
|                           | **Average**| **53.69**        | **53.28**         | **+0.76%**    |
|---------------------------|------------|---------------|----------------|-------------|


## UI Responsiveness Benchmarks

This table shows the average Frames Per Second (FPS) and the count of "Long Frames" (frames taking >50ms) during a 4-second test. For FPS, higher is better. For Long Frames, lower is better.

| Benchmark                                   | Browser    | Dev Mode (FPS / Long Frames) | Prod Mode (FPS / Long Frames) |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Main Thread)**                            |            |                              |                               |
|                                             | chromium   | 31.6 (±0.5) / 1.0 (±0.0)     | 32.0 (±0.0) / 1.0 (±0.0)      |
|                                             | firefox    | 0.0 (±0.0) / 1.0 (±0.0)      | 0.0 (±0.0) / 1.0 (±0.0)       |
|                                             | webkit     | 31.8 (±0.4) / 1.0 (±0.0)     | 31.6 (±0.5) / 1.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Heavy Calculation (Task Worker)**                            |            |                              |                               |
|                                             | chromium   | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | firefox    | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|                                             | webkit     | 60.0 (±0.0) / 0.0 (±0.0)     | 60.0 (±0.0) / 0.0 (±0.0)      |
|---------------------------------------------|------------|------------------------------|-------------------------------|
| **Real-time Feed**                            |            |                              |                               |
|                                             | chromium   | 50.0 (±0.6) / 2.0 (±1.1)     | 50.0 (±0.6) / 1.2 (±1.2)      |
|                                             | firefox    | 10.0 (±0.0) / 40.6 (±0.8)    | 9.8 (±0.4) / 39.8 (±1.3)      |
|                                             | webkit     | 30.2 (±0.7) / 4.6 (±0.5)     | 30.2 (±0.4) / 4.6 (±0.5)      |
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
