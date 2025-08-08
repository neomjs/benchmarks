# Benchmark Performance Results

This report compares the performance of the interactive benchmark application running in two different modes:
- **Development Mode**: Served directly by the webpack dev server (\`/apps/benchmarks/\`).
- **Production Mode**: Using the optimized build output (\`/dist/production/apps/benchmarks/\`).

The following table shows the average execution time in milliseconds (ms) for each test across Chromium, Firefox, and WebKit. The performance improvement is calculated based on the reduction in time from Development to Production mode.

| Benchmark                 | Dev Mode (Avg ms) | Prod Mode (Avg ms) | Improvement |
|---------------------------|-------------------|--------------------|-------------|
| Clear rows                | 30.27             | 24.90              | **+17.73%** |
| Create 10k rows           | 267.77            | 76.43              | **+71.46%** |
| Create 1k rows            | 67.47             | 76.27              | **-13.04%** |
| Remove row                | 17.23             | 18.87              | **-9.48%** |
| Select row                | 22.87             | 16.97              | **+25.80%** |
| Swap rows                 | 93.23             | 85.67              | **+8.12%** |
| Update every 10th row     | 49.90             | 16.97              | **+66.00%** |

---

*This file is auto-generated. Do not edit manually.*
