# Epic: Neo.mjs Performance Showcases

**Goal:** To identify, build, and promote compelling showcases that demonstrate scenarios where Neo.mjs is an order of
magnitude (500%+) faster or more capable than mainstream frameworks like React, Angular, or Vue.

These showcases should highlight the architectural advantages of Neo.mjs, specifically:
- Off-main-thread application logic, data processing, and VDOM rendering.
- The ability to handle high-frequency updates and massive synchronous computations without UI freezes.
- GPU-accelerated rendering and scrolling for exceptionally fluid user experiences.
- Instantaneous app loads via aggressive Service Worker caching.

The ultimate objective is to create undeniable, data-backed proof of Neo.mjs's superior performance and architecture for
complex, data-intensive front-end applications.

---

## Sub-Epics & Tasks

### 1. Showcase: The "Interactive Benchmark" (Massive Data Handling)

This showcase directly challenges the limitations of main-thread frameworks by demonstrating the ability to synchronously
ingest and manage massive datasets (1,000,000+ records) in milliseconds, a task that is impossible for traditional
architectures without crashing the browser or requiring complex, manual chunking logic.

**Strategic Note:** The v10.5.0 release of the Neo.mjs data package, with its **lazy record instantiation**, is the core
of this showcase. The goal is to prove that Neo.mjs's architecture is fundamentally superior for large-scale data
applications. We will demonstrate that the framework can synchronously ingest and render millions of records with a
perfectly fluid UI, a scenario where main-thread-bound frameworks inevitably fail.

**Technical Strategy & Implementation Notes:**

- **Exploit Lazy Record Instantiation:** The benchmark now measures the time to synchronously load the *entire* dataset
  (e.g., 1,000,000 rows) into the `Neo.data.Store`. This is the key differentiator.
- **GPU-Accelerated Scrolling:** The grid now uses `transform: translate3d` for vertical scrolling, which offloads the
  work to the GPU. This results in exceptionally smooth scrolling, even with massive datasets.
- **Fairness Doctrine:** All competitor implementations (React, Angular) **must** use an equivalent best-in-class
  virtualization library (e.g., TanStack Virtual, AG-Grid). This focuses the benchmark on architectural differences
  under load.

- [x] Task: **Phase 1 (Baseline):**
    - [x] Sub-task: Create a UI with a large table and standard benchmark buttons.
    - [x] Sub-task: Implement the logic for these basic operations.
- [x] Task: **Phase 2 (The Neo.mjs Advantage):**
    - [x] Sub-task: Add a `Start/Stop Real-time Feed` button.
    - [x] Sub-task: Add a `Run Heavy Calculation` button.
    - [x] Sub-task: Add visual indicators for main-thread responsiveness.
- [x] Task: **Phase 3 (Benchmarking & Promotion):**
    - [x] Sub-task: Build comparable versions in Angular and React.
    - [x] Sub-task: Conduct rigorous performance testing and capture metrics.
    - [x] Sub-task: Generate `BENCHMARK_RESULTS.md` files for each framework.
    - [x] Sub-task: Generate a combined report comparing all frameworks.
    - [ ] Sub-task: Create a compelling presentation (e.g., video, article) to showcase the results.
    - [ ] Sub-task: Publish the source code for all implementations for transparency.

---

## 2. Scrolling Latency Benchmark

### 2.1. The Problem with the previous Scrolling Benchmark

The previous scrolling performance test (`tests/neo-scrolling.spec.mjs`) was fundamentally flawed and produced
misleading, if not entirely worthless, results. Its core assumption of programmatically scrolling an entire
multi-thousand-row grid in 4 seconds is disconnected from any realistic user interaction.

**Key Flaws:**

1.  **Unrealistic Scroll Simulation:** No human user scrolls through thousands of rows of data in a few seconds. The
    previous test simulated a "firehose" scroll that pushes any buffered rendering mechanism beyond its breaking point.
2.  **Invalid State Measurement:** Because the scroll is continuous and excessively fast, buffered grids (which includes
    virtually all high-performance grids) are never allowed to reach a stable, rendered state. The test therefore
    measured the performance of a system in a perpetual state of catch-up, which is not a meaningful metric. We were
    measuring how fast we can scroll through stale or non-existent content.
3.  **Misleading Metrics:** Metrics like FPS and `rowLag` derived from this flawed test are not representative of the true
    user experience. A high FPS is meaningless if the content being scrolled is incorrect or blank. The `rowLag` metric
    became absurdly large, not because the framework is slow, but because the test is unreasonable.

The goal is not to see if we can break the rendering engine with an impossible task. The goal is to measure the
**perceived fluidity and responsiveness** during realistic user interactions.

### 2.2. A New, Meaningful Test Strategy: Measuring "Time to Valid State"

We must shift from measuring a continuous, unrealistic scroll to measuring the latency of discrete, user-initiated
scroll actions. This directly correlates to what a user actually perceives as "lag".

The core principle is: **When I scroll, how long does it take for the grid to show me the correct data for my new
viewport?**

#### Proposed Test Scenario

