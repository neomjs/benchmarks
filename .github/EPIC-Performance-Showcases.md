# Epic: Neo.mjs Performance Showcases

**Goal:** To identify, build, and promote compelling showcases that demonstrate scenarios where Neo.mjs is an order of magnitude (500%+) faster than mainstream frameworks like React, Angular, or Vue.

These showcases should highlight the architectural advantages of Neo.mjs, specifically:
- Off-main-thread application logic and VDOM rendering.
- The ability to handle high-frequency updates without UI freezes.
- Efficient multi-window state synchronization using the Shared Worker.
- Instantaneous app loads via aggressive Service Worker caching.

The ultimate objective is to create undeniable, data-backed proof of Neo.mjs's superior performance in computationally demanding front-end applications.

---

## Sub-Epics & Tasks

### 1. Exploration of High-Impact Use Cases

The goal of this sub-epic is to research and define specific application scenarios that can push the boundaries of front-end performance. These scenarios must be complex enough to cause significant performance degradation or freezes in traditional frameworks.

- **[ ] Task:** Brainstorm and document potential use cases.
- **[ ] Task:** Analyze each use case for its potential to showcase Neo.mjs's core strengths.
- **[ ] Task:** Prioritize use cases based on impact, clarity, and implementation effort.
- **[ ] Task:** For the top 1-3 use cases, create a detailed technical specification.

---

### 2. Showcase: The "Interactive Benchmark" (Krause-Inspired)

This showcase directly challenges the limitations of the popular `js-framework-benchmark` by adding layers of complexity that are impossible for main-thread frameworks to handle gracefully. It starts with a similar look and feel for easy comparison, then demonstrates Neo.mjs's ability to maintain a perfectly fluid UI under heavy, continuous load.

**Strategic Note:** The goal here is not merely to show that offloading a single task to a worker prevents UI freezes—any framework can do that. The goal is to prove that Neo.mjs's *entire architecture* is fundamentally superior for complex applications. By running the application logic, data processing, and VDOM generation in workers by default, we will demonstrate that Neo.mjs handles high-frequency updates and heavy background computations simultaneously, keeping the UI perfectly fluid in scenarios where main-thread-bound frameworks inevitably choke on their own rendering lifecycle.

**Technical Strategy & Implementation Notes:**

The `examples/grid/bigData` example will be the foundation. Our strategy is to leverage the grid's advanced, performance-oriented architectural features to create a showcase that is impossible for main-thread bound frameworks to replicate.

- **Exploit Virtual Rendering (Fairness Doctrine):** The `Neo.grid.Body` uses a "buffered" or "virtual" rendering system controlled by `bufferRowRange` and `bufferColumnRange`. This is the baseline. For a fair comparison, all competitor implementations (React, Vue, etc.) **must** use an equivalent best-in-class virtualization library (e.g., TanStack Table with `react-virtual`). This focuses the benchmark on architectural differences under load, not on a naive comparison against non-virtualized lists.

- **Benchmark Scrolling Performance:** With virtualization as the baseline, scrolling performance becomes a primary metric. We will programmatically scroll the grid and measure frame rates (FPS) and jank, especially while the "Real-time Feed" or "Heavy Calculation" is active. This will directly expose main-thread contention in competing frameworks.

- **Use Optimized Bulk Updates:** For the "Real-time Feed" test, we will not update records one-by-one. We will use the `Grid.Container#bulkUpdateRecords()` method. This method is specifically designed to handle parallel updates to multiple records efficiently, likely by batching VDOM changes into a single, optimized update cycle. This is a critical performance feature we must highlight.

- **Leverage Componentized Cells:** The grid's ability to render full `Neo.component.Base` instances inside its cells (as seen with the button in the `bigData` example) is a perfect tool for proving UI fluidity. We will test user interactions (e.g., clicking these inline components) *while* the real-time feed and heavy calculations are running. This will provide a clear, visual demonstration that the main thread remains unblocked and responsive.

- **Dedicated Scroll Management:** The grid's `ScrollManager` offloads the complex logic of synchronizing horizontal and vertical scroll events, including touch support. While we won't be directly testing this, it's an important part of the architecture that contributes to the overall smoothness and robustness we are showcasing.

- [x] Task: **Phase 1 (Baseline):**
    - [x] Sub-task: Create a UI with a large table and standard benchmark buttons (`Create 1k rows`, `Create 10k rows`, `Update every 10th row`, `Select`, `Swap`, `Remove`, `Clear`).
    - [x] Sub-task: Implement the logic for these basic operations to establish a recognizable performance baseline.

