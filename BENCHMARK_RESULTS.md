# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (/apps/benchmarks/).
- **Production Mode**: Using the optimized build output (/dist/production/apps/benchmarks/).

The following table shows the execution time in milliseconds (ms) for each test, broken down by browser.

| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
| **Clear rows**               |            |               |                |             |
|                           | chromium   | 28.90         | 28.60          | +1.04%      |
|                           | firefox    | 6.00          | 31.00          | -416.67%    |
|                           | webkit     | 29.00         | 28.00          | +3.45%      |
|                           | **Average**| **21.30**        | **29.20**         | **-37.09%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 103.40        | 101.30         | +2.03%      |
|                           | firefox    | 91.00         | 96.00          | -5.49%      |
|                           | webkit     | 86.00         | 87.00          | -1.16%      |
|                           | **Average**| **93.47**        | **94.77**         | **-1.39%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1k rows**               |            |               |                |             |
|                           | chromium   | 14.20         | 14.40          | -1.41%      |
|                           | firefox    | 44.00         | 43.00          | +2.27%      |
|                           | webkit     | 41.00         | 40.00          | +2.44%      |
|                           | **Average**| **33.07**        | **32.47**         | **+1.81%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 32.20         | 28.80          | +10.56%     |
|                           | firefox    | 12.00         | 33.00          | -175.00%    |
|                           | webkit     | 30.00         | 29.00          | +3.33%      |
|                           | **Average**| **24.73**        | **30.27**         | **-22.37%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 29.20         | 30.40          | -4.11%      |
|                           | firefox    | 35.00         | 12.00          | +65.71%     |
|                           | webkit     | 8.00          | 31.00          | -287.50%    |
|                           | **Average**| **24.07**        | **24.47**         | **-1.66%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 111.20        | 115.50         | -3.87%      |
|                           | firefox    | 117.00        | 116.00         | +0.85%      |
|                           | webkit     | 114.00        | 114.00         | -0.00%      |
|                           | **Average**| **114.07**        | **115.17**         | **-0.96%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 108.00        | 108.00         | 0.00%       |
|                           | firefox    | 113.00        | 12.00          | +89.38%     |
|                           | webkit     | 111.00        | 112.00         | -0.90%      |
|                           | **Average**| **110.67**        | **77.33**         | **+30.12%**    |
|---------------------------|------------|---------------|----------------|-------------|

---

*This file is auto-generated. Do not edit manually.*
