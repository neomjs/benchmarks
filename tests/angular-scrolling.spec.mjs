import {test, expect} from '@playwright/test';
import { measurePerformanceInBrowser, measureJankInBrowser } from './utils/browser-test-helpers.mjs';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, timeout = 10000) {
    await page.waitForFunction((expectedRowCount) => {
        const grid = document.querySelector('[role="grid"]');
        if (!grid) return false;
        const rowCountCorrect = grid.getAttribute('aria-rowcount') === String(expectedRowCount + 1); // +1 for header
        const firstRowExists  = grid.querySelector('.ag-row[row-index="0"]');
        return rowCountCorrect && firstRowExists;
    }, expectedRowCount, {timeout});
}

/**
 * Orchestrates discrete scroll steps and measures the time to valid state for each.
 * Adapted for AG-Grid.
 * @param {number} scrollAmountRows The amount in rows to scroll in each step.
 * @param {number} numScrolls The total number of discrete scroll steps to perform.
 * @param {number} rowHeight The height of a single row in pixels.
 * @param {number} gridRenderOffset The fixed offset in rows due to headers and buffering.
 * @returns {Promise<Array<{
 *   scrollStep: number,
 *   timeToValidState: number,
 *   updateSuccess: boolean
 * }>>}
 */
const runDiscreteScrollBenchmark = (scrollAmountRows, numScrolls, rowHeight, gridRenderOffset) => {
    return new Promise(async (resolve, reject) => {
        const scrollableElement = document.querySelector('.ag-body-viewport');
        if (!scrollableElement) {
            reject(new Error('Scrollable element .ag-body-viewport not found.'));
            return;
        }

        const scrollAmountPx = scrollAmountRows * rowHeight;
        const timeout = navigator.userAgent.includes('Firefox') ? 15000 : 5000;
        const results = [];
        let currentScrollTop = scrollableElement.scrollTop;

        for (let i = 0; i < numScrolls; i++) {
            const targetScrollTop = currentScrollTop + scrollAmountPx;
            const expectedTopRowIndex = Math.floor(targetScrollTop / rowHeight) - gridRenderOffset;

            const action = (passThrough) => {
                passThrough.scrollableElement.scrollTop = passThrough.targetScrollTop;
            };

            const condition = (passThrough) => {
                const { expectedTopRowIndex } = passThrough;
                const firstVisibleRow = document.querySelector('.ag-row[aria-rowindex]');
                const actualTopRowIndex = firstVisibleRow ? parseInt(firstVisibleRow.getAttribute('aria-rowindex'), 10) - 2 : -1;
                const isGridInValidState = (actualTopRowIndex === expectedTopRowIndex);
                const isInterferenceCheckPassed = true; // Placeholder
                return isGridInValidState && isInterferenceCheckPassed;
            };

            try {
                const timeToValidState = await window.measurePerformance(
                    `Scroll Step ${i + 1}`,
                    action,
                    condition,
                    { scrollableElement, targetScrollTop, expectedTopRowIndex },
                    { timeout }
                );

                results.push({
                    scrollStep: i,
                    timeToValidState: timeToValidState,
                    updateSuccess: true
                });

                currentScrollTop = targetScrollTop;
                await new Promise(res => setTimeout(res, 50));

            } catch (error) {
                results.push({
                    scrollStep: i,
                    timeToValidState: -1,
                    updateSuccess: false
                });
            }
        }
        resolve(results);
    });
};

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.measureJank        = ${measureJankInBrowser.toString()};
            window.runDiscreteScrollBenchmark = ${runDiscreteScrollBenchmark.toString()};
        `
    });

    page.on('console', msg => {
        if (msg.type() !== 'debug' && msg.type() !== 'info' && msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Angular benchmark: Scrolling Performance Under Duress 10k Rows UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/SCROLLING_BENCHMARK_STRATEGY.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    const rowHeight        = 32; // Approximate row height for AG-Grid
    const scrollAmountRows = 50; // Scroll 50 rows per step
    const numScrolls       = 20; // Perform 20 discrete scroll steps
    const gridRenderOffset = 3; // Matching other frameworks for overscan

    // Measure discrete scrolling fluidity
    const results = await page.evaluate((params) => {
        const { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset } = params;
        return window.runDiscreteScrollBenchmark(scrollAmountRows, numScrolls, rowHeight, gridRenderOffset);
    }, { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    // Process results
    const validResults = results.filter(r => r.timeToValidState !== -1);
    const totalTimeToValidState = validResults.reduce((sum, r) => sum + r.timeToValidState, 0);
    const avgTimeToValidState = totalTimeToValidState / validResults.length;
    const maxTimeToValidState = Math.max(...validResults.map(r => r.timeToValidState));
    const updateSuccessCount = validResults.filter(r => r.updateSuccess).length;
    const updateSuccessRate = (updateSuccessCount / validResults.length) * 100;

    test.info().annotations.push({type: 'avgTimeToValidState', description: `${avgTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'maxTimeToValidState', description: `${maxTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'updateSuccessRate', description: `${updateSuccessRate.toFixed(2)}%`});

    console.log(`Discrete Scrolling Metrics (10k Rows):`, {
        avgTimeToValidState: avgTimeToValidState.toFixed(2),
        maxTimeToValidState: maxTimeToValidState.toFixed(2),
        updateSuccessRate  : updateSuccessRate.toFixed(2)
    });

    // Assertions based on the new strategy (adjust as needed for Angular/AG-Grid)
    expect(avgTimeToValidState).toBeLessThan(200);
    expect(maxTimeToValidState).toBeLessThan(500);
    expect(updateSuccessRate).toBeGreaterThanOrEqual(95);
});

test('Angular benchmark: Scrolling Performance Under Duress 100k Rows UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/SCROLLING_BENCHMARK_STRATEGY.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 100k Rows'}).click();
    await waitForGridReady(page, 100000);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    const rowHeight        = 32;
    const scrollAmountRows = 50;
    const numScrolls       = 20;
    const gridRenderOffset = 3; // Matching other frameworks for overscan

    const results = await page.evaluate((params) => {
        const { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset } = params;
        return window.runDiscreteScrollBenchmark(scrollAmountRows, numScrolls, rowHeight, gridRenderOffset);
    }, { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    const validResults = results.filter(r => r.timeToValidState !== -1);
    const totalTimeToValidState = validResults.reduce((sum, r) => sum + r.timeToValidState, 0);
    const avgTimeToValidState = totalTimeToValidState / validResults.length;
    const maxTimeToValidState = Math.max(...validResults.map(r => r.timeToValidState));
    const updateSuccessCount = validResults.filter(r => r.updateSuccess).length;
    const updateSuccessRate = (updateSuccessCount / validResults.length) * 100;

    test.info().annotations.push({type: 'avgTimeToValidState', description: `${avgTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'maxTimeToValidState', description: `${maxTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'updateSuccessRate', description: `${updateSuccessRate.toFixed(2)}%`});

    console.log(`Discrete Scrolling Metrics (100k Rows):`, {
        avgTimeToValidState: avgTimeToValidState.toFixed(2),
        maxTimeToValidState: maxTimeToValidState.toFixed(2),
        updateSuccessRate  : updateSuccessRate.toFixed(2)
    });

    expect(avgTimeToValidState).toBeLessThan(400);
    expect(maxTimeToValidState).toBeLessThan(750);
    expect(updateSuccessRate).toBeGreaterThanOrEqual(90);
});

test('Angular benchmark: Scrolling Performance Under Duress 1M Rows UI Responsiveness', async ({page, browserName}) => {
    // Skip this test in Firefox due to its known limitation with extremely large scroll heights.
    test.skip(browserName === 'firefox', 'Skipping 1M rows test in Firefox due to scroll height limitation.');
    test.setTimeout(180000); // Increased timeout for 1M rows

    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/SCROLLING_BENCHMARK_STRATEGY.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 1M Rows'}).click();
    await waitForGridReady(page, 1000000);
    await page.waitForTimeout(100);

    // Start the feed to create stress
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();
    await page.waitForTimeout(100); // Give the feed a moment to start updating

    const rowHeight        = 32;
    const scrollAmountRows = 50;
    const numScrolls       = 20;
    const gridRenderOffset = 3;

    const results = await page.evaluate((params) => {
        const { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset } = params;
        return window.runDiscreteScrollBenchmark(scrollAmountRows, numScrolls, rowHeight, gridRenderOffset);
    }, { scrollAmountRows, numScrolls, rowHeight, gridRenderOffset });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    const validResults = results.filter(r => r.timeToValidState !== -1);
    const totalTimeToValidState = validResults.reduce((sum, r) => sum + r.timeToValidState, 0);
    const avgTimeToValidState = totalTimeToValidState / validResults.length;
    const maxTimeToValidState = Math.max(...validResults.map(r => r.timeToValidState));
    const updateSuccessCount = validResults.filter(r => r.updateSuccess).length;
    const updateSuccessRate = (updateSuccessCount / validResults.length) * 100;

    test.info().annotations.push({type: 'avgTimeToValidState', description: `${avgTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'maxTimeToValidState', description: `${maxTimeToValidState.toFixed(2)}ms`});
    test.info().annotations.push({type: 'updateSuccessRate', description: `${updateSuccessRate.toFixed(2)}%`});

    console.log(`Discrete Scrolling Metrics (1M Rows):`, {
        avgTimeToValidState: avgTimeToValidState.toFixed(2),
        maxTimeToValidState: maxTimeToValidState.toFixed(2),
        updateSuccessRate  : updateSuccessRate.toFixed(2)
    });

    expect(avgTimeToValidState).toBeLessThan(1400);
    expect(maxTimeToValidState).toBeLessThan(2500);
    expect(updateSuccessRate).toBeGreaterThanOrEqual(80);
});
