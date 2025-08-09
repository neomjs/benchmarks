// @ts-check
import {test, expect} from '@playwright/test';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * This is used BEFORE the performance measurement begins.
 * It checks for both the expected row count and the presence of the first row element.
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

// This function will be injected into the browser context.
// It must be defined outside of any test or beforeEach block to be accessible for injection.
const measurePerformanceInBrowser = (testName, action, condition, passThrough) => {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
            try {
                if (condition(passThrough)) {
                    const endTime = performance.now();
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(endTime - startTime);
                }
            } catch (e) {
                observer.disconnect();
                clearTimeout(timeoutId);
                console.error(`Condition error in ${testName}:`, e);
                reject(e);
            }
        });

        observer.observe(document.body, {attributes: true, childList: true, subtree: true});

        const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Benchmark timed out for "${testName}".`));
        }, 10000);

        const startTime = performance.now();
        try {
            action(passThrough);
        } catch (e) {
            console.error(`Action error in ${testName}:`, e);
            observer.disconnect();
            clearTimeout(timeoutId);
            reject(e);
            return; // Stop further execution if action fails synchronously
        }

        try {
            if (condition(passThrough)) {
                const endTime = performance.now();
                observer.disconnect();
                clearTimeout(timeoutId);
                resolve(endTime - startTime);
            }
        } catch (e) {
            observer.disconnect();
            clearTimeout(timeoutId);
            console.error(`Initial condition check error in ${testName}:`, e);
            reject(e);
        }
    });
};

/**
 * Measures UI jank by collecting frame timings over a given duration.
 * This function will be injected into the browser context.
 * @param {number} duration - The duration in milliseconds to measure jank.
 * @returns {Promise<{averageFps: number, frameCount: number, longFrameCount: number, totalTime: number}>}
 */
const measureJankInBrowser = (duration) => {
    return new Promise(resolve => {
        const frameTimes = [];
        let longFrameCount = 0;
        let startTime;

        function frame(time) {
            if (startTime === undefined) {
                startTime = time;
            }

            const elapsed = time - startTime;
            frameTimes.push(time);

            if (elapsed < duration) {
                requestAnimationFrame(frame);
            } else {
                // Start from the second frame to calculate deltas
                for (let i = 1; i < frameTimes.length; i++) {
                    const delta = frameTimes[i] - frameTimes[i - 1];
                    // A long frame is arbitrarily defined as > 50ms (~20 FPS threshold)
                    // This indicates significant main-thread blocking.
                    if (delta > 50) {
                        longFrameCount++;
                    }
                }

                const totalTime = frameTimes[frameTimes.length - 1] - frameTimes[0];
                // We have frameTimes.length - 1 frame intervals
                const averageFps = totalTime > 0 ? (frameTimes.length - 1) / (totalTime / 1000) : 0;

                resolve({
                    averageFps: Math.round(averageFps),
                    frameCount: frameTimes.length,
                    longFrameCount,
                    totalTime: Math.round(totalTime)
                });
            }
        }

        requestAnimationFrame(frame);
    });
};

const getButtonByText = (text) => {
    return document.evaluate(`//button[normalize-space(.)='${text}']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

test.beforeEach(async ({page}) => {
    // Inject the measurement functions into the browser context's window object
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.measureJank = ${measureJankInBrowser.toString()};
            window.getButtonByText = ${getButtonByText.toString()};
            window.consoleLogs = [];
        `
    });

    // Listen for console messages from the browser and print them to Node.js console
    page.on('console', msg => {
        // Also push to an array in the browser context for later inspection
        page.evaluate(log => {
            if (window.consoleLogs) {
                window.consoleLogs.push(log);
            }
        }, msg.text());

        if (msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Neo.mjs benchmark: Create 1k rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 1k rows').click();
        };
        const condition = () => {
            const grid           = document.querySelector('[role="grid"]');
            const rowCount       = grid ? grid.getAttribute('aria-rowcount') : 'null';
            const firstRowExists = !!document.querySelector('#neo-grid-body-1__row-0');

            return grid && rowCount === '1002' && firstRowExists;
        };
        return window.measurePerformance('Create 1k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 1k rows: ${duration}ms`);
    expect(duration).toBeLessThan(3000);
});

test('Neo.mjs benchmark: Create 10k rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 10k rows').click();
        };
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '10002' && document.querySelector('#neo-grid-body-1__row-0');
        };
        return window.measurePerformance('Create 10k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 10k rows: ${duration}ms`);
    expect(duration).toBeLessThan(35000);
});

test('Neo.mjs benchmark: Update every 10th row', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Update every 10th row').click();
        };
        const condition = () => {
            const node = document.querySelector('#neo-grid-body-1__row-0__label');
            return node && node.textContent.includes('updated row 1');
        };
        return window.measurePerformance('Update every 10th row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to update 1k rows (every 10th): ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Select row', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Select').click();
        };
        const condition = () => {
            return document.querySelector('[role="row"][aria-selected="true"]');
        };
        return window.measurePerformance('Select row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to select a row: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Swap rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const initialLabels = await page.locator('[role="gridcell"][aria-colindex="2"]').evaluateAll(elements => elements.map(el => el.textContent));

    const duration = await page.evaluate((labels) => {
        const action    = () => {
            window.getButtonByText('Swap').click();
        };
        const condition = (initialLabels) => {
            const newLabels = Array.from(document.querySelectorAll('[role="gridcell"][aria-colindex="2"]'), el => el.textContent);
            return newLabels.length > 0 && newLabels.join('') !== initialLabels.join('');
        };
        return window.measurePerformance('Swap rows', action, condition, labels);
    }, initialLabels);

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to swap rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Remove row', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Remove').click();
        };
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '1001';
        };
        return window.measurePerformance('Remove row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to remove a row: ${duration}ms`);
    expect(duration).toBeLessThan(200);
});

test('Neo.mjs benchmark: Clear rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Clear').click();
        };
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '2';
        };
        return window.measurePerformance('Clear rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to clear rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Real-time Feed UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    // Start the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    // Measure jank for 4 seconds while the feed is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Real-time Feed (4s active) Jank Metrics:`, jankMetrics);

    // Assert that the UI remained responsive. For Neo.mjs, we expect near-perfect frame rates.
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(55);
    expect(jankMetrics.longFrameCount).toBeLessThan(5);
});

test('Neo.mjs benchmark: Heavy Calculation (App Worker) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).waitFor(); // Ensure page is ready

    // Start the heavy calculation
    await page.getByRole('button', {name: 'Run Heavy Calculation', exact: true}).click();

    // Measure jank for 4 seconds while the calculation is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    // Wait for the calculation to finish to ensure the test doesn't end prematurely
    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in App Worker.'));
    }, null, {timeout: 10000});


    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (App Worker) Jank Metrics:`, jankMetrics);

    // Assert that the UI remained responsive. Since the calculation is in a worker, FPS should be high.
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(55);
    expect(jankMetrics.longFrameCount).toBeLessThan(5);
});

test('Neo.mjs benchmark: Heavy Calculation (Task Worker) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).waitFor();

    // Start the heavy calculation
    await page.getByRole('button', {name: 'Run Heavy Calculation (Task Worker)'}).click();

    // Measure jank for 4 seconds while the calculation is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    // Wait for the calculation to finish
    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Task Worker.'));
    }, null, {timeout: 10000});

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Task Worker) Jank Metrics:`, jankMetrics);

    // Assert that the UI remained responsive. Since the calculation is in a worker, FPS should be high.
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(55);
    expect(jankMetrics.longFrameCount).toBeLessThan(5);
});