- [x] Task: **Phase 2 (The Neo.mjs Advantage):**
    - [x] Sub-task: Add a `Start/Stop Real-time Feed` button that simulates high-frequency WebSocket updates to hundreds of rows per second.
    - [x] Sub-task: Add a `Run Heavy Calculation` button that triggers a multi-second, computationally expensive task in the app worker.
    - [x] Sub-task: Add a continuously running CSS animation (e.g., a spinner) and a text input field to serve as visual indicators of main-thread responsiveness.
    - [x] Sub-task: Investigate and implement moving the "Heavy Calculation" to a dedicated Task Worker to ensure the App Worker remains responsive.

- [ ] Task: **Phase 3 (Benchmarking & Promotion):**
    - [ ] Sub-task: Build comparable versions in mainstream frameworks (e.g., React with TanStack Table and `react-virtual`), ensuring they use best-practice virtualization for a fair comparison.
    - [ ] Sub-task: Conduct rigorous performance testing, capturing videos and metrics (FPS, CPU, blocking time) that clearly show the competitor's UI freezing or stuttering during stress tests while the Neo.mjs version remains fluid.
    - [ ] Sub-task: Implement automated scrolling tests to capture FPS and jank metrics under various load conditions.
    - [x] Sub-task: Generate a `BENCHMARK_RESULTS.md` file to compare dev vs. prod performance.
    - [ ] Sub-task: Create a compelling presentation (e.g., video, article) to showcase the results and explain the architectural reasons for the performance gap.
    - [ ] Sub-task: Publish the source code for both implementations for transparency.

---

### 3. Showcase: Real-Time IoT Fleet Monitoring

A visually impressive demonstration focused on rendering a large number of moving objects on a map while maintaining a responsive UI for data interaction.

- **[ ] Task:** Define technical specifications (e.g., number of tracked objects, update rate, map provider).
- **[ ] Task:** Develop the Neo.mjs implementation, offloading all position calculations and data management to the worker.
- **[ ] Task:** Create a benchmark application with a competing framework.
- **[ ] Task:** Measure and document the performance differences, especially during user interactions like sorting/filtering the associated data grid.
- **[ ] Task:** Produce materials to promote the showcase.

---

### 4. Showcase: Massive Client-Side Data Pivot Grid

A demo focused on in-browser data analytics, showcasing the ability to process large datasets without a server-side counterpart.

- **[ ] Task:** Define technical specifications (e.g., dataset size, aggregation functions).
- **[ ] Task:** Develop the Neo.mjs pivot grid, ensuring all heavy computations run in the worker.
- **[ ] Task:** Create a benchmark application with a competing framework.
- **[ ] Task:** Measure and document the performance of pivoting and re-aggregation operations.
- **[ ] Task:** Produce materials to promote the showcase.

---

### 5. Investigation: The JS Framework Benchmark (krausest)

While not designed to highlight Neo.mjs's core strengths (like UI interactivity during heavy computation), this popular benchmark is a critical credibility marker. The goal is to be competitive and to deeply understand our performance characteristics.

- **[ ] Task:** Clone the `js-framework-benchmark` repository and set up the environment.
- **[ ] Task:** Develop a baseline Neo.mjs implementation for the benchmark.
- **[ ] Task:** Run the benchmark and collect initial performance data (create, update, select, swap, remove).
- **[ ] Task:** Profile the implementation to identify the primary bottlenecks, especially for the `create rows` and `replace rows` tests.
- **[ ] Task:** **Spike:** Investigate and prototype advanced optimization strategies to mitigate worker communication overhead for bulk operations (e.g., manual delta updates, main-thread addons).
- **[ ] Task:** Document the findings, including the performance results and a clear explanation of the architectural trade-offs.

---

### 6. Showcase: High-Performance Offscreen Charting (WebGL)

This showcase demonstrates Neo.mjs's native ability to orchestrate extremely demanding rendering tasks in a dedicated Canvas Worker, keeping the main application UI perfectly responsive. It will feature a WebGL-based chart rendering and animating over 1 million data points.

**Technical Strategy & Implementation Notes:**
- The implementation will be based on the provided D3/D3FC example, which uses a `Neo.component.Canvas` in the App Worker to proxy all rendering to a `Helper` class in the Canvas Worker.
- The `Helper` class will be responsible for loading charting libraries (D3/D3FC), generating the massive dataset, and running the `requestAnimationFrame` loop for the WebGL rendering.
- The showcase will run this OffscreenCanvas component side-by-side with the "Interactive Benchmark" grid. This will create a definitive "impossible scenario" for competing frameworks, demonstrating two concurrent, computationally-intensive UIs (one in the App Worker, one in the Canvas Worker) running without blocking the main thread or each other.

