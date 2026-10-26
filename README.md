# A Modern Benchmark Suite for Frontend Frameworks & Libraries

This repository hosts a modern performance benchmark suite designed to test the limits of front-end JavaScript frameworks. The showcases focus on scenarios involving high-frequency updates, heavy background computations, and sustained UI interactivity under load—areas critical for complex, data-intensive applications.

## Philosophy and Goals

Our goal is to create a fair, transparent, and community-driven environment for comparing different architectural approaches to front-end development. We aim to explore questions like:

- How do different frameworks maintain UI fluidity (e.g., 60 FPS) while processing thousands of real-time updates?
- What are the performance trade-offs between main-thread and worker-based architectures in complex, interactive applications?

We are committed to using established best practices for each framework to ensure the comparisons are meaningful and accurate.

## Documentation

-   **[Benchmark Methodology](./METHODOLOGY.md)**: Explains the "why" behind our benchmark design, including our "Time to Valid State" and "High-Fidelity Scroll Measurement" concepts.
-   **[Reproducing the Benchmarks](./REPRODUCIBILITY.md)**: Provides clear, step-by-step instructions on how to clone the repo, install dependencies, and run the benchmarks yourself.

## Call for Contributions

This is a community project. We welcome and encourage contributions, especially for implementing the benchmark scenarios in frameworks like **React, Solid, Svelte, Vue, and others**. If you are an expert in a particular framework, your help in building a high-quality, optimized implementation is invaluable.

Please see the [.github/EPIC-Performance-Showcases.md](.github/EPIC-Performance-Showcases.md) file for the technical specifications of the benchmark scenarios.

## Benchmark Harness

The harness is built with [Playwright](https://playwright.dev/) and is responsible for:
- Launching the showcase applications in a consistent environment.
- Automating user interactions to trigger specific performance tests.
- Recording videos and performance traces for analysis.
- Extracting key performance metrics using the browser's `performance` API.
- Generating structured reports with the benchmark results.

## Getting Started

For detailed instructions on how to set up the project and run the benchmarks, please see the **[Reproducing the Benchmarks](./REPRODUCIBILITY.md)** guide.

## Results

The raw output from Playwright (videos, traces) is generated in the `test-results/` and `playwright-report/` directories.

The summarized, version-controlled benchmark reports are generated in the root directory when you run the report generation scripts:
- **[Combined Big Data Showdown (`COMBINED_BIG_DATA_REPORT.md`)](./COMBINED_BIG_DATA_REPORT.md)**: Head-to-head comparison of `neo.mjs 13.3.1` (npm) + the app-level `MainStore.mjs` / `GridContainer.mjs` sync and `src/collection/Base.mjs` + `src/grid/Container.mjs` from [`neomjs/neo#20116`](https://github.com/neomjs/neo/pull/20116) (`c3fb7a56e4`) patched into `apps/bigData/neo/node_modules/neo.mjs/src/` before `npm --prefix apps/bigData/neo run build` vs. `React 19.1.1 + AG Grid Community 36.2.0` (`animateRows={false}`, `vite preview`).
- **[Neo.mjs Big Data Results (`BENCHMARK_RESULTS_NEO_BIG_DATA.md`)](./BENCHMARK_RESULTS_NEO_BIG_DATA.md)**
- **[React + AG Grid Big Data Results (`BENCHMARK_RESULTS_REACT_BIG_DATA.md`)](./BENCHMARK_RESULTS_REACT_BIG_DATA.md)**
- **[Scrolling Suite Results (`BENCHMARK_RESULTS_NEO.md` / `BENCHMARK_RESULTS_REACT.md` / `BENCHMARK_RESULTS_SOLID.md`)](./BENCHMARK_RESULTS_NEO.md)**

### Latest Big Data Highlights (Chromium Production, 5-Run Average, Apple M5 Max)

| Scenario | Neo.mjs | React + AG Grid | Neo.mjs Advantage / Notes |
|:---|---:|---:|:---|
| **Change Columns 50 → 200 (100k rows, UI Update)** | **150.26 ms** | 1082.58 ms | **7.2x faster** (`0.00 ms` Long-Task block vs. `328.80 ms`) |
| **Change Rows 1,000 → 100,000 (UI Update)** | **109.30 ms** | 327.04 ms | **3.0x faster** (`0.00 ms` Long-Task block vs. `59.60 ms`) |
| **Change Columns 50 → 75 (1k rows, UI Update)** | **22.26 ms** | 25.26 ms | **1.1x faster** (`16.70 ms` Max RAF vs. `24.09 ms`) |
| **Change Rows 1,000 → 5,000 (UI Update)** | **18.54 ms** | 26.28 ms | **1.4x faster** (`16.70 ms` Max RAF vs. `20.74 ms`) |
| **filter-grid (first)** | **16.30 ms** | 29.40 ms | **1.8x faster** (`14.76 ms` Max RAF vs. `23.71 ms`) |
| **scroll-vertical-100k (8 render-gated hops)** | 281.50 ms | 127.82 ms | 2.2× slower — AG Grid reaches target 2.2× sooner (`0.00 ms` Long-Task block, `16.74 ms` Max RAF on both; includes [`neomjs/neo#20124`](https://github.com/neomjs/neo/issues/20124) latency, fix in [`#20125`](https://github.com/neomjs/neo/pull/20125)) |
| **scroll-horizontal-200-cols (8 render-gated hops)** | 233.48 ms | 134.62 ms | 1.7× slower — AG Grid reaches target 1.7× sooner (`0.00 ms` Long-Task block, `16.72 ms` Max RAF on both; includes [`neomjs/neo#20124`](https://github.com/neomjs/neo/issues/20124) latency, fix in [`#20125`](https://github.com/neomjs/neo/pull/20125)) |
| **scroll-diagonal-2d (8 render-gated hops)** | 379.16 ms | 133.34 ms | 2.8× slower — AG Grid reaches target 2.8× sooner (`0.00 ms` Long-Task block, `16.76 ms` Max RAF on both; includes [`neomjs/neo#20124`](https://github.com/neomjs/neo/issues/20124) latency, fix in [`#20125`](https://github.com/neomjs/neo/pull/20125)) |

See the [Reproducing the Benchmarks](./REPRODUCIBILITY.md) guide for full instructions on running the suites locally.