This scenario will be executed for each framework (Neo.mjs, Angular, React) under various conditions (e.g., 10k, 100k,
1M rows) and with the "Real-time Feed" active to simulate background stress.

1.  **Setup:**
    *   Load the application and create the target dataset (e.g., 100k rows).
    *   Wait for the grid to be in a fully ready and stable state.
    *   Start the "Real-time Feed" to introduce main-thread (for React/Angular) or worker-thread (for Neo.mjs)
        pressure.

2.  **Test Execution Loop (e.g., 20 iterations):**
    *   **A. Initial State:** Record the `id` or unique content of the first visible row (e.g., `Row 0`).
    *   **B. The Action (Simulate User Scroll):**
        *   Instantly change the `scrollTop` of the grid's scrollable element by a fixed amount. This amount should be
            equivalent to a realistic user action.
        *   **Example Actions:**
            *   **Mouse Wheel:** `50 rows * rowHeight`
            *   **Page Down:** `clientHeight` of the scrollable area.
    *   **C. The Measurement (Time to Valid State):**
        *   Start a high-resolution timer (`performance.now()`).
        *   Use a `waitForFunction` or `MutationObserver` to wait for the grid to reach a "valid state".
        *   **Definition of "Valid State":**
            1.  The first DOM element within the grid body has a `aria-rowindex` that matches the expected row index
                based on the new `scrollTop`.
            2.  The content of that rendered row is correct. This is critical to ensure we are not just painting a
                recycled row with stale data. We must verify the cell content matches the expected data for that row
                index.
        *   Stop the timer. The elapsed time is the `timeToValidState` for this iteration.
    *   **D. The Interference Check (Concurrent Update Verification):**
        *   While waiting for the valid state (Step C), we must also verify that the real-time feed is still updating
            cells that *remain visible* or have just become visible.
        *   This can be done by observing a specific cell's value and ensuring it changes as dictated by the feed. This
            measures whether the scroll-rendering logic blocks other UI updates.

3.  **Data Collection & Reporting:**
    *   For each test run, we will collect an array of `timeToValidState` values.
    *   The final report will present the following metrics:
        *   **`minTimeToValidState`**: The best-case performance.
        *   **`avgTimeToValidState`**: The average user-perceived lag. This is the most important headline number.
        *   **`maxTimeToValidState`**: The worst-case lag, indicating jank.
        *   **`stdDevTimeToValidState`**: The consistency of the performance.
        *   **`updateSuccessRate`**: The percentage of iterations where the real-time feed updates were successfully
            rendered during the scroll action. A value less than 100% indicates that scrolling blocks other rendering
            work.

This revised methodology will produce scientifically sound, defensible, and meaningful results that directly reflect
the user experience of scrolling under pressure. It will provide a true measure of architectural superiority, moving
beyond the flawed metrics of the current implementation.


### 2.3. Implementation Plan

- [x] Task: Create a new test file: `tests/scrolling-latency.spec.mjs`.
- [x] Task: Implement the core test logic as described above.
- [x] Task: Create framework-specific helper functions to abstract away the DOM queries needed to get the scrollable
  element, row index, and cell content for Neo.mjs, Angular, and React.
- [x] Task: Integrate the new test into the main benchmark runner (`scripts/run-benchmarks.mjs`).
- [x] Task: Update the reporting scripts (`scripts/generate-report.mjs`, `scripts/generate-combined-report.mjs`) to
  process and display the new `timeToValidState` metrics.
- [x] Task: Deprecate and remove the old `*-scrolling.spec.mjs` test files.
- [x] Task: Update `EPIC-Performance-Showcases.md` to reflect this new, more accurate strategy.

---

### 3. Showcase: Extreme Data Scalability & Correctness

This showcase pushes the boundaries of in-browser data handling and verifies the integrity of the results.

**Strategic Note:** Now that 1 million rows is easily handled, we can create even more dramatic headline numbers.
Furthermore, we must validate that competitor implementations are not "cheating" by failing to render the full dataset.

- **[ ] Task:** Add new benchmark tests for creating 2 million and 5 million rows.
- **[ ] Task:** Add a "correctness" check to all "Create X rows" tests. After creation, the test must scroll to the
  very last row and verify that it has been rendered and is accessible in the DOM.
- [x] Task: Document any failures, such as the TanStack table's inability to render the full 1 million rows, as a key
  competitive differentiator. **Update:** The React/TanStack implementation has been confirmed to not just freeze, but
  to cause a hard browser tab crash (`Aww, Snap! Error code: 5`) when attempting to handle 1 million rows. This is a
  critical failure point and a powerful testament to the stability of Neo.mjs's worker-based architecture under extreme
  load. This will be a central point in our promotional materials.

---

### 4. Cross-Cutting: The Benchmark Harness

This sub-epic covers the creation of a credible, transparent, and easy-to-use benchmarking tool.