- **[ ] Task:** Adapt the provided OffscreenCanvas example code into a reusable Neo.mjs component.
- **[ ] Task:** Integrate this new chart component into the "Interactive Benchmark" application layout.
- **[ ] Task:** Optionally, connect the grid's data store to the chart, allowing interactions in the grid to drive updates in the WebGL visualization, demonstrating seamless cross-worker communication.
- **[ ] Task:** Develop a version for a competing framework, which will require significant manual boilerplate for worker management and communication, highlighting the complexity Neo.mjs abstracts away.
- **[ ] Task:** Create promotional materials (videos, articles) to highlight the performance and architectural elegance of the Neo.mjs solution.

---

### 7. Showcase: Instant Subsequent Loads (Service Worker)

This showcase will directly challenge the metrics of tools like Google Lighthouse by focusing on the experience of returning users—a scenario where Neo.mjs's aggressive caching strategy provides a massive, near-native performance advantage.

**Technical Strategy & Implementation Notes:**
- The goal is to prove that for a returning user, a Neo.mjs app is served almost instantly from the Service Worker cache, resulting in a dramatically lower Time To Interactive (TTI).
- We will benchmark the "cold load" (empty cache, first visit) against the "warm load" (second visit).
- While a competitor framework optimized for Server-Side Rendering (e.g., Next.js) may win the cold load, this benchmark will highlight that Neo.mjs provides a vastly superior experience for the application's actual users on all subsequent visits. The Service Worker serves the entire application (the "JS generators") from cache before the network is even a factor.

- **[ ] Task:** Define a strict benchmark methodology for measuring TTI on both cold and warm loads.
- **[ ] Task:** Apply this methodology to one of the other showcases (e.g., the "Interactive Benchmark" app).
- **[ ] Task:** Build a comparable app in a framework like Next.js, following its best practices for performance.
- **[ ] Task:** Create compelling side-by-side video evidence of the load times. The visual difference between the two warm loads will be the key result.
- **[ ] Task:** Write a detailed article explaining *why* this performance difference exists, contrasting the Neo.mjs Service Worker architecture with traditional CSR and SSR caching strategies.

---

### 8. Cross-Cutting: The Benchmark Harness

This sub-epic covers the creation of a credible, transparent, and easy-to-use benchmarking tool to automate the execution of the showcases and the collection of performance data.

**Technical Strategy & Implementation Notes:**
- The harness will be built using **Playwright** as the core browser automation and scenario control tool.
- **Why Playwright?** It provides an excellent modern API, is fully cross-browser, and has two killer features for our purpose: built-in **video recording** and **performance tracing**. This allows us to create compelling, side-by-side visual proof and back it up with hard data.
- Performance metrics will be captured by instrumenting the showcase applications with the browser's `performance.mark()` and `performance.measure()` APIs. Playwright will then execute scripts to extract these measurements.
- A top-level Node.js script will be created to run the Playwright scenarios multiple times to ensure statistical relevance, aggregate the results, and generate a final summary report.

- **[x] Task:** Set up a new project or directory for the benchmark harness.
- **[x] Task:** Configure Playwright and create the basic test runner script.
- **[x] Task:** Instrument the showcase apps with `performance.mark()` calls at key lifecycle points.
- **[x] Task:** Develop the Playwright scripts to run the scenarios, record videos/traces, and extract performance data.
- **[x] Task: Create a script to auto-generate a markdown report from the test results.**
- **[x] Task:** Create a `README.md` with clear instructions on how to install dependencies and run the benchmarks, ensuring the results are fully reproducible by the community.

---

### 9. Cross-Cutting: Statistical Accuracy and Stability

To ensure our benchmark results are reliable and resistant to temporary system fluctuations, we need to run the test suite multiple times and aggregate the results.

- **[ ] Task:** Create a master script that can execute the Playwright test suite a specified number of times (e.g., `npm run benchmark:accurate -- --runs=5`).
- **[ ] Task:** For each run, save the `test-results.json` output to a uniquely named file (e.g., `test-results-1.json`, `test-results-2.json`).
- **[ ] Task:** Modify the `generate-report.mjs` script to read and aggregate data from all generated JSON files.
- **[ ] Task:** Update the final report to include not just the average, but also the standard deviation to quantify the variance between runs.

