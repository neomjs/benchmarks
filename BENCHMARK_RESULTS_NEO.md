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
|                           | chromium   | 31.84 (±19.08) | 37.28 (±18.08) | -17.09%     |
|                           | firefox    | 55.20 (±0.98) | 55.60 (±0.80)  | -0.72%      |
|                           | webkit     | 59.00 (±8.20) | 58.40 (±8.11)  | +1.02%      |
|                           | **Average**| **48.68**        | **50.43**         | **-3.59%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 100k rows**               |            |               |                |             |
|                           | chromium   | 40.24 (±6.42) | 34.44 (±5.31)  | +14.41%     |
|                           | firefox    | 39.40 (±4.59) | 41.40 (±3.56)  | -5.08%      |
|                           | webkit     | 51.00 (±11.51) | 66.40 (±4.72)  | -30.20%     |
|                           | **Average**| **43.55**        | **47.41**         | **-8.88%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 40.22 (±1.02) | 21.80 (±3.63)  | +45.80%     |
|                           | firefox    | 26.80 (±6.24) | 27.60 (±4.32)  | -2.99%      |
|                           | webkit     | 34.60 (±5.24) | 28.60 (±4.84)  | +17.34%     |
|                           | **Average**| **33.87**        | **26.00**         | **+23.24%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1M rows**               |            |               |                |             |
|                           | chromium   | 147.30 (±7.74) | 139.44 (±6.63) | +5.34%      |
|                           | firefox    | 205.80 (±5.71) | 215.00 (±9.32) | -4.47%      |
|                           | webkit     | 892.00 (±1436.05) | 178.20 (±9.09) | +80.02%     |
|                           | **Average**| **415.03**        | **177.55**         | **+57.22%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 47.88 (±8.88) | 48.70 (±10.37) | -1.71%      |
|                           | firefox    | 55.40 (±1.02) | 54.60 (±1.96)  | +1.44%      |
|                           | webkit     | 60.80 (±7.41) | 57.40 (±8.50)  | +5.59%      |
|                           | **Average**| **54.69**        | **53.57**         | **+2.06%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 34.34 (±10.23) | 36.20 (±3.57)  | -5.42%      |
|                           | firefox    | 41.00 (±7.97) | 39.00 (±0.89)  | +4.88%      |
|                           | webkit     | 63.20 (±0.98) | 67.80 (±6.62)  | -7.28%      |
|                           | **Average**| **46.18**        | **47.67**         | **-3.22%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 32.64 (±5.42) | 51.84 (±10.28) | -58.82%     |
|                           | firefox    | 37.20 (±18.74) | 41.20 (±6.97)  | -10.75%     |
|                           | webkit     | 62.20 (±7.68) | 63.00 (±8.60)  | -1.29%      |
|                           | **Average**| **44.01**        | **52.01**         | **-18.18%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 49.62 (±3.59) | 51.78 (±4.45)  | -4.35%      |
|                           | firefox    | 55.40 (±0.49) | 56.00 (±0.63)  | -1.08%      |
|                           | webkit     | 31.40 (±27.04) | 62.60 (±1.85)  | -99.36%     |
|                           | **Average**| **45.47**        | **56.79**         | **-24.89%**    |
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