**Technical Strategy & Implementation Notes:**
- The harness is built using **Playwright** for browser automation, video recording, and performance tracing.
- Performance metrics are captured using the in-browser `performance.mark()` and `performance.measure()` APIs.
- A master Node.js script (`scripts/run-benchmarks.mjs`) orchestrates the test execution.
    - It runs tests serially (`--workers=1`) to prevent resource contention and ensure accurate results.
    - It can run tests for specific frameworks (`--framework=neo`) and specific suites (`--suite=scrolling`).
- Test results (raw JSON) are saved to a clean, nested directory structure: `test-results-data/<framework>/<suite>/`.
  This directory is git-ignored.
- A separate set of scripts (`scripts/generate-report.mjs`, `scripts/generate-combined-report.mjs`) is used to
  aggregate the raw data from the directories and generate the final markdown reports. This decouples test execution
  from report generation, allowing for faster, incremental updates to the benchmark data.

- [x] Task: Set up the Playwright project.
- [x] Task: Instrument the showcase apps with performance markers.
- [x] Task: Develop Playwright scripts to run scenarios and extract data.
- [x] Task: Create a script to auto-generate a markdown report for a single framework.
- [x] Task: Create a script (`generate-combined-report.mjs`) to generate a report comparing all frameworks.
- [x] Task: Create a `README.md` with clear instructions for reproducibility.
- [x] Task: Refactor the harness to use a clean, nested data directory structure.
- [x] Task: Decouple test execution from report generation for a more flexible workflow.

---

### 5. Cross-Cutting: Statistical Accuracy and Stability

To ensure our benchmark results are reliable, we run the test suite multiple times and aggregate the results.

- [x] Task: Create a master script that can execute the Playwright test suite a specified number of times
  (`npm run benchmark:accurate -- --runs=5`).
- [x] Task: For each run, save the `test-results.json` output to a uniquely named file.
- [x] Task: Modify the report generation scripts to read and aggregate data from all generated JSON files.
- [x] Task: Update the final report to include the average and standard deviation.

---

### 6. Cross-Cutting: High-Precision Benchmark Measurement

To ensure our benchmark results are scientifically accurate, we eliminate the "observer effect" of the test harness
itself by performing measurements atomically inside the browser.

- [x] Task: Refactor all performance-critical tests to use a robust, in-browser `MutationObserver` pattern,
  eliminating test runner latency from the results.
- [x] Task: Validate that the new pattern is stable and accurate.

---

### 7. Cross-Cutting: Refactor Benchmark Test Logic

To improve maintainability, the core measurement logic has been extracted into a reusable helper function.

- [x] Task: Create a `measurePerformance` helper function encapsulating the `Promise` and `MutationObserver` logic.
- [x] Task: Refactor all test cases to use the new `measurePerformance` helper.

---

### 8. Investigation: The JS Framework Benchmark (krausest)

While not designed to highlight Neo.mjs's core strengths, this popular benchmark is a critical credibility marker.

- **[ ] Task:** Clone the `js-framework-benchmark` repository.
- **[ ] Task:** Develop a baseline Neo.mjs implementation.
- **[ ] Task:** Run the benchmark and collect initial performance data.
- **[ ] Task:** Profile and optimize the implementation.

---

### 9. Future Showcase Ideas

- **Real-Time IoT Fleet Monitoring:** A visually impressive demo rendering a large number of moving objects on a map.
- **Massive Client-Side Data Pivot Grid:** An analytics demo processing large datasets entirely in the browser.
- **High-Performance Offscreen Charting (WebGL):** A demo rendering over 1 million data points in a Canvas Worker.
- **Conway's Game of Life:** A classic CPU-bound simulation running in the App Worker with a perfectly fluid UI.
- **Instant Subsequent Loads (Service Worker):** A showcase demonstrating near-native load times for returning users.

---

### 10. Cross-Cutting: High-Fidelity Scroll Measurement

**Goal:** To evolve beyond simple FPS counters and measure the true perceived user experience of scrolling by detecting
"content lag"—the delay between the scrollbar's position and the rendered content.

**The Problem:** A high FPS score only proves that the main thread is not blocked. It does not prove that the content
being displayed is correct. In a worker-based architecture, it's possible for the main thread to be painting frames at
60 FPS while the worker is too busy to send updated VDOM, resulting in a fluid scroll of stale content. This test will
measure and quantify that specific type of visual jank.

**The Solution: Visual Row Position Verification**
- In each animation frame during a programmatic scroll, we will calculate the row that *should* be at the top of the
  viewport based on the `scrollTop` position.
- In the same frame, we will query the DOM to find the row that is *actually* rendered at the top.
- The difference between the "expected" and "actual" row index is the "content lag."

**New Metrics:**
- **`averageRowLag`:** The average number of rows the rendered content was behind the scrollbar position.
- **`maxRowLag`:** The worst-case content lag observed during the scroll.
- **`staleFrameCount`:** The total number of frames rendered with out-of-sync content.

- **[ ] Task:** Create a new `measureAdvancedScrollingFluidity` helper function that implements this logic.
- **[ ] Task:** Refactor the "Scrolling Performance Under Duress" tests to use this new, more accurate helper.
- **[ ] Task:** Update the reporting scripts to include these new, more meaningful metrics in a dedicated table.
