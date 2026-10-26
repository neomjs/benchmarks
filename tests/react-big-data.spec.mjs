import {test, expect} from '@playwright/test';
import { measurePerformanceInBrowser, measureUiUpdatePerformanceInBrowser, measureMainThreadProbeInBrowser } from './utils/browser-test-helpers.mjs';

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
            window.measureMainThreadProbe     = ${measureMainThreadProbeInBrowser.toString()};
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

    await page.goto('/');
    await page.waitForFunction(() => {
        const grid = document.querySelector('[role="grid"]');
        return grid && !grid.classList.contains('ag-root-wrapper-loading');
    });

    // Open the controls panel
    await page.locator('button.hamburger-button').click();
    await page.waitForSelector('.controls-panel.open');
});

test('should load the app and display the initial grid data', async ({page}) => {
    await expect(page).toHaveTitle('Vite + React');
    const grid = await page.locator('[role="grid"]');
    await expect(grid).toHaveAttribute('aria-rowcount', '1001');
    await expect(grid).toHaveAttribute('aria-colcount', '50');
});

test('should change the amount of rows', async ({page}) => {
    test.setTimeout(30000);

    await page.waitForSelector('.ag-row[row-index="2"] .ag-cell[col-id="firstname"]');

    const initialNames = await page.evaluate(() => window.getAgGridNames());

    // Step 1: Trigger the UI action and start total duration + main-thread probe measurement
    const totalProbePromise = page.evaluate((initial) => {
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

        return window.measureMainThreadProbe('change-rows-total', action, condition);
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
    const [totalProbe, uiUpdateDuration] = await Promise.all([totalProbePromise, uiUpdateDurationPromise]);
    const totalDuration = totalProbe.tvsMs;

    const totalMetricName = 'Change Rows from 1,000 to 5,000 (Total)';
    const uiUpdateMetricName = 'Change Rows from 1,000 to 5,000 (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [totalMetricName]: totalDuration,
            [uiUpdateMetricName]: uiUpdateDuration,
            'Change Rows from 1,000 to 5,000 (Max RAF Delta)': totalProbe.maxRafDeltaMs,
            ...(totalProbe.longTaskTotalBlockingMs !== null ? {
                'Change Rows from 1,000 to 5,000 (Long Task Block)': totalProbe.longTaskTotalBlockingMs
            } : {})
        })
    });
    console.log(`[Benchmark] ${totalMetricName}: ${totalDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] ${uiUpdateMetricName}: ${uiUpdateDuration !== null ? uiUpdateDuration.toFixed(2) : 'N/A'} ms`);
});

test('should change the amount of columns', async ({page}) => {
    test.setTimeout(30000);

    await page.waitForSelector('.ag-row[row-index="2"] .ag-cell[col-id="firstname"]');

    const initialNames = await page.evaluate(() => window.getAgGridNames());

    // Step 1: Trigger the UI action and start total duration + main-thread probe measurement
    const totalProbePromise = page.evaluate((initial) => {
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

        return window.measureMainThreadProbe('change-cols-total', action, condition);
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
    const [totalProbe, uiUpdateDuration] = await Promise.all([totalProbePromise, uiUpdateDurationPromise]);
    const totalDuration = totalProbe.tvsMs;

    const totalMetricName = 'Change Columns from 50 to 75 (Total)';
    const uiUpdateMetricName = 'Change Columns from 50 to 75 (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [totalMetricName]: totalDuration,
            [uiUpdateMetricName]: uiUpdateDuration,
            'Change Columns from 50 to 75 (Max RAF Delta)': totalProbe.maxRafDeltaMs,
            ...(totalProbe.longTaskTotalBlockingMs !== null ? {
                'Change Columns from 50 to 75 (Long Task Block)': totalProbe.longTaskTotalBlockingMs
            } : {})
        })
    });
    console.log(`[Benchmark] ${totalMetricName}: ${totalDuration.toFixed(2)} ms`);
    console.log(`[Benchmark] ${uiUpdateMetricName}: ${uiUpdateDuration !== null ? uiUpdateDuration.toFixed(2) : 'N/A'} ms`);
});

