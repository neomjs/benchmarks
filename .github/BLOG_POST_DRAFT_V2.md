*A quick note on the authorial voice: You'll see "we" used throughout this article. This isn't a royal "we" or a corporate "we." It's a literal "we," representing the collaborative effort between a human engineer (me, Tobi) and dozens of iterative sessions with Gemini 2.5 Pro, which acted as a pair programmer, critic, and co-author in building this project and its narrative. This benchmark is as much a product of that unique human-AI partnership as it is of the code itself.*

# Benchmarking Frontends in 2025: We Had to Break the Rules to Get It Right

When we set out to build a new benchmark suite for modern frontend frameworks, our goal was simple: to measure the real-world, interactive performance of complex applications under stress. We knew that traditional tools like Lighthouse, while essential, primarily focus on the initial page load, leaving a critical gap in measuring the "lived-in" experience of an application.

We chose Playwright as our harness for its power and cross-browser capabilities. We assumed that building the tests would be straightforward. We were wrong.

We quickly discovered that the standard "best practices" for automated testing were not just insufficient for performance measurement—they were actively hostile to it. To get clean, trustworthy data, we had to identify and overcome three fundamental challenges, forcing us to break the conventional rules and build a new kind of measurement tool from the ground up.

## Challenge 1: The Parallelism Trap

Our first instinct, and the default for most modern test runners, was to run our test suites in parallel to save time. Playwright is configured out-of-the-box to use one worker process per CPU core. For standard functional testing, this is a massive win. For performance benchmarking, it was a disaster.

The very purpose of a benchmark is to push a browser and framework to its limits, heavily stressing CPU cores. When we ran tests in parallel, we weren't giving each test a clean, idle core to run on. We were forcing multiple, already maxed-out browser instances to fight for the same overloaded CPU resources. The result was massive context switching and resource starvation, with performance numbers dropping by as much as 50% compared to running a single test. The data was useless.

**Lesson 1: For accurate performance benchmarking, serial execution is non-negotiable.** We immediately configured our test runner to use a single worker (`--workers=1`), ensuring that every test run gets the full, undivided attention of the machine. It takes longer, but the stability and reliability of the results are paramount.

## Challenge 2: The Latency Chasm and the Atomic Measurement

With our tests running serially, we still saw unacceptable noise in the data. The problem was the "observer effect" caused by the constant back-and-forth communication between the Playwright test runner (living in a Node.js process) and the browser page. A typical Playwright script might look like this:

1.  **[Node.js]** `page.click('#my-button')`
2.  *(Network/IPC delay)*
3.  **[Browser]** Clicks the button.
4.  **[Node.js]** `page.waitForSelector('.new-element')`
5.  *(Network/IPC delay)*
6.  **[Browser]** Starts polling for the element.
7.  ...

Each of these steps adds milliseconds of unpredictable latency, completely separate from the framework's actual performance. To get scientifically accurate results, we had to eliminate this chatter.

Our solution was to make each measurement **atomic**. The entire test—triggering an action, waiting for a specific condition to be met, and measuring the duration—had to be executed in a single, uninterrupted block of code *inside the browser's context*.

We achieved this by combining two powerful Playwright features. First, we use `page.addInitScript()` to inject our custom measurement helpers (like `measurePerformanceInBrowser`) directly into the browser's `window` object. This is the recommended way to share code across tests, and it ensures our logic is always available without violating Content Security Policies (CSP).

Second, every performance test is now wrapped in a single `page.evaluate()` call. This function effectively gives us a portal into the browser's own thread, allowing us to run our entire measurement logic atomically, from start to finish, without ever leaving the browser. Only the final, high-precision number is returned to the Node.js process.

**Lesson 2: Eliminate test runner latency by performing all measurement logic atomically inside the browser.** This is the only way to be certain you are measuring the framework, not the harness.

## Challenge 3: The Polling Fallacy

Even with atomic, in-browser measurements, one insidious problem remained. Our results for very short-duration tasks were wildly inconsistent. We'd try to measure a UI update that we knew should take around 20ms, but the benchmark would report numbers like 45ms, 32ms, or even 58ms. The deviation was so high that the data was meaningless.

We discovered the reason the hard way: Playwright's `waitFor` helpers, and indeed most automation library "wait" functions, don't check the DOM continuously. To avoid pegging the CPU, they use long-polling, checking the condition only every 30ms or more.

This is perfectly fine for functional testing—you don't care if you wait an extra 20ms for a button to appear. But for performance measurement, it's a fatal flaw. You cannot use a ruler with 30ms markings to accurately measure a 20ms event.

This realization forced us to throw out polling entirely and build our own high-precision waiting mechanism. The solution was the browser's native `MutationObserver`.

Our `measurePerformanceInBrowser` function attaches a `MutationObserver` to the document body that listens for any and all DOM changes. After triggering an action, it checks our "pass" condition on every single DOM mutation, no matter how small. This allows us to stop the timer at the exact moment the UI reaches its desired state, giving us microsecond-level precision. It is the technical heart of our benchmark's credibility.

**Lesson 3: You can't trust polling-based "wait" functions for performance measurement.** For high-precision results, you must use a `MutationObserver` to react to DOM changes instantly.

## What We Can Finally See Clearly

By building this high-precision, scientifically rigorous benchmark harness, we can now measure the true resilience of frontend frameworks under pressure. The results are not just a leaderboard; they are a practical demonstration of the trade-offs inherent in different architectural designs.

Here are two key insights this approach has already revealed:

1.  **The Main-Thread Bottleneck is Real and Severe:** In our "Heavy Calculation" test, frameworks that run heavy tasks on the main thread (React, Angular) see their UI frame rates plummet to 30 FPS or even 0 FPS, causing visible freezing. In contrast, a worker-based architecture (Neo.mjs) maintains a perfect 60 FPS, as the UI thread is never blocked. Our benchmark doesn't just suggest this; it quantifies it.

2.  **Extreme Loads Reveal Architectural Breaking Points:** In our "Scrolling Under Duress" test (1 million rows with a live data feed), the React/TanStack Virtual implementation doesn't just slow down—it crashes the browser tab. The Angular app remains barely usable, with over a second of lag. The worker-based app stays responsive. This is a critical failure mode that only emerges under the kind of concurrent, high-stress scenario this benchmark is designed to create.

## An Open Invitation to the Community

The goal of this project is not to declare a single "winner." It is to create a shared, open-source standard for measuring the performance and resilience of modern web applications. The insights gained will help framework authors identify architectural bottlenecks and empower application developers to choose the right tool for the job.

This is a community effort, and it is just beginning.

We've started with implementations for Angular, Neo.mjs, and React, but we need your help to make this a truly comprehensive resource. If you are an expert in Svelte, Solid, Vue, or any other frontend framework, we invite you to contribute. Help us build a high-quality, best-practice implementation for your framework of choice. Challenge our methodology, question our results, and help us build the most accurate and relevant performance benchmark for the entire web community.

The entire project, including all applications, test suites, and results, is publicly available on GitHub.

-   **Explore the code and results:** [Link to your GitHub Repo]
-   **Read our detailed methodology:** [Link to METHODOLOGY.md]
-   **Run the benchmarks yourself:** [Link to REPRODUCIBILITY.md]

Let's work together to define the future of frontend performance measurement.
