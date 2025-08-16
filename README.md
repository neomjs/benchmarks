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

The summarized, version-controlled benchmark data is automatically generated in the root directory (e.g., `BENCHMARK_RESULTS_NEO.md`) when you run the report generation scripts. See the reproducibility guide for more details.