---

### 10. Future Showcase Idea: Conway's Game of Life

This classic computer science simulation is visually compelling and represents a pure, CPU-bound algorithmic challenge, contrasting with the I/O and rendering-bound challenges of the other showcases.

**Technical Strategy & Implementation Notes:**
- The entire simulation logic (calculating the next state for every cell in a large grid) will run in the App Worker.
- The UI will render the grid's state, potentially using a `Neo.component.Canvas` for maximum rendering performance of a large grid.
- The benchmark will demonstrate that the simulation can run at maximum speed in the worker without dropping a single frame on the main thread, where other UI elements (like controls or animations) remain perfectly fluid.

- **[ ] Task:** Define the scope of the demo (e.g., grid size, rendering method).
- **[ ] Task:** Implement the Game of Life logic within the App Worker.
- **[ ] Task:** Create the UI and connect it to the worker's state.
- **[ ] Task:** Develop a competitor version to highlight the performance difference.

---

### 11. Cross-Cutting: High-Precision Benchmark Measurement

To ensure our benchmark results are scientifically accurate, we must eliminate the "observer effect" introduced by the test harness itself. The time it takes for the Playwright test runner (in Node.js) to communicate with the browser can be significant and variable, and must not be included in the measurement of the framework's performance.

**The Problem: Measuring Test Runner Latency Instead of App Performance**

A naive benchmark implementation suffers from severe measurement pollution:

```javascript
// INACCURATE: This measures app performance PLUS multiple network round-trips.

// 1. Round-trip to start the timer
const startTime = await page.evaluate(() => performance.now());

// 2. Round-trip to click the button
await page.getByRole('button', { name: 'Create 1k rows' }).click();

// 3. Multiple round-trips for polling
await page.locator(`[role="grid"][aria-rowcount="1002"]`).waitFor();

// 4. Round-trip to stop the timer
const endTime = await page.evaluate(() => performance.now());

const duration = endTime - startTime; // The result is polluted and inaccurate.
```

**The Solution: In-Browser Atomic Measurement**

The entire timed operation—capturing the start time, triggering the event, waiting for the DOM to update, and capturing the end time—must occur atomically within a single `page.evaluate()` call. This keeps the entire measurement inside the browser's high-resolution timer context (`performance.now()`), eliminating all test runner and network latency from the result.

**The Implementation Pattern: A Robust `MutationObserver`**

Inside `page.evaluate`, we cannot use Playwright's `waitFor` helpers. We must use the browser's native `MutationObserver` API. The implementation must be robust to avoid two critical pitfalls:

1.  **The Race Condition:** The DOM update may happen faster than the observer can be attached.
    -   **Solution:** Check the condition synchronously *immediately* after triggering the event. If it's already true, return the duration instantly. Only create the observer if the condition is not yet met.

2.  **The Unstable Element Problem:** The element being observed (e.g., the grid) may be destroyed and replaced by the VDOM during the update, leaving the observer attached to a detached (orphaned) node.
    -   **Solution:** The observer must be attached to a **stable parent element** (e.g., `document.body`). The observer's callback must then **re-query the DOM** for the target element to check its state, ensuring it is always inspecting the live DOM tree.

- [x] Task: Refactor the "Create 1k rows" test in `tests/neo.spec.mjs` to use this robust, in-browser measurement pattern.
- [x] Task: Validate that the new pattern is stable, accurate, and free of timeouts.
- [x] Task: Roll out the validated pattern to all other performance-critical tests in the benchmark suite.

---

### 12. Cross-Cutting: Refactor Benchmark Test Logic

**Goal:** To improve the maintainability and readability of the benchmark test suite by eliminating redundant code.

**The Problem: Repetitive Measurement Logic**

The current implementation of `tests/neo.spec.mjs` repeats the entire `measure` function (which includes the `Promise` and `MutationObserver` logic) inside every test case. This makes the code unnecessarily verbose and difficult to maintain. Any future changes to the measurement logic would need to be applied in multiple places.

**The Solution: A Reusable Helper Function**

The `measure` function should be extracted into a single, reusable helper function. This function will accept the `action` and `condition` callbacks as parameters and be called from each test.

- [x] Task: Create a new `measurePerformance` helper function in `tests/neo.spec.mjs` that encapsulates the `Promise` and `MutationObserver` logic.
- [x] Task: Refactor all test cases to use the new `measurePerformance` helper, passing their specific `action` and `condition` logic.
- [x] Task: Ensure the refactored tests continue to pass and produce the same accurate results.
