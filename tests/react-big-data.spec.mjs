import {test, expect} from '@playwright/test';

const measurePerformanceInBrowser = (testName, action, condition) => {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
            try {
                if (condition()) {
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
            action();
        } catch (e) {
            console.error(`Action error in ${testName}:`, e);
            observer.disconnect();
            clearTimeout(timeoutId);
            reject(e);
            return;
        }

        try {
            if (condition()) {
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

const measureUiUpdatePerformanceInBrowser = (testName, condition) => {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
            try {
                if (condition()) {
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
            reject(new Error(`UI update benchmark timed out for "${testName}".`));
        }, 30000);

        const startTime = performance.now(); // Measurement starts here
        // The action (store.add) is assumed to have just happened

        try {
            if (condition()) {
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

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.measureUiUpdatePerformance = ${measureUiUpdatePerformanceInBrowser.toString()};
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

    await page.goto('http://localhost:5174/');
    await page.waitForFunction(() => {
        const grid = document.querySelector('[role="treegrid"]');
        return grid && !grid.classList.contains('ag-root-wrapper-loading');
    });

    // Open the controls panel
    await page.locator('button.hamburger-button').click();
    await page.waitForSelector('.controls-panel.open');
});

test('should load the app and display the initial grid data', async ({page}) => {
    await expect(page).toHaveTitle('Vite + React');
    const grid = await page.locator('[role="treegrid"]');
    await expect(grid).toHaveAttribute('aria-rowcount', '1001');
    await expect(grid).toHaveAttribute('aria-colcount', '50');
});

test('should change the amount of rows', async ({page}) => {
    test.setTimeout(30000);
    // Step 1: Trigger the UI action and start total duration measurement
    const totalDurationPromise = page.evaluate(() => {
        const action = () => {
            console.log('[ACTION] Looking for label: Amount Rows');
            const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Amount Rows'));
            if (!label) {
                console.error('[ACTION] ERROR: Label "Amount Rows" not found!');
                return;
            }
            console.log('[ACTION] Label "Amount Rows" found.');
            const selectElement = label.nextElementSibling;
            if (!selectElement) {
                console.error('[ACTION] ERROR: selectElement not found!');
                return;
            }

            selectElement.value = '5000';
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[ACTION] Event dispatched for "Amount Rows".');
        };

        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-rowcount') === '5001';
        };

        return window.measurePerformance('change-rows-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const uiUpdateDurationPromise = page.evaluate(() => {
        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-rowcount') === '5001';
        };
        return window.measureUiUpdatePerformance('change-rows-ui-update', condition);
    });

    // Step 4: Await both promises
    const [totalDuration, uiUpdateDuration] = await Promise.all([totalDurationPromise, uiUpdateDurationPromise]);

    const totalMetricName = 'Change Rows from 1,000 to 5,000 (Total)';
    const uiUpdateMetricName = 'Change Rows from 1,000 to 5,000 (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [totalMetricName]: totalDuration,
            [uiUpdateMetricName]: uiUpdateDuration
        })
    });
    console.log(`[Benchmark] ${totalMetricName}: ${totalDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] ${uiUpdateMetricName}: ${uiUpdateDuration !== null ? uiUpdateDuration.toFixed(2) : 'N/A'} ms`);
});

test('should change the amount of columns', async ({page}) => {
    test.setTimeout(30000);
    // Step 1: Trigger the UI action and start total duration measurement
    const totalDurationPromise = page.evaluate(() => {
        const action = () => {
            console.log('[ACTION] Looking for label: Amount Columns');
            const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Amount Columns'));
            if (!label) {
                console.error('[ACTION] ERROR: Label "Amount Columns" not found!');
                return;
            }
            console.log('[ACTION] Label "Amount Columns" found.');
            const selectElement = label.nextElementSibling;
            if (!selectElement) {
                console.error('[ACTION] ERROR: selectElement not found!');
                return;
            }

            selectElement.value = '75';
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-colcount') === '75';
        };

        return window.measurePerformance('change-cols-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const uiUpdateDurationPromise = page.evaluate(() => {
        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-colcount') === '75';
        };
        return window.measureUiUpdatePerformance('change-cols-ui-update', condition);
    });

    // Step 4: Await both promises
    const [totalDuration, uiUpdateDuration] = await Promise.all([totalDurationPromise, uiUpdateDurationPromise]);

    const totalMetricName = 'Change Columns from 50 to 75 (Total)';
    const uiUpdateMetricName = 'Change Columns from 50 to 75 (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [totalMetricName]: totalDuration,
            [uiUpdateMetricName]: uiUpdateDuration
        })
    });
    console.log(`[Benchmark] ${totalMetricName}: ${totalDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] ${uiUpdateMetricName}: ${uiUpdateDuration !== null ? uiUpdateDuration.toFixed(2) : 'N/A'} ms`);
});

