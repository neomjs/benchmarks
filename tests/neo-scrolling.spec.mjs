// @ts-check
import {test, expect} from '@playwright/test';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, timeout = 10000) {
    await page.waitForFunction((expectedRowCount) => {
        const grid            = document.querySelector('[role="grid"]');
        const rowCountCorrect = grid && grid.getAttribute('aria-rowcount') === String(expectedRowCount);
        const firstRowExists  = document.querySelector('#neo-grid-body-1__row-0');
        return rowCountCorrect && firstRowExists;
    }, expectedRowCount, {timeout});
}

/**
 * Measures UI jank by collecting frame timings while scrolling a target element.
 * This function will be injected into the browser context.
 * @returns {Promise<{averageFps: number, frameCount: number, longFrameCount: number, totalTime: number}>}
 */
const measureScrollingJankInBrowser = () => {
    return new Promise((resolve, reject) => {
        const scrollableElement = document.querySelector('.neo-grid-body');
        if (!scrollableElement) {
            reject(new Error('Scrollable element .neo-grid-body not found.'));
            return;
        }

        const frameTimes = [];
        let longFrameCount = 0;
        let startTime;
        let animationFrameId;

        const scrollHeight = scrollableElement.scrollHeight;
        const clientHeight = scrollableElement.clientHeight;
        const maxScrollTop = scrollHeight - clientHeight;
        const scrollDuration = 4000; // 4 seconds to scroll from top to bottom
        let scrollStartTime;

        function frame(time) {
            if (startTime === undefined) {
                startTime = time;
                scrollStartTime = time;
            }

            const elapsed = time - startTime;
            frameTimes.push(time);

            // Animate scroll
            const scrollElapsed = time - scrollStartTime;
            const scrollFraction = Math.min(scrollElapsed / scrollDuration, 1);
            scrollableElement.scrollTop = maxScrollTop * scrollFraction;

            if (scrollFraction < 1) {
                animationFrameId = requestAnimationFrame(frame);
            } else {
                // Scrolling finished, now process results
                for (let i = 1; i < frameTimes.length; i++) {
                    const delta = frameTimes[i] - frameTimes[i - 1];
                    if (delta > 50) { // Long frame threshold
                        longFrameCount++;
                    }
                }

                const totalTime = frameTimes[frameTimes.length - 1] - frameTimes[0];
                const averageFps = totalTime > 0 ? (frameTimes.length - 1) / (totalTime / 1000) : 0;

                resolve({
                    averageFps: Math.round(averageFps),
                    frameCount: frameTimes.length,
                    longFrameCount,
                    totalTime: Math.round(totalTime)
                });
            }
        }

        animationFrameId = requestAnimationFrame(frame);
    });
};


test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.measureScrollingJank = ${measureScrollingJankInBrowser.toString()};
        `
    });

    page.on('console', msg => {
        if (msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Neo.mjs benchmark: Scrolling Performance Under Duress', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md#2-showcase-scrolling-performance-under-duress'});
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10002);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    // Measure scrolling jank for 4 seconds while the feed is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureScrollingJank();
    });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Scrolling Under Duress Jank Metrics:`, jankMetrics);

    // Assert that the UI remained responsive. For Neo.mjs, we expect near-perfect frame rates
    // even with a real-time feed stressing the worker.
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(45);
    expect(jankMetrics.longFrameCount).toBeLessThan(10);
});
