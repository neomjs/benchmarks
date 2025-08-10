// @ts-check
import {test, expect} from '@playwright/test';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * This is used BEFORE the performance measurement begins.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, timeout = 10000) {
    await page.waitForFunction((expectedRowCount) => {
        const grid = document.querySelector('.ag-root-wrapper');
        if (!grid) return false;
        const rowCount = grid.querySelectorAll('.ag-row').length;
        // A simple check for rendered rows is sufficient for AG Grid
        return rowCount > 0 && grid.querySelector('.ag-body-viewport');
    }, expectedRowCount, { timeout });
}

// This function will be injected into the browser context.
const measurePerformanceInBrowser = (testName, action, condition, passThrough, timeout = 30000) => {
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
            resolve(Infinity); // Resolve with Infinity to indicate timeout
        }, timeout);

        const startTime = performance.now();
        try {
            action(passThrough);
        } catch (e) {
            console.error(`Action error in ${testName}:`, e);
            observer.disconnect();
            clearTimeout(timeoutId);
            reject(e);
            return;
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
                for (let i = 1; i < frameTimes.length; i++) {
                    const delta = frameTimes[i] - frameTimes[i - 1];
                    if (delta > 50) {
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

        requestAnimationFrame(frame);
    });
};

const getButtonByText = (text) => {
    return document.evaluate(`//button[normalize-space(.)='${text}']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.measureJank        = ${measureJankInBrowser.toString()};
            window.getButtonByText    = ${getButtonByText.toString()};
            window.consoleLogs        = [];
        `
    });

    page.on('console', msg => {
        page.evaluate(log => {
            if (window.consoleLogs) {
                window.consoleLogs.push(log);
            }
        }, msg.text()).catch(() => {});

        if (msg.type() !== 'debug' && msg.type() !== 'info' && msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Angular benchmark: Create 10k rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('InteractiveBenchmarkAngular');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 10k rows').click();
        };
        const condition = () => {
            const {gridApi} = window;
            return gridApi?.getDisplayedRowCount() === 10000;
        };
        return window.measurePerformance('Create 10k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 10k rows: ${duration}ms`);
    expect(duration).toBeLessThan(30000);
});

test('Angular benchmark: Update every 10th row', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('InteractiveBenchmarkAngular');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Update every 10th row').click();
        };
        const condition = () => {
            const node = document.querySelector('.ag-row:first-child .ag-cell:last-child');
            return node?.textContent.includes('updated');
        };
        return window.measurePerformance('Update every 10th row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to update 10k rows (every 10th): ${duration}ms`);
    expect(duration).toBeLessThan(5000);
});

test('Angular benchmark: Clear rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('InteractiveBenchmarkAngular');
    await page.getByRole('button', {name: 'Create 10k rows'}).click();
    await waitForGridReady(page, 10000);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Clear').click();
        };
        const condition = () => {
            const grid = document.querySelector('.ag-root-wrapper');
            if (!grid) return true;
            const rowCount = grid.querySelectorAll('.ag-row').length;
            return rowCount === 0;
        };
        return window.measurePerformance('Clear rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to clear rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Angular benchmark: Heavy Calculation (Main Thread) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('InteractiveBenchmarkAngular');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    page.getByRole('button', {name: 'Run Heavy Calculation', exact: true}).click();

    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Main Thread.'));
    }, null, {timeout: 60000});

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Main Thread) Jank Metrics:`, jankMetrics);
    expect(jankMetrics.averageFps).toBeLessThan(30);
    expect(jankMetrics.longFrameCount).toBeLessThan(5);
});

test('Angular benchmark: Heavy Calculation (Task Worker) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('InteractiveBenchmarkAngular');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    await page.getByRole('button', {name: 'Run Heavy Calculation (Task Worker)'}).click();

    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Task Worker.'));
    }, null, {timeout: 60000});

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Task Worker) Jank Metrics:`, jankMetrics);
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(50);
    expect(jankMetrics.longFrameCount).toBeLessThan(10);
});
