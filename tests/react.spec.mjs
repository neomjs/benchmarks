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
        const table = document.querySelector('table[role="grid"]');
        if (!table) return false;
        const rowCount = parseInt(table.getAttribute('aria-rowcount'), 10);
        // Also check if there's at least one row rendered in the body,
        // as aria-rowcount might be set before the virtualizer has rendered anything.
        const firstRowExists = table.querySelector('tbody tr');
        return rowCount === expectedRowCount && firstRowExists;
    }, expectedRowCount, { timeout });
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
        }, 30000);

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
            window.measureJank        = ${measureJankInBrowser.toString()};
            window.getButtonByText    = ${getButtonByText.toString()};
            window.consoleLogs        = [];
        `
    });

    // Listen for console messages from the browser and print them to Node.js console
    page.on('console', msg => {
        // Also push to an array in the browser context for later inspection
        page.evaluate(log => {
            if (window.consoleLogs) {
                window.consoleLogs.push(log);
            }
        }, msg.text()).catch(() => {
            // This can happen if the test ends and the page is closed
            // before the console message is processed. It's safe to ignore.
        });

        if (msg.type() !== 'debug' && msg.type() !== 'info' && msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('React benchmark: Create 10k rows', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 10k rows').click();
        };
        const condition = () => {
            const table = document.querySelector('table[role="grid"]');
            if (!table) return false;
            const rowCount = parseInt(table.getAttribute('aria-rowcount'), 10);
            if (rowCount !== 10000) return false;
            const firstRow = table.querySelector('tbody tr:first-child td:first-child');
            return firstRow && firstRow.textContent === '1';
        };
        return window.measurePerformance('Create 10k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 10k rows: ${duration}ms`);
    expect(duration).toBeLessThan(30000);
});

test('React benchmark: Create 100k rows', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 100k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 100k rows').click();
        };
        const condition = () => {
            const table = document.querySelector('table[role="grid"]');
            if (!table) return false;
            const rowCount = parseInt(table.getAttribute('aria-rowcount'), 10);
            if (rowCount !== 100000) return false;
            const firstRow = table.querySelector('tbody tr:first-child td:first-child');
            return firstRow && firstRow.textContent === '1';
        };
        return window.measurePerformance('Create 100k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 100k rows: ${duration}ms`);
    expect(duration).toBeLessThan(350000);
});

test('React benchmark: Update every 10th row', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Update every 10th row').click();
        };
        const condition = () => {
            const node = document.querySelector('tbody tr:first-child td:last-child');
            return node && node.textContent.includes('updated');
        };
        return window.measurePerformance('Update every 10th row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to update 10k rows (every 10th): ${duration}ms`);
    expect(duration).toBeLessThan(5000);
});

test('React benchmark: Select row', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Select').click();
        };
        const condition = () => {
            return document.querySelector('tbody tr.selected');
        };
        return window.measurePerformance('Select row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to select a row: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('React benchmark: Swap rows', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const initialLabels = await page.locator('tbody tr td:last-child').evaluateAll(elements => elements.map(el => el.textContent));

    const duration = await page.evaluate((labels) => {
        const action    = () => {
            window.getButtonByText('Swap').click();
        };
        const condition = (initialLabels) => {
            const newLabels = Array.from(document.querySelectorAll('tbody tr td:last-child'), el => el.textContent);
            return newLabels.length > 0 && newLabels.join('') !== initialLabels.join('');
        };
        return window.measurePerformance('Swap rows', action, condition, labels);
    }, initialLabels);

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to swap rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('React benchmark: Remove row', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Remove').click();
        };
        const condition = () => {
            const table = document.querySelector('table[role="grid"]');
            if (!table) return false;
            const rowCount = parseInt(table.getAttribute('aria-rowcount'), 10);
            return rowCount === 9999;
        };
        return window.measurePerformance('Remove row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to remove a row: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('React benchmark: Clear rows', async ({page}) => {
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Clear').click();
        };
        const condition = () => {
            const table = document.querySelector('table[role="grid"]');
            if (!table) return true; // No table means it's cleared
            const rowCount = parseInt(table.getAttribute('aria-rowcount'), 10);
            return rowCount === 0;
        };
        return window.measurePerformance('Clear rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to clear rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('React benchmark: Real-time Feed UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

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

    // Assert that the UI remained responsive.
    // NOTE: The expectation for React is lower than for Neo.mjs,
    // as the main thread is busy with state updates and re-renders.
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(5);
    expect(jankMetrics.longFrameCount).toBeLessThan(40);
});

test('React benchmark: Heavy Calculation (Main Thread) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor(); // Ensure page is ready

    // Start the heavy calculation (don't await, so we can measure jank during execution)
    page.getByRole('button', {name: 'Run Heavy Calculation', exact: true}).click();

    // Measure jank for 4 seconds while the calculation is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    // Wait for the calculation to finish to ensure the test doesn't end prematurely
    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Main Thread.'));
    }, null, {timeout: 60000});


    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Main Thread) Jank Metrics:`, jankMetrics);

    // Assert that the UI was NOT responsive, as the main thread was blocked by the heavy calculation.
    expect(jankMetrics.averageFps).toBeLessThan(40); // Expect less than 40 FPS
    expect(jankMetrics.longFrameCount).toBeLessThan(5); // Expect very few long frames
});

test('React benchmark: Heavy Calculation (Task Worker) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:5174/');
    await expect(page).toHaveTitle('Vite + React');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    // Start the heavy calculation
    await page.getByRole('button', {name: 'Run Heavy Calculation (Task Worker)'}).click();

    // Measure jank for 4 seconds while the calculation is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    // Wait for the calculation to finish
    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Task Worker.'));
    }, null, {timeout: 60000});

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Task Worker) Jank Metrics:`, jankMetrics);

    // Assert that the UI remained responsive.
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(35);
    expect(jankMetrics.longFrameCount).toBeLessThan(10);
});
