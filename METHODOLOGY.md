# Benchmark Methodology

This document outlines the methodology used in this benchmark suite, ensuring that the tests are fair, transparent, and relevant to real-world application performance. Our goal is to move beyond simple, synthetic metrics and measure the user's perceived performance in high-stress scenarios.

## Core Principles

Our benchmarks are designed around two core principles that more accurately reflect the end-user experience.

### 1. Time to Valid State (TVS)

Instead of measuring the time to the first paint or when the JavaScript execution finishes, we measure the **Time to Valid State (TVS)**. This is the total time from the user's action (e.g., clicking a button to create 1 million grid rows) until the UI is fully rendered, stable, and accurately reflects the new application state.

For example, when creating a large number of rows, the TVS is measured from the initial click until the grid has rendered the new rows and the `aria-rowcount` attribute is updated to the correct number. This ensures we are measuring the complete, user-facing operation, not just an intermediate step.

### 2. High-Fidelity Scroll Measurement

Measuring scrolling performance is notoriously difficult. Simply checking `scrollTop` after a programmatic scroll does not guarantee that the new rows have been rendered and are visible to the user.

Our scrolling benchmarks use a **High-Fidelity Scroll Measurement** technique. After each programmatic scroll, we use a `MutationObserver` to wait until the grid's internal state is consistent with the new scroll position. We verify that the `aria-rowindex` of the first visible row matches the expected index based on the scroll position. This gives us a precise measurement of the "scroll paint lag"—the time it takes for the UI to catch up with the user's scroll input, which is a critical factor in perceived smoothness.

## Benchmark Scenarios

The benchmarks are divided into several key scenarios designed to test different aspects of framework performance.

### Interactive Grid Operations

These tests simulate common user interactions with a data grid, such as:
-   Creating a large number of rows (10k, 100k, 1M)
-   Updating a subset of rows
-   Selecting, swapping, and removing rows
-   Clearing all rows

### Big Data Grid Operations

This scenario focuses on the grid's ability to handle extremely large datasets (e.g., 100,000 rows and 200 columns, totaling 20 million cells) and perform operations like filtering and dynamic data changes.

### Scrolling Performance Under Duress

This test measures the grid's scrolling smoothness while a real-time data feed is simultaneously updating rows in the background. This simulates a worst-case scenario for UI responsiveness, revealing how well each framework can handle concurrent tasks without dropping frames or causing jank.
