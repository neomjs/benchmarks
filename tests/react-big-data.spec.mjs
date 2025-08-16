import {test, expect} from '@playwright/test';
import { measurePerformanceInBrowser, measureUiUpdatePerformanceInBrowser } from './utils/browser-test-helpers.mjs';

const getAgGridNames = () => {
    const names = [];
    for (let i = 0; i < 3; i++) {
        const cell = document.querySelector(`.ag-row[row-index="${i}"] .ag-cell[col-id="firstname"]`);
        if (cell) names.push(cell.textContent.trim());
    }
    return names;
};

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.getAgGridNames             = ${getAgGridNames.toString()};
            window.measurePerformance         = ${measurePerformanceInBrowser.toString()};
            window.measureUiUpdatePerformance = ${measureUiUpdatePerformanceInBrowser.toString()};
            window.consoleLogs                = [];
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

    await page.waitForSelector('.ag-row[row-index="2"] .ag-cell[col-id="firstname"]');

    const initialNames = await page.evaluate(() => window.getAgGridNames());

    // Step 1: Trigger the UI action and start total duration measurement
    const totalDurationPromise = page.evaluate((initial) => {
        const action = () => {
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

            selectElement.value = '5000';
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const condition = () => {
            const currentNames = window.getAgGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };

        return window.measurePerformance('change-rows-total', action, condition);
    }, initialNames);

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const uiUpdateDurationPromise = page.evaluate((initial) => {
        const condition = () => {
            const currentNames = window.getAgGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };
        return window.measureUiUpdatePerformance('change-rows-ui-update', condition);
    }, initialNames);

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

    await page.waitForSelector('.ag-row[row-index="2"] .ag-cell[col-id="firstname"]');

    const initialNames = await page.evaluate(() => window.getAgGridNames());

    // Step 1: Trigger the UI action and start total duration measurement
    const totalDurationPromise = page.evaluate((initial) => {
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

            selectElement.value = '75';
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const condition = () => {
            const currentNames = window.getAgGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };

        return window.measurePerformance('change-cols-total', action, condition);
    }, initialNames);

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const uiUpdateDurationPromise = page.evaluate((initial) => {
        const condition = () => {
            const currentNames = window.getAgGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };
        return window.measureUiUpdatePerformance('change-cols-ui-update', condition);
    }, initialNames);


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
    const durations = await page.evaluate(async () => {
        const measure = window.measurePerformance;

        const changeInputValue = (value) => {
            const label = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Firstname'));
            const inputElement = label.nextElementSibling;

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            ).set;
            nativeInputValueSetter.call(inputElement, value);

            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        };

        const getFirstCellContent = () => {
            // More robust selector for the first visible row
            const firstRow = document.querySelector('.ag-body-viewport .ag-row[row-index="0"]');
            if (!firstRow) {
                console.log('getFirstCellContent: First row not found.');
                return null;
            }

            const firstCell = firstRow.querySelector('.ag-cell[col-id="firstname"]');
            if (!firstCell) {
                console.log('getFirstCellContent: First cell with col-id="firstname" not found.');
                return null;
            }
            const content = firstCell.textContent.trim();
            return content;
        };

        const initialFirstCellContent = getFirstCellContent();

        // 1. First filter
        const duration1 = await measure('filter-grid-first', () => {
            changeInputValue('Amanda');
        }, () => {
            return getFirstCellContent() === 'Amanda';
        });

        // 2. Second filter
        const duration2 = await measure('filter-grid-second', () => {
            changeInputValue('John');
        }, () => {
            return getFirstCellContent() === 'John';
        });

        // 3. Clear filter
        const duration3 = await measure('filter-grid-clear', () => {
            changeInputValue('');
        }, () => {
            const content = getFirstCellContent();
            return content === initialFirstCellContent;
        });

        return { duration1, duration2, duration3 };
    });

    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'filter-grid (first)': durations.duration1 }) });
    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'filter-grid (second)': durations.duration2 }) });
    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'filter-grid (clear)': durations.duration3 }) });

    console.log(`[Benchmark] filter-grid (first): ${durations.duration1.toFixed(2)} ms`);
    console.log(`[Benchmark] filter-grid (second): ${durations.duration2.toFixed(2)} ms`);
    console.log(`[Benchmark] filter-grid (clear): ${durations.duration3.toFixed(2)} ms`);
});

test('should handle large data changes: 100k rows then 200 cols', async ({ page }) => {
    test.setTimeout(30000); // Set timeout to 30 seconds for this specific test
    // 1. Change rows to 100k
    // Step 1: Trigger the UI action and start total duration measurement
    const rowsTotalDurationPromise = page.evaluate(() => {
        const action = () => {
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
