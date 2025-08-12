# Redefining Scrolling Performance Benchmarks

**Author:** Gemini
**Date:** August 12, 2025
**Status:** Proposal

## 1. The Problem with the Current Scrolling Benchmark

The existing scrolling performance test (`tests/neo-scrolling.spec.mjs`) is fundamentally flawed and produces misleading, if not entirely worthless, results. Its core assumption of programmatically scrolling an entire multi-thousand-row grid in 4 seconds is disconnected from any realistic user interaction.

**Key Flaws:**

1.  **Unrealistic Scroll Simulation:** No human user scrolls through thousands of rows of data in a few seconds. The current test simulates a "firehose" scroll that pushes any buffered rendering mechanism beyond its breaking point.
2.  **Invalid State Measurement:** Because the scroll is continuous and excessively fast, buffered grids (which includes virtually all high-performance grids) are never allowed to reach a stable, rendered state. The test therefore measures the performance of a system in a perpetual state of catch-up, which is not a meaningful metric. We are measuring how fast we can scroll through stale or non-existent content.
3.  **Misleading Metrics:** Metrics like FPS and `rowLag` derived from this flawed test are not representative of the true user experience. A high FPS is meaningless if the content being scrolled is incorrect or blank. The `rowLag` metric becomes absurdly large, not because the framework is slow, but because the test is unreasonable.

The goal is not to see if we can break the rendering engine with an impossible task. The goal is to measure the **perceived fluidity and responsiveness** during realistic user interactions.

## 2. A New, Meaningful Test Strategy: Measuring "Time to Valid State"

We must shift from measuring a continuous, unrealistic scroll to measuring the latency of discrete, user-initiated scroll actions. This directly correlates to what a user actually perceives as "lag".

The core principle is: **When I scroll, how long does it take for the grid to show me the correct data for my new viewport?**

### Proposed Test Scenario

This scenario will be executed for each framework (Neo.mjs, Angular, React) under various conditions (e.g., 10k, 100k, 1M rows) and with the "Real-time Feed" active to simulate background stress.

1.  **Setup:**
    *   Load the application and create the target dataset (e.g., 100k rows).
    *   Wait for the grid to be in a fully ready and stable state.
    *   Start the "Real-time Feed" to introduce main-thread (for React/Angular) or worker-thread (for Neo.mjs) pressure.

2.  **Test Execution Loop (e.g., 20 iterations):**
    *   **A. Initial State:** Record the `id` or unique content of the first visible row (e.g., `Row 0`).
    *   **B. The Action (Simulate User Scroll):**
        *   Instantly change the `scrollTop` of the grid's scrollable element by a fixed amount. This amount should be equivalent to a realistic user action.
        *   **Example Actions:**
            *   **Mouse Wheel:** `50 rows * rowHeight`
            *   **Page Down:** `clientHeight` of the scrollable area.
    *   **C. The Measurement (Time to Valid State):**
        *   Start a high-resolution timer (`performance.now()`).
        *   Use a `waitForFunction` or `MutationObserver` to wait for the grid to reach a "valid state".
        *   **Definition of "Valid State":**
            1.  The first DOM element within the grid body has a `aria-rowindex` that matches the expected row index based on the new `scrollTop`.
            2.  The content of that rendered row is correct. This is critical to ensure we are not just painting a recycled row with stale data. We must verify the cell content matches the expected data for that row index.
        *   Stop the timer. The elapsed time is the `timeToValidState` for this iteration.
    *   **D. The Interference Check (Concurrent Update Verification):**
        *   While waiting for the valid state (Step C), we must also verify that the real-time feed is still updating cells that *remain visible* or have just become visible.
        *   This can be done by observing a specific cell's value and ensuring it changes as dictated by the feed. This measures whether the scroll-rendering logic blocks other UI updates.

3.  **Data Collection & Reporting:**
    *   For each test run, we will collect an array of `timeToValidState` values.
    *   The final report will present the following metrics:
        *   **`minTimeToValidState`**: The best-case performance.
        *   **`avgTimeToValidState`**: The average user-perceived lag. This is the most important headline number.
        *   **`maxTimeToValidState`**: The worst-case lag, indicating jank.
        *   **`stdDevTimeToValidState`**: The consistency of the performance.
        *   **`updateSuccessRate`**: The percentage of iterations where the real-time feed updates were successfully rendered during the scroll action. A value less than 100% indicates that scrolling blocks other rendering work.

This revised methodology will produce scientifically sound, defensible, and meaningful results that directly reflect the user experience of scrolling under pressure. It will provide a true measure of architectural superiority, moving beyond the flawed metrics of the current implementation.