test('should filter the grid by firstname', async ({page}) => {
    const duration = await page.evaluate(() => {
        const action = () => {
            const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Firstname'));
            const inputElement = label.nextElementSibling;

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            ).set;
            nativeInputValueSetter.call(inputElement, 'Amanda');

            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        };

        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            // Assuming initial row count is 1001, and filtering will result in fewer rows.
            return grid && grid.getAttribute('aria-rowcount') !== '1001';
        };

        return window.measurePerformance('filter-grid', action, condition);
    });

    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'filter-grid': duration }) });
    console.log(`[Benchmark] filter-grid: ${duration.toFixed(2)} ms`);
});

test('should handle large data changes: 100k rows then 200 cols', async ({ page }) => {
    test.setTimeout(30000); // Set timeout to 30 seconds for this specific test
    // 1. Change rows to 100k
    // Step 1: Trigger the UI action and start total duration measurement
    const rowsTotalDurationPromise = page.evaluate(() => {
        const action = () => {
            console.log('[ACTION] Looking for label: Amount Rows');
            const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Amount Rows'));
            if (!label) {
                console.error('[ACTION] ERROR: Label "Amount Rows" not found!');
                return;
            }

            const selectElement = label.nextElementSibling;
            if (!selectElement) {
                console.error('[ACTION] ERROR: selectElement not found!');
                return;
            }

            selectElement.value = '100000';
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-rowcount') === '100001';
        };
        return window.measurePerformance('change-rows-100k-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const rowsUiUpdateDurationPromise = page.evaluate(() => {
        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-rowcount') === '100001';
        };
        return window.measureUiUpdatePerformance('change-rows-100k-ui-update', condition);
    });

    // Step 4: Await both promises
    const [rowsTotalDuration, rowsUiUpdateDuration] = await Promise.all([rowsTotalDurationPromise, rowsUiUpdateDurationPromise]);

    const rowsMetricName = 'Change Rows from 1,000 to 100,000 (Total)';
    const rowsUiUpdateMetricName = 'Change Rows from 1,000 to 100,000 (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [rowsMetricName]: rowsTotalDuration,
            [rowsUiUpdateMetricName]: rowsUiUpdateDuration
        })
    });
    console.log(`[Benchmark] ${rowsMetricName}: ${rowsTotalDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] ${rowsUiUpdateMetricName}: ${rowsUiUpdateDuration !== null ? rowsUiUpdateDuration.toFixed(2) : 'N/A'} ms`);

    // Ensure the grid is fully updated with 100k rows before proceeding to change columns
    await page.waitForFunction(() => {
        const grid = document.querySelector('[role="treegrid"]');
        return grid && grid.getAttribute('aria-rowcount') === '100001';
    });

    // Wait for any potential loading overlay to disappear, ensuring the grid is ready
    await page.waitForSelector('.ag-overlay-loading-wrapper', { state: 'hidden' });

    // 2. Change columns to 200
    // Step 1: Trigger the UI action and start total duration measurement
    const colsTotalDurationPromise = page.evaluate(() => {
        const action = () => {
            const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Amount Columns'));
            if (!label) {
                console.error('[ACTION] ERROR: Label "Amount Columns" not found!');
                return;
            }

            const selectElement = label.nextElementSibling;
            if (!selectElement) {
                console.error('[ACTION] ERROR: selectElement not found!');
                return;
            }

            selectElement.value = '200';
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-colcount') === '200';
        };
        return window.measurePerformance('change-cols-200-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const colsUiUpdateDurationPromise = page.evaluate(() => {
        const condition = () => {
            const grid = document.querySelector('[role="treegrid"]');
            return grid && grid.getAttribute('aria-colcount') === '200';
        };
        return window.measureUiUpdatePerformance('change-cols-200-ui-update', condition);
    });

    // Step 4: Await both promises
    const [colsTotalDuration, colsUiUpdateDuration] = await Promise.all([colsTotalDurationPromise, colsUiUpdateDurationPromise]);

    const colsMetricName = 'Change Columns from 50 to 200 (with 100k rows) (Total)';
    const colsUiUpdateMetricName = 'Change Columns from 50 to 200 (with 100k rows) (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [colsMetricName]: colsTotalDuration,
            [colsUiUpdateMetricName]: colsUiUpdateDuration
        })
    });
    console.log(`[Benchmark] ${colsMetricName}: ${colsTotalDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] ${colsUiUpdateMetricName}: ${colsUiUpdateDuration !== null ? colsUiUpdateDuration.toFixed(2) : 'N/A'} ms`);
});
