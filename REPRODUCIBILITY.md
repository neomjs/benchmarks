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

Next, you need to install the dependencies for the main project and for each of the benchmark applications.

```bash
# Install root dependencies (Playwright, reporting tools, etc.)
npm install

# Install dependencies for the Neo.mjs interactive app
cd apps/interactive-benchmark-neo
npm install
cd ../..

# Install dependencies for the React interactive app
cd apps/interactive-benchmark-react
npm install
cd ../..

# Install dependencies for the Angular interactive app
cd apps/interactive-benchmark-angular
npm install
cd ../..

# Install dependencies for the Neo.mjs big data app
cd apps/bigData/neo
npm install
cd ../..

# Install dependencies for the React big data app
cd apps/bigData/react
npm install
cd ../..
```

## 3. Running the Benchmarks

The benchmarks should be executed using the npm scripts defined in `package.json`.

By default, each benchmark suite is run 5 times to gather multiple samples. You can override this by passing a `--runs` flag after the npm command.

### Examples

**Run the full benchmark suite for all frameworks (5 runs each):**
```bash
npm run benchmark:accurate:all
```

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
