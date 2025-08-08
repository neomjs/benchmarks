# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (\`/apps/benchmarks/\\`).
- **Production Mode**: Using the optimized build output (\`/dist/production/apps/benchmarks/\\`).

The following table shows the execution time in milliseconds (ms) for each test, broken down by browser.

| Benchmark                 | Browser    | Dev Mode (ms) | Prod Mode (ms) | Improvement |
|---------------------------|------------|---------------|----------------|-------------|
| **Clear rows**               |            |               |                |             |
|                           | chromium   | 28.60         | 29.70          | -3.85%      |
|                           | firefox    | 143.00        | 33.00          | +76.92%     |
|                           | webkit     | 28.00         | 28.00          | -0.00%      |
|                           | **Average**| **66.53**        | **30.23**         | **+54.56%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 10k rows**               |            |               |                |             |
|                           | chromium   | 100.00        | 99.50          | +0.50%      |
|                           | firefox    | 91.00         | 94.00          | -3.30%      |
|                           | webkit     | 88.00         | 88.00          | -0.00%      |
|                           | **Average**| **93.00**        | **93.83**         | **-0.90%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Create 1k rows**               |            |               |                |             |
|                           | chromium   | 13.20         | 13.70          | -3.79%      |
|                           | firefox    | 43.00         | 47.00          | -9.30%      |
|                           | webkit     | 40.00         | 39.00          | +2.50%      |
|                           | **Average**| **32.07**        | **33.23**         | **-3.64%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Remove row**               |            |               |                |             |
|                           | chromium   | 28.70         | 28.70          | 0.00%       |
|                           | firefox    | 32.00         | 11.00          | +65.63%     |
|                           | webkit     | 27.00         | 28.00          | -3.70%      |
|                           | **Average**| **29.23**        | **22.57**         | **+22.81%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Select row**               |            |               |                |             |
|                           | chromium   | 29.50         | 29.20          | +1.02%      |
|                           | firefox    | 33.00         | 35.00          | -6.06%      |
|                           | webkit     | 31.00         | 29.00          | +6.45%      |
|                           | **Average**| **31.17**        | **31.07**         | **+0.32%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Swap rows**               |            |               |                |             |
|                           | chromium   | 114.30        | 112.40         | +1.66%      |
|                           | firefox    | 119.00        | 115.00         | +3.36%      |
|                           | webkit     | 115.00        | 114.00         | +0.87%      |
|                           | **Average**| **116.10**        | **113.80**         | **+1.98%**    |
|---------------------------|------------|---------------|----------------|-------------|
| **Update every 10th row**               |            |               |                |             |
|                           | chromium   | 107.90        | 108.90         | -0.93%      |
|                           | firefox    | 113.00        | 114.00         | -0.88%      |
|                           | webkit     | 9.00          | 112.00         | -1144.44%   |
|                           | **Average**| **76.63**        | **111.63**         | **-45.67%**    |
|---------------------------|------------|---------------|----------------|-------------|

---

*This file is auto-generated. Do not edit manually.*
