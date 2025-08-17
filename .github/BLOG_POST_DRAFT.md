# Benchmarking Frontends in 2025

## The Performance Paradox: Why Your "Fast" App Still Feels Slow

You've done everything right. You've optimized your critical rendering path, compressed your assets, and your Lighthouse score is a perfect 100. Your application loads in a flash. But the user feedback tells a different story. They complain about "sluggishness," "jank," and a UI that "freezes" during common operations.

This is the performance paradox many developers face in 2025. Our tools have become exceptionally good at measuring the initial loading experience—the first five seconds that determine a user's first impression. But for the complex, data-intensive applications that define the modern web, the real user experience begins *after* the page loads. It lives in the clicks, the scrolls, the real-time updates, and the heavy data processing that happens second-to-second. And this is where our traditional tools fall silent.

## The Measurement Gap: Beyond Lighthouse and Krausest

For years, two pillars have defined frontend performance measurement:

1.  **Google's Lighthouse:** An indispensable tool for auditing the initial page load. It's the gold standard for SEO, accessibility, and ensuring a snappy first impression. Its limitation, however, is its focus on the "cold cache" experience. It can't tell you what happens when a user, ten minutes into a session, clicks a button that needs to process and render 100,000 rows of data.

2.  **The js-framework-benchmark (Krausest):** A vital resource for measuring the raw speed of atomic DOM operations. It provides granular data on how quickly a framework can create, update, or remove rows in isolation. Its gap is that it doesn't simulate the *concurrent stress* of a real-world application. Modern UIs are rarely doing one thing at a time. A user might be scrolling through a grid while a real-time data feed is updating cells and a background task is processing data. Krausest tests operations in a vacuum, not in the chaotic, resource-competitive environment of a live application.

This isn't a critique of these tools. They are excellent at what they were designed to do. But the web has evolved, and the applications we build have grown more complex. We need to evolve how we measure them. We need a new standard that focuses on application resilience and interactivity under sustained load.

## Our Solution: A Benchmark for Application Resilience

To fill this gap, we created a new, open-source benchmark suite designed to measure frontend performance under realistic, high-stress conditions. Our philosophy is simple: measure what the user actually *feels*, especially when the application is under duress.

This required a new way of thinking about measurement, built on three core principles:

1.  **Concurrency is King:** We test what happens when a user action (like scrolling), a background calculation, and a real-time data feed all compete for resources at the same time. This simulates the concurrent stress that is the primary source of UI jank in modern apps.

2.  **Time to Valid State (TVS):** We don't just measure until something is painted on the screen. We measure the total time until the UI is fully rendered, stable, and—most importantly—*correct*. For a data grid, this means waiting until the `aria-rowcount` attribute is accurate and the content of the visible rows matches the underlying data. This provides a true measure of the end-to-end user experience.

3.  **High-Fidelity Scrolling:** We measure the almost imperceptible lag between the scrollbar's position and the content catching up. By comparing the expected row index (based on `scrollTop`) to the actually rendered row index in every frame, we can quantify the visual "jank" that users feel long before they can articulate it.

## The Showcases: Two Sides of the Performance Coin

To cover a broad range of performance challenges, the suite is built around two distinct showcase applications:

1.  **The Interactive Benchmark:** This application is an enhanced version of the classic "krausest" benchmark, designed to test UI responsiveness in a highly interactive dashboard. It measures the framework's ability to handle atomic DOM operations (creating, updating, swapping rows) while simultaneously running heavy background calculations and processing a high-frequency, real-time data feed. This is the ultimate test of UI fluidity under concurrent stress.

2.  **The Big Data Benchmark:** This showcase pushes data grids to their absolute limits. We test scenarios with up to 100,000 rows and 200 columns—totaling 20 million data cells—to measure raw data processing and rendering scalability. To ensure a fair and challenging comparison, we benchmark against best-in-class, enterprise-grade grid components like AG Grid. This test reveals how different architectures hold up when faced with massive datasets.

## A Glimpse of the "Why": What This New Measurement Reveals

By focusing on concurrency and resilience, this new benchmark brings critical architectural differences to light. The results are not just a leaderboard; they are a practical demonstration of the trade-offs inherent in different framework designs. Here are two key insights this approach has already revealed:

### Finding 1: The Main-Thread Bottleneck is Quantifiable and Severe

A common challenge in complex apps is running a heavy, synchronous calculation without freezing the UI. Our "Heavy Calculation" test from the Interactive Benchmark measures this directly. We trigger a CPU-intensive task and, at the same time, measure the animation frame rate of a spinning logo.

The results are stark.

-   Frameworks that perform this calculation on the **main thread**, like React and Angular, see their frame rates plummet. The UI becomes visibly unresponsive, dropping to 30 FPS or, in some browsers, freezing entirely at 0 FPS.
-   Frameworks that can offload this work to a **Web Worker**, like Neo.mjs, maintain a perfect 60 FPS. The UI remains completely fluid and interactive while the heavy lifting happens in the background.

This isn't just a theoretical advantage; it's a quantifiable difference in user experience that older benchmarks couldn't capture.

### Finding 2: Extreme Data Loads Reveal Architectural Breaking Points

What happens when you push a data grid to its absolute limit? Our "Scrolling Performance Under Duress" test attempts to answer this. We load a grid with 1 million rows, start a real-time data feed updating in the background, and then simulate a user trying to scroll through the data.

This scenario revealed a critical failure mode that only a stress test of this nature could find:

-   The React implementation, using the popular TanStack Virtual library, doesn't just get slow—it causes a hard browser crash. The "Aw, Snap!" page is the end result.
-   The Angular implementation slows to a crawl, with scroll paint lag exceeding a full second (1135ms), making it unusable.
-   The worker-based Neo.mjs architecture, while still under heavy load, remains responsive, with an average scroll paint lag of just 66ms.

This demonstrates that under extreme, concurrent pressure, the architectural choices made by a framework can be the difference between a slow app, a usable app, and a dead browser tab. These are the kinds of insights that are essential for developers building the next generation of data-intensive applications.

## This is for the Community: An Open Invitation

The goal of this project is not to declare a single "winner." It is to create a shared, open-source standard for measuring the performance and resilience of modern web applications. The insights gained will help framework authors identify architectural bottlenecks and empower application developers to choose the right tool for the job.

This is a community effort, and it is just beginning.

We've started with implementations for Angular, Neo.mjs, and React, but we need your help to make this a truly comprehensive resource. If you are an expert in Svelte, Solid, Vue, or any other frontend framework, we invite you to contribute. Help us build a high-quality, best-practice implementation for your framework of choice. Challenge our methodology, question our results, and help us build the most accurate and relevant performance benchmark for the entire web community.

The entire project, including all applications, test suites, and results, is publicly available on GitHub.

-   **Explore the code and results:** [Link to your GitHub Repo]
-   **Read our detailed methodology:** [Link to METHODOLOGY.md]
-   **Run the benchmarks yourself:** [Link to REPRODUCIBILITY.md]

Let's work together to define the future of frontend performance measurement.
