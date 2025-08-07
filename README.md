# A Modern Benchmark Suite for Frontend Frameworks & Libraries

This repository hosts a modern performance benchmark suite designed to test the limits of front-end JavaScript frameworks. The showcases focus on scenarios involving high-frequency updates, heavy background computations, and sustained UI interactivity under load—areas critical for complex, data-intensive applications.

## Philosophy and Goals

Our goal is to create a fair, transparent, and community-driven environment for comparing different architectural approaches to front-end development. We aim to explore questions like:

- How do different frameworks maintain UI fluidity (e.g., 60 FPS) while processing thousands of real-time updates?
- What are the performance trade-offs between main-thread, worker-based, and server-side rendering architectures in complex, interactive applications?

We are committed to using established best practices for each framework to ensure the comparisons are meaningful and accurate.

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

### Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run Tests:**
    ```bash
    npx playwright test
    ```

### Results

The raw output from Playwright (videos, traces) is generated in the `test-results/` and `playwright-report/` directories, which are ignored by Git.

The summarized, version-controlled benchmark data is stored in the `/reports` directory.
