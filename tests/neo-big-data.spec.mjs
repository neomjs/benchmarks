import {test, expect} from '@playwright/test';
import { measurePerformanceInBrowser, measureUiUpdatePerformanceInBrowser } from './utils/browser-test-helpers.mjs';

const getNeoGridNames = () => {
    const names = [];
    for (let i = 0; i < 3; i++) {
        const cell = document.querySelector(`[id^="neo-grid-body-"][id$="__row-${i}"] [id$="__firstname"]`);
        if (cell) names.push(cell.textContent.trim());
    }
    return names;
};

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.getNeoGridNames            = ${getNeoGridNames.toString()};
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

        if (msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });

    await page.goto('/apps/bigdata/');
    await page.waitForFunction(() => document.querySelector('[role="grid"]'));
});

test('should load the app and display the initial grid data', async ({page}) => {
    await expect(page).toHaveTitle('Big Data Neo');
    const grid = await page.locator('[role="grid"]');
    await expect(grid).toHaveAttribute('aria-rowcount', '1001');
    await expect(grid).toHaveAttribute('aria-colcount', '50');
});

test('should change the amount of rows', async ({page}) => {
    await page.waitForSelector('[id^="neo-grid-body-"][id$="__row-2"] [id$="__firstname"]');

    const initialNames = await page.evaluate(() => window.getNeoGridNames());

    // Step 1: Trigger the UI action and start total duration measurement
    const totalDurationPromise = page.evaluate((initial) => {
        const action = () => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Amount Rows');
            const combobox = label.closest('.neo-combobox');
            const trigger = combobox.querySelector('.fa-caret-down');
            trigger.click();

            const pickerObserver = new MutationObserver(() => {
                const picker = document.querySelector('.neo-picker-container');
                if (picker) {
                    const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === '5000');
                    if (item) {
                        pickerObserver.disconnect();
                        item.click();
                    }
                }
            });
            pickerObserver.observe(document.body, { childList: true, subtree: true });
        };

        const condition = () => {
            const currentNames = window.getNeoGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };

        return window.measurePerformance('change-rows-total', action, condition);
    }, initialNames);

    // Step 2: Wait for the "Data creation total time" log
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const uiUpdateDurationPromise = page.evaluate((initial) => {
        const condition = () => {
            const currentNames = window.getNeoGridNames();
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
    await page.waitForSelector('[id^="neo-grid-body-"][id$="__row-2"] [id$="__firstname"]');

    const initialNames = await page.evaluate(() => window.getNeoGridNames());

    // Step 1: Trigger the UI action and start total duration measurement
    const totalDurationPromise = page.evaluate((initial) => {
        const action = () => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Amount Columns');
            const combobox = label.closest('.neo-combobox');
            const trigger = combobox.querySelector('.fa-caret-down');
            trigger.click();

            const pickerObserver = new MutationObserver(() => {
                const picker = document.querySelector('.neo-picker-container');
                if (picker) {
                    const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === '75');
                    if (item) {
                        pickerObserver.disconnect();
                        item.click();
                    }
                }
            });
            pickerObserver.observe(document.body, { childList: true, subtree: true });
        };

        const condition = () => {
            const currentNames = window.getNeoGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };

        return window.measurePerformance('change-cols-total', action, condition);
    }, initialNames);

    // Step 2: Wait for the "Data creation total time" log
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const uiUpdateDurationPromise = page.evaluate((initial) => {
        const condition = () => {
            const currentNames = window.getNeoGridNames();
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
    // Wait for the grid and its first row to be rendered before starting the test.
    await page.waitForSelector('[id^="neo-grid-body-"][id$="__row-0"] [id$="__firstname"]');

    const durations = await page.evaluate(async () => {
        const measure = window.measurePerformance;

        const changeInputValue = (value) => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Firstname');
            const textfield = label.closest('.neo-textfield');
            const input = textfield.querySelector('input');
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const getFirstCellContent = () => {
            const firstRow = document.querySelector('[id^="neo-grid-body-"][id$="__row-0"]');
            if (!firstRow) {
                return null;
            }
            const firstCell = firstRow.querySelector('[id$="__firstname"]');
            if (!firstCell) {
                return null;
            }
            return firstCell.textContent.trim();
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
            return getFirstCellContent() === initialFirstCellContent;
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
    // 1. Change rows to 100k
    // Step 1: Trigger the UI action and start total duration measurement
    const rowsTotalDurationPromise = page.evaluate(() => {
        const action = () => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Amount Rows');
            const combobox = label.closest('.neo-combobox');
            const trigger = combobox.querySelector('.fa-caret-down');
            trigger.click();

            const pickerObserver = new MutationObserver(() => {
                const picker = document.querySelector('.neo-picker-container');
                if (picker) {
                    const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === '100000');
                    if (item) {
                        pickerObserver.disconnect();
                        item.click();
                    }
                }
            });
            pickerObserver.observe(document.body, { childList: true, subtree: true });
        };

        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '100001';
        };
        return window.measurePerformance('change-rows-100k-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log
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

    // 2. Change columns to 200
    // Step 1: Trigger the UI action and start total duration measurement
    const colsTotalDurationPromise = page.evaluate(() => {
        const action = () => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Amount Columns');
            const combobox = label.closest('.neo-combobox');
            const trigger = combobox.querySelector('.fa-caret-down');
            trigger.click();

            const pickerObserver = new MutationObserver(() => {
                const picker = document.querySelector('.neo-picker-container');
                if (picker) {
                    const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === '200');
                    if (item) {
                        pickerObserver.disconnect();
                        item.click();
                    }
                }
            });
            pickerObserver.observe(document.body, { childList: true, subtree: true });
        };

        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-colcount') === '200';
        };
        return window.measurePerformance('change-cols-200-total', action, condition);
    });

    // Step 2: Wait for the "Data creation total time" log
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