test('should filter the grid by firstname', async ({page}) => {
    await page.waitForSelector('.ag-row[row-index="0"] .ag-cell[col-id="firstname"]');

    const probes = await page.evaluate(async () => {
        const measureProbe = window.measureMainThreadProbe;

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
            const firstRow = document.querySelector('.ag-row[row-index="0"]');
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
        const firstTarget  = initialFirstCellContent === 'Amanda' ? 'Andrew'  : 'Amanda';
        const secondTarget = initialFirstCellContent === 'John'   ? 'Jessica' : 'John';
        if (initialFirstCellContent === firstTarget || initialFirstCellContent === secondTarget) {
            throw new Error(`Pre-match guard failed: initialFirstCellContent="${initialFirstCellContent}"`);
        }

        // 1. First filter
        const probe1 = await measureProbe('filter-grid-first', () => {
            changeInputValue(firstTarget);
        }, () => {
            return getFirstCellContent() === firstTarget;
        });

        // 2. Second filter
        const probe2 = await measureProbe('filter-grid-second', () => {
            changeInputValue(secondTarget);
        }, () => {
            return getFirstCellContent() === secondTarget;
        });

        // 3. Clear filter
        const probe3 = await measureProbe('filter-grid-clear', () => {
            changeInputValue('');
        }, () => {
            const content = getFirstCellContent();
            return content === initialFirstCellContent;
        });

        return { probe1, probe2, probe3 };
    });

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            'filter-grid (first)'                    : probes.probe1.tvsMs,
            'filter-grid (first) (Max RAF Delta)'    : probes.probe1.maxRafDeltaMs,
            ...(probes.probe1.longTaskTotalBlockingMs !== null ? {
                'filter-grid (first) (Long Task Block)' : probes.probe1.longTaskTotalBlockingMs
            } : {}),
            'filter-grid (second)'                   : probes.probe2.tvsMs,
            'filter-grid (second) (Max RAF Delta)'   : probes.probe2.maxRafDeltaMs,
            ...(probes.probe2.longTaskTotalBlockingMs !== null ? {
                'filter-grid (second) (Long Task Block)' : probes.probe2.longTaskTotalBlockingMs
            } : {}),
            'filter-grid (clear)'                    : probes.probe3.tvsMs,
            'filter-grid (clear) (Max RAF Delta)'    : probes.probe3.maxRafDeltaMs,
            ...(probes.probe3.longTaskTotalBlockingMs !== null ? {
                'filter-grid (clear) (Long Task Block)' : probes.probe3.longTaskTotalBlockingMs
            } : {})
        })
    });

    console.log(`[Benchmark] filter-grid (first): ${probes.probe1.tvsMs.toFixed(2)} ms (maxRafDelta: ${probes.probe1.maxRafDeltaMs.toFixed(2)} ms)`);
    console.log(`[Benchmark] filter-grid (second): ${probes.probe2.tvsMs.toFixed(2)} ms (maxRafDelta: ${probes.probe2.maxRafDeltaMs.toFixed(2)} ms)`);
    console.log(`[Benchmark] filter-grid (clear): ${probes.probe3.tvsMs.toFixed(2)} ms (maxRafDelta: ${probes.probe3.maxRafDeltaMs.toFixed(2)} ms)`);
});

test('should handle large data changes: 100k rows then 200 cols', async ({ page }) => {
    test.setTimeout(30000); // Set timeout to 30 seconds for this specific test
    // 1. Change rows to 100k
    // Step 1: Trigger the UI action and start total duration + main-thread responsiveness measurement
    const rowsProbePromise = page.evaluate(() => {
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
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '100001';
        };
        return window.measureMainThreadProbe('change-rows-100k-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const rowsUiUpdateDurationPromise = page.evaluate(() => {
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '100001';
        };
        return window.measureUiUpdatePerformance('change-rows-100k-ui-update', condition);
    });

    // Step 4: Await both promises
    const [rowsProbe, rowsUiUpdateDuration] = await Promise.all([rowsProbePromise, rowsUiUpdateDurationPromise]);

    const rowsMetricName = 'Change Rows from 1,000 to 100,000 (Total)';
    const rowsUiUpdateMetricName = 'Change Rows from 1,000 to 100,000 (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [rowsMetricName]: rowsProbe.tvsMs,
            [rowsUiUpdateMetricName]: rowsUiUpdateDuration,
            'Change Rows from 1,000 to 100,000 (Max RAF Delta)': rowsProbe.maxRafDeltaMs,
            ...(rowsProbe.longTaskTotalBlockingMs !== null ? {
                'Change Rows from 1,000 to 100,000 (Long Task Block)': rowsProbe.longTaskTotalBlockingMs
            } : {})
        })
    });
    console.log(`[Benchmark] ${rowsMetricName}: ${rowsProbe.tvsMs.toFixed(2)} ms (maxRafDelta: ${rowsProbe.maxRafDeltaMs.toFixed(2)} ms)`);
    console.log(`[Benchmark] ${rowsUiUpdateMetricName}: ${rowsUiUpdateDuration !== null ? rowsUiUpdateDuration.toFixed(2) : 'N/A'} ms`);

    // Ensure the grid is fully updated with 100k rows before proceeding to change columns
    await page.waitForFunction(() => {
        const grid = document.querySelector('[role="grid"]');
        return grid && grid.getAttribute('aria-rowcount') === '100001';
    });

    // Wait for any potential loading overlay to disappear, ensuring the grid is ready
    await page.waitForSelector('.ag-overlay-loading-wrapper', { state: 'hidden' });

    // 2. Change columns to 200
    // Step 1: Trigger the UI action and start total duration + main-thread responsiveness measurement
    const colsProbePromise = page.evaluate(() => {
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
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-colcount') === '200';
        };
        return window.measureMainThreadProbe('change-cols-200-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log from the worker
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const colsUiUpdateDurationPromise = page.evaluate(() => {
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-colcount') === '200';
        };
        return window.measureUiUpdatePerformance('change-cols-200-ui-update', condition);
    });

    // Step 4: Await both promises
    const [colsProbe, colsUiUpdateDuration] = await Promise.all([colsProbePromise, colsUiUpdateDurationPromise]);

    const colsMetricName = 'Change Columns from 50 to 200 (with 100k rows) (Total)';
    const colsUiUpdateMetricName = 'Change Columns from 50 to 200 (with 100k rows) (UI Update)';

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            [colsMetricName]: colsProbe.tvsMs,
            [colsUiUpdateMetricName]: colsUiUpdateDuration,
            'Change Columns from 50 to 200 (with 100k rows) (Max RAF Delta)': colsProbe.maxRafDeltaMs,
            ...(colsProbe.longTaskTotalBlockingMs !== null ? {
                'Change Columns from 50 to 200 (with 100k rows) (Long Task Block)': colsProbe.longTaskTotalBlockingMs
            } : {})
        })
    });
    console.log(`[Benchmark] ${colsMetricName}: ${colsProbe.tvsMs.toFixed(2)} ms (maxRafDelta: ${colsProbe.maxRafDeltaMs.toFixed(2)} ms)`);
    console.log(`[Benchmark] ${colsUiUpdateMetricName}: ${colsUiUpdateDuration !== null ? colsUiUpdateDuration.toFixed(2) : 'N/A'} ms`);
});
