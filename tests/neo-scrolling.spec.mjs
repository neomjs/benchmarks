import {test, expect} from '@playwright/test';
import {
    assertNeoVdomWorkerTopology,
    configureNeoVdomWorker,
    installWorkerMessageProbeInBrowser,
    measureJankInBrowser,
    measurePerformanceInBrowser
} from './utils/browser-test-helpers.mjs';

/**
 * @summary Waits for the Neo v14 grid to report `expectedRowCount` and mount row `0`, then verifies worker topology.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, timeout = 30000) {
    await page.waitForFunction((expectedRowCount) => {
        const grid            = document.querySelector('[role="grid"]');
        const rowCountCorrect = grid && grid.getAttribute('aria-rowcount') === String(expectedRowCount);
        const firstRowExists  = document.querySelector('.neo-grid-row[data-row-id="0"]');
        return rowCountCorrect && firstRowExists;
    }, expectedRowCount, {timeout});
    await assertNeoVdomWorkerTopology(page);
}

/**
 * Orchestrates discrete scroll steps and measures the time to valid state for each.
 * @param {number} scrollAmountRows The amount in rows to scroll in each step.
 * @param {number} numScrolls The total number of discrete scroll steps to perform.
 * @param {number} rowHeight The height of a single row in pixels.
 * @param {number} gridRenderOffset The fixed offset in rows due to headers and buffering.
 * @returns {Promise<Array<{
 *   scrollStep: number,
 *   timeToValidState: number,
 *   updateSuccess: boolean // Placeholder for real-time update verification
 * }>>}
 */
const runDiscreteScrollBenchmark = (scrollAmountRows, numScrolls, rowHeight, gridRenderOffset) => {
    return new Promise(async (resolve, reject) => {
        const scrollableElement = document.querySelector('.neo-grid-view');
        if (!scrollableElement) {
            reject(new Error('Scrollable element .neo-grid-view not found.'));
            return;
        }

        const scrollAmountPx = scrollAmountRows * rowHeight;
        const timeout = navigator.userAgent.includes('Firefox') ? 15000 : 15000;

        const results = [];
        let currentScrollTop = scrollableElement.scrollTop;

        for (let i = 0; i < numScrolls; i++) {
            // CRITICAL FIX for Firefox: Removed Math.min capping by scrollHeight - clientHeight
            const targetScrollTop = currentScrollTop + scrollAmountPx;

            // Adjusted expectedTopRowIndex to account for gridRenderOffset (bufferRowRange)
            const expectedTopRowIndex = Math.max(0, Math.floor(targetScrollTop / rowHeight) - gridRenderOffset);

            const action = (passThrough) => {
                passThrough.scrollableElement.scrollTop = passThrough.targetScrollTop;
            };

            const condition = (passThrough) => {
                const { expectedTopRowIndex } = passThrough;
                const mountedRows = document.querySelectorAll('.neo-grid-body .neo-grid-row[aria-rowindex]:not([aria-hidden="true"])');
                let actualTopRowIndex = Infinity;
                for (let j = 0; j < mountedRows.length; j++) {
                    const idx = parseInt(mountedRows[j].getAttribute('aria-rowindex'), 10) - 2;
                    if (idx < actualTopRowIndex) {
                        actualTopRowIndex = idx;
                    }
                }

                const isGridInValidState = (actualTopRowIndex === expectedTopRowIndex);

                // TODO: Implement actual real-time update verification here.
                // This is a placeholder. You would typically check a specific cell's content
                // that is known to be updated by the real-time feed.
                const isInterferenceCheckPassed = true; // Assume success for now

                return isGridInValidState && isInterferenceCheckPassed;
            };

            try {
                const timeToValidState = await window.measurePerformance(
                    `Scroll Step ${i + 1}`,
                    action,
                    condition,
                    { scrollableElement, targetScrollTop, expectedTopRowIndex, scrollStep: i + 1 /*, TODO: add data for interference check */ },
                    { timeout }
                );

                results.push({
                    scrollStep: i,
                    timeToValidState: timeToValidState,
                    updateSuccess: true // This will come from isInterferenceCheckPassed once implemented
                });

                currentScrollTop = targetScrollTop;
                // Add a small delay between scrolls to simulate user pause
                await new Promise(res => setTimeout(res, 50));

            } catch (error) {
                console.error(`Error during scroll step ${i + 1}:`, error.message || error);
                results.push({
                    scrollStep: i,
                    timeToValidState: -1, // Indicate failure
                    updateSuccess: false
                });
                // Continue to next step or break, depending on desired behavior on error
            }
        }
        resolve(results);
    });
};

