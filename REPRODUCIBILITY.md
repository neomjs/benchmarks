# Reproducing the Benchmarks

This guide provides the steps required to clone the repository, install dependencies, and run the benchmark tests on your own machine.

## 1. Prerequisites

-   **Node.js**: Version 20.x or later is recommended.
-   **Git**: Required to clone the repository.
-   **Operating System**: The tests are designed to be run on macOS, Linux, or Windows.

## 2. Installation

First, clone the repository to your local machine:

```bash
git clone https://github.com/neomjs/benchmarks.git
cd benchmarks
```

Next, run the setup script to install all nested dependencies and build the Neo.mjs applications:

```bash
npm run setup
```

## 3. Running the Benchmarks

The benchmarks should be executed using the npm scripts defined in `package.json`.

By default, each benchmark suite is run 5 times to gather multiple samples. You can override this by passing a `--runs` flag after the npm command.

### Examples

**Run the full benchmark suite for all frameworks (5 runs each):**
```bash
npm run benchmark:accurate:all
```

> **Note:** Running `benchmark:accurate:all` can take multiple hours to complete. For local development and testing, it is recommended to use more targeted benchmark scripts (e.g., `npm run benchmark:accurate:neo`).

**Run all benchmark suites for Neo.mjs:**
```bash
npm run benchmark:accurate:neo
```

**Run only the "scrolling" suite for Angular for a single run:**
```bash
npm run benchmark:accurate:angular-scrolling -- --runs=1
```

**Run the "big-data" tests for React (defaults to 5 runs):**
```bash
npm run benchmark:accurate:react-big-data
```

## 4. Viewing the Reports

After the test runs are complete, the raw JSON results are stored in the `test-results-data` directory.

To generate human-readable markdown reports, use the corresponding npm scripts.

### Examples

**Generate a combined report for all benchmark results:**
```bash
npm run benchmark:generate-report:combined
```

**Generate the report for only the Neo.mjs interactive benchmarks:**
```bash
npm run benchmark:generate-report:neo
```

**Generate the report for the React big data benchmarks:**
```bash
npm run benchmark:generate-report:react-big-data
```

The generated reports will be saved as markdown files in the project's root directory (e.g., `BENCHMARK_RESULTS_NEO.md`, `COMBINED_BENCHMARK_REPORT.md`).
