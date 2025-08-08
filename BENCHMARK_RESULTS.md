# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (\`/apps/benchmarks/\`).
- **Production Mode**: Using the optimized build output (\`/dist/production/apps/benchmarks/\`).

The following table shows the average execution time in milliseconds (ms) for each test across Chromium, Firefox, and WebKit. The performance improvement is calculated based on the reduction in time from Development to Production mode.

| Benchmark                 | Dev Mode (Avg ms) | Prod Mode (Avg ms) | Improvement |
|---------------------------|-------------------|--------------------|-------------|
| Clear rows                | 21.57             | 30.27              | **-40.34%** |
| Create 10k rows           | 99.73             | 93.73              | **+6.02%** |
| Create 1k rows            | 46.17             | 37.80              | **+18.12%** |
| Remove row                | 32.40             | 22.47              | **+30.66%** |
| Select row                | 31.97             | 30.70              | **+3.96%** |
| Swap rows                 | 114.43            | 113.90             | **+0.47%** |
| Update every 10th row     | 78.23             | 110.97             | **-41.84%** |

---

*This file is auto-generated. Do not edit manually.*