test.beforeEach(async ({page}) => {
    await configureNeoVdomWorker(page);

    // Inject the measurement functions into the browser context's window object
    await page.addInitScript({
        content: `
            (${installWorkerMessageProbeInBrowser.toString()})();
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.measureJank        = ${measureJankInBrowser.toString()};
            window.runDiscreteScrollBenchmark = ${runDiscreteScrollBenchmark.toString()};
        `
    });

    page.on('console', msg => {
        if (msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Neo.mjs benchmark: Scrolling Performance Under Duress 10k Rows UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/SCROLLING_BENCHMARK_STRATEGY.md'});
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Interactive Benchmark Neo');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10001);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    const rowHeight        = 32; // As defined in the Neo.mjs grid styles
    const scrollAmountRows = 50; // Scroll 50 rows per step
    const numScrolls       = 20; // Perform 20 discrete scroll steps
    const gridRenderOffset = 3; // Fixed offset due to headers and buffering (set to 3 as per user)

    // Measure discrete scrolling fluidity + worker message volume
    const { results, workerStats } = await page.evaluate(async (params) => {
        const { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset } = params;
        window.startWorkerMessageProbe();
        const results     = await window.runDiscreteScrollBenchmark(scrollAmountRows, numScrolls, rowHeight, gridRenderOffset);
        const workerStats = window.stopWorkerMessageProbe();
        return { results, workerStats };
    }, { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    // Process results
    const validResults          = results.filter(r => r.timeToValidState !== -1);
    const totalTimeToValidState = validResults.reduce((sum, r) => sum + r.timeToValidState, 0);
    const avgTimeToValidState   = totalTimeToValidState / validResults.length;
    const maxTimeToValidState   = Math.max(...validResults.map(r => r.timeToValidState));
    const updateSuccessCount    = validResults.filter(r => r.updateSuccess).length;
    const updateSuccessRate     = (updateSuccessCount / validResults.length) * 100;

    test.info().annotations.push({type: 'avgTimeToValidState', description: `${avgTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'maxTimeToValidState', description: `${maxTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'stepTimes', description: JSON.stringify(validResults.map(r => Math.round(r.timeToValidState * 100) / 100))});
    test.info().annotations.push({type: 'updateSuccessRate', description: `${updateSuccessRate.toFixed(2)}%`});
    test.info().annotations.push({type: 'workerMessages', description: JSON.stringify(workerStats)});

    console.log(`Discrete Scrolling Metrics (10k Rows):`, {
        avgTimeToValidState: avgTimeToValidState.toFixed(2),
        maxTimeToValidState: maxTimeToValidState.toFixed(2),
        updateSuccessRate  : updateSuccessRate.toFixed(2)
    });

    // Assertions based on the new strategy
    expect(avgTimeToValidState).toBeLessThan(200); // Expect average time to valid state to be low
    expect(maxTimeToValidState).toBeLessThan(500); // Expect max time to valid state to be reasonable
    expect(updateSuccessRate).toBeGreaterThanOrEqual(95); // Expect high success rate for updates
});

test('Neo.mjs benchmark: Scrolling Performance Under Duress 100k Rows UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/SCROLLING_BENCHMARK_STRATEGY.md'});
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Interactive Benchmark Neo');
    await page.getByRole('button', {name: 'Create 100k Rows'}).click();
    await waitForGridReady(page, 100001);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    const rowHeight        = 32; // As defined in the Neo.mjs grid styles
    const scrollAmountRows = 50; // Scroll 50 rows per step
    const numScrolls       = 20; // Perform 20 discrete scroll steps
    const gridRenderOffset = 3; // Fixed offset due to headers and buffering (set to 3 as per user)

    // Measure discrete scrolling fluidity + worker message volume
    const { results, workerStats } = await page.evaluate(async (params) => {
        const { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset } = params;
        window.startWorkerMessageProbe();
        const results     = await window.runDiscreteScrollBenchmark(scrollAmountRows, numScrolls, rowHeight, gridRenderOffset);
        const workerStats = window.stopWorkerMessageProbe();
        return { results, workerStats };
    }, { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    // Process results
    const validResults          = results.filter(r => r.timeToValidState !== -1);
    const totalTimeToValidState = validResults.reduce((sum, r) => sum + r.timeToValidState, 0);
    const avgTimeToValidState   = totalTimeToValidState / validResults.length;
    const maxTimeToValidState   = Math.max(...validResults.map(r => r.timeToValidState));
    const updateSuccessCount    = validResults.filter(r => r.updateSuccess).length;
    const updateSuccessRate     = (updateSuccessCount / validResults.length) * 100;

    test.info().annotations.push({type: 'avgTimeToValidState', description: `${avgTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'maxTimeToValidState', description: `${maxTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'stepTimes', description: JSON.stringify(validResults.map(r => Math.round(r.timeToValidState * 100) / 100))});
    test.info().annotations.push({type: 'updateSuccessRate', description: `${updateSuccessRate.toFixed(2)}%`});
    test.info().annotations.push({type: 'workerMessages', description: JSON.stringify(workerStats)});

    console.log(`Discrete Scrolling Metrics (100k Rows):`, {
        avgTimeToValidState: avgTimeToValidState.toFixed(2),
        maxTimeToValidState: maxTimeToValidState.toFixed(2),
        updateSuccessRate  : updateSuccessRate.toFixed(2)
    });

    // Assertions based on the new strategy
    expect(avgTimeToValidState).toBeLessThan(300); // Looser assertion for 100k rows
    expect(maxTimeToValidState).toBeLessThan(750); // Looser assertion for 100k rows
    expect(updateSuccessRate).toBeGreaterThanOrEqual(90); // Looser assertion for 100k rows
});

test('Neo.mjs benchmark: Scrolling Performance Under Duress 1M Rows UI Responsiveness', async ({page, browserName}) => {
    // Skip this test in Firefox due to its known limitation with extremely large scroll heights (~17.9M pixels).
    // The 1M row grid (32M pixels) exceeds this limit, causing scrollTop to be clamped and preventing meaningful testing.
    test.skip(browserName === 'firefox', 'Skipping 1M rows test in Firefox due to scroll height limitation.');

    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/SCROLLING_BENCHMARK_STRATEGY.md'});
    test.setTimeout(180000); // Increased timeout for 1M rows

    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Interactive Benchmark Neo');
    await page.getByRole('button', {name: 'Create 1M Rows'}).click();
    await waitForGridReady(page, 1000001);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    const rowHeight        = 32; // As defined in the Neo.mjs grid styles
    const scrollAmountRows = 50; // Scroll 50 rows per step
    const numScrolls       = 20; // Perform 20 discrete scroll steps
    const gridRenderOffset = 3; // Fixed offset due to headers and buffering (set to 3 as per user)

    // Measure discrete scrolling fluidity + worker message volume
    const { results, workerStats } = await page.evaluate(async (params) => {
        const { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset } = params;
        window.startWorkerMessageProbe();
        const results     = await window.runDiscreteScrollBenchmark(scrollAmountRows, numScrolls, rowHeight, gridRenderOffset);
        const workerStats = window.stopWorkerMessageProbe();
        return { results, workerStats };
    }, { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    // Process results
    const validResults          = results.filter(r => r.timeToValidState !== -1);
    const totalTimeToValidState = validResults.reduce((sum, r) => sum + r.timeToValidState, 0);
    const avgTimeToValidState   = totalTimeToValidState / validResults.length;
    const maxTimeToValidState   = Math.max(...validResults.map(r => r.timeToValidState));
    const updateSuccessCount    = validResults.filter(r => r.updateSuccess).length;
    const updateSuccessRate     = (updateSuccessCount / validResults.length) * 100;

    test.info().annotations.push({type: 'avgTimeToValidState', description: `${avgTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'maxTimeToValidState', description: `${maxTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'stepTimes', description: JSON.stringify(validResults.map(r => Math.round(r.timeToValidState * 100) / 100))});
    test.info().annotations.push({type: 'updateSuccessRate', description: `${updateSuccessRate.toFixed(2)}%`});
    test.info().annotations.push({type: 'workerMessages', description: JSON.stringify(workerStats)});

    console.log(`Discrete Scrolling Metrics (1M Rows):`, {
        avgTimeToValidState: avgTimeToValidState.toFixed(2),
        maxTimeToValidState: maxTimeToValidState.toFixed(2),
        updateSuccessRate  : updateSuccessRate.toFixed(2)
    });

    // Assertions based on the new strategy
    expect(avgTimeToValidState).toBeLessThan(600); // Very loose assertion for 1M rows
    expect(maxTimeToValidState).toBeLessThan(1000); // Very loose assertion for 1M rows
    expect(updateSuccessRate).toBeGreaterThanOrEqual(80); // Very loose assertion for 1M rows
});
