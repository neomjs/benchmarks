# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (\`/apps/benchmarks/\`).
- **Production Mode**: Using the optimized build output (\`/dist/production/apps/benchmarks/\`).

The following table shows the average execution time in milliseconds (ms) for each test across Chromium, Firefox, and WebKit. The performance improvement is calculated based on the reduction in time from Development to Production mode.

| Benchmark                 | Dev Mode (Avg ms) | Prod Mode (Avg ms) | Improvement |
|---------------------------|-------------------|--------------------|-------------|
| Clear rows                | 91.77             | 95.33              | **-3.89%** |
| Create 10k rows           | 1649.50           | 1284.10            | **+22.15%** |
| Create 1k rows            | 1160.80           | 1202.93            | **-3.63%** |
| Remove row                | 74.77             | 94.73              | **-26.71%** |
| Select row                | 128.00            | 101.07             | **+21.04%** |
| Swap rows                 | 166.80            | 169.47             | **-1.60%** |
| Update every 10th row     | 176.93            | 174.07             | **+1.62%** |

---

*This file is auto-generated. Do not edit manually.*
