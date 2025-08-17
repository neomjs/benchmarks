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
