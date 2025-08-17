*A quick note on the authorial voice: You'll see "we" used throughout this article. This isn't a royal "we" or a corporate "we." It's a literal "we," representing the collaborative effort between a human engineer (me, Tobi) and dozens of iterative sessions with Gemini 2.5 Pro, which acted as a pair programmer, critic, and co-author in building this project and its narrative. This benchmark is as much a product of that unique human-AI partnership as it is of the code itself.*

# Benchmarking Frontends in 2025: We Had to Break the Rules to Get It Right

## The Two Worlds of Web Performance

For the better part of a decade, the web performance community has rightfully focused on one critical goal: making the initial page load faster. Driven by tools like Google's Lighthouse and the Core Web Vitals (CWV) initiative, we've become experts at optimizing for the "first-impression" web. This is the world of e-commerce, marketing sites, and news articles, where success is measured in milliseconds of Largest Contentful Paint (LCP) and a low Interaction to Next Paint (INP). For this half of the web, these tools are essential and have made the user experience immeasurably better.

But another half of the web has been quietly evolving, operating under a completely different set of pressures. This is the "lived-in" web: the complex, data-intensive applications where users spend their entire workday. Think of real-time trading dashboards, enterprise SaaS platforms, and data science tools. Here, the initial load is a distant memory. True performance is defined by what happens hours into a session: Can the UI handle a stream of 1,000 real-time updates per second without stuttering? Can a data grid ingest and render 100,000 new rows without freezing? Does the entire application grind to a halt during a heavy background calculation?

## An Ecosystem Measuring Only Half the Story

The uncomfortable truth is that our benchmarking ecosystem is still primarily designed to measure the "first-impression" web.

Core Web Vitals are the gold standard, but their focus is, by definition, on the loading experience. LCP measures render speed, INP measures initial input delay, and CLS measures visual stability *as the page loads*. They are not designed to tell you if your application will suffer catastrophic jank ten minutes into a session under a heavy, concurrent load.

The `js-framework-benchmark` (often called "krausest") was a vital step in the right direction, moving the focus to interactivity like creating, swapping, and deleting rows. It provides invaluable data on the raw speed of these atomic operations. But it tests them in a sterile lab, in isolation. It doesn't simulate the chaos of a real application where a user is scrolling *while* a background task is running *and* a WebSocket is pushing real-time updates.

This leaves developers of complex applications flying blind. We are building a generation of incredibly demanding, "lived-in" applications but are forced to measure them with tools designed for a simpler, "first-impression" world.

## The Need for a New Harness

This is the gap we set out to fill. We needed to build a new kind of benchmark from the ground up—one that could simulate real-world concurrency and measure an application's resilience under sustained duress.

To do this, we had to start from scratch. We needed a harness that could automate complex, multi-step interactions across all modern browsers and give us the low-level control to measure with scientific precision. That's why we chose Playwright as our foundation. But as we quickly learned, simply choosing a tool wasn't enough. We had to fundamentally rethink *how* to use it.

## Challenge 1: The Parallelism Trap

Our first instinct, and the default for most modern test runners, was to run our test suites in parallel to save time. Playwright is configured out-of-the-box to use one worker process per CPU core. For standard functional testing, this is a massive win. For performance benchmarking, it was a disaster.

The very purpose of a benchmark is to push a browser and framework to its limits, heavily stressing CPU cores. When we ran tests in parallel, we weren't giving each test a clean, idle core to run on. We were forcing multiple, already maxed-out browser instances to fight for the same overloaded CPU resources. The result was massive context switching and resource starvation, with performance numbers dropping by as much as 50% compared to running a single test. The data was useless.

**Lesson 1: For accurate performance benchmarking, serial execution is non-negotiable.** We immediately configured our test runner to use a single worker (`--workers=1`), ensuring that every test run gets the full, undivided attention of the machine. It takes longer, but the stability and reliability of the results are paramount.

## Challenge 2: The Latency Chasm and the Atomic Measurement

With our tests running serially, we still saw unacceptable noise in the data. The problem was the "observer effect" caused by the constant back-and-forth communication between the Playwright test runner (living in a Node.js process) and the browser page. Each command and response adds milliseconds of unpredictable latency, completely separate from the framework's actual performance.

Our solution was to make each measurement **atomic**. The entire test—triggering an action, waiting for a specific condition to be met, and measuring the duration—had to be executed in a single, uninterrupted block of code *inside the browser's context*. We use `page.addInitScript()` to inject our measurement helpers into the page, then wrap each test in a single `page.evaluate()` call. This gives us a portal into the browser's own thread, allowing us to run our entire measurement logic atomically. Only the final, high-precision number is returned to the Node.js process.

**Lesson 2: Eliminate test runner latency by performing all measurement logic atomically inside the browser.** This is the only way to be certain you are measuring the framework, not the harness.

## Challenge 3: The Polling Fallacy

Even with atomic, in-browser measurements, our results for very short-duration tasks were wildly inconsistent. We discovered the reason the hard way: Playwright's `waitFor` helpers, like most automation "wait" functions, use long-polling, checking the DOM only every 30ms or more to avoid pegging the CPU.

This is fine for functional testing, but for performance measurement, it's a fatal flaw. You cannot use a ruler with 30ms markings to accurately measure a 20ms event.

This realization forced us to throw out polling entirely and build our own high-precision waiting mechanism using the browser's native `MutationObserver`. Our `measurePerformanceInBrowser` function attaches an observer that checks our pass condition on *every single DOM mutation*. This allows us to stop the timer at the exact moment the UI reaches its desired state, giving us microsecond-level precision. It is the technical heart of our benchmark's credibility.

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
