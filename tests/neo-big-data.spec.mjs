import {test, expect} from '@playwright/test';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} expectedColCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, expectedColCount, timeout = 10000) {
    await page.waitForFunction((args) => {
        const { expectedRowCount, expectedColCount } = args;
        const grid = document.querySelector('[role="grid"]');
        if (!grid) return false;

        const rowCountTotal = grid.getAttribute('aria-rowcount') === String(expectedRowCount);
        const colCountTotal = grid.getAttribute('aria-colcount') === String(expectedColCount);
        const firstRowExists  = document.querySelector('.neo-grid-row');

        return rowCountTotal && colCountTotal && firstRowExists;
    }, { expectedRowCount, expectedColCount }, {timeout});
}

/**
 * Waits for the grid's row count to change to a value other than the initial one.
 * @param {import('@playwright/test').Page} page
 * @param {number} initialRowCount
 * @param {number} [timeout=15000]
 */
async function waitForGridFilter(page, initialRowCount, timeout = 15000) {
    await page.waitForFunction((initialRowCount) => {
        const grid = document.querySelector('[role="grid"]');
        if (!grid) return false;
        const currentRowCount = grid.getAttribute('aria-rowcount');
        return currentRowCount !== String(initialRowCount);
    }, initialRowCount, { timeout });
}

/**
 * Measures the performance of a given action within a single browser context.
 * @param {import('@playwright/test').Page} page
 * @param {Function} actionFn The function to execute that triggers the DOM change.
 * @returns {Promise<number>} The duration of the operation in milliseconds.
 */
async function measurePerformance(page, actionFn) {
    return page.evaluate(async (actionFnString) => {
        const action = new Function(`return (${actionFnString})()`);
        const gridEl = document.querySelector('[role="grid"]');

        if (!gridEl) {
            throw new Error('Grid element not found');
        }

        return new Promise(async (resolve, reject) => {
            const gridObserver = new MutationObserver(() => {
                const time = performance.now() - startTime;
                gridObserver.disconnect();
                resolve(time);
            });

            gridObserver.observe(gridEl, { attributes: true, childList: true, subtree: true });

            const startTime = performance.now();

            try {
                await action();
            } catch (e) {
                reject(e.message);
            }
        });
    }, actionFn.toString());
}

test.describe('Neo BigData App', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/apps/bigdata/');
        await waitForGridReady(page, 1002, 50);
    });

    test('should load the app and display the initial grid data', async ({page}) => {
        await expect(page).toHaveTitle('Big Data Neo');
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-rowcount', '1002');
        await expect(grid).toHaveAttribute('aria-colcount', '50');
    });

    test('should change the amount of rows', async ({page}) => {
        const duration = await measurePerformance(page, () => {
            return new Promise(resolve => {
                const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
                const label = findLabel('Amount Rows');
                const combobox = label.closest('.neo-combobox');
                const trigger = combobox.querySelector('.fa-caret-down');

                const pickerObserver = new MutationObserver(() => {
                    const picker = document.querySelector('.neo-picker-container');
                    if (picker) {
                        const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === '5000');
                        if (item) {
                            pickerObserver.disconnect();
                            item.click();
                            resolve();
                        }
                    }
                });
                pickerObserver.observe(document.body, { childList: true, subtree: true });
                trigger.click();
            });
        });

        console.log(`[Benchmark] change-rows: ${duration.toFixed(2)} ms`);
        expect(duration).toBeGreaterThan(0);

        await waitForGridReady(page, 5002, 50);
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-rowcount', '5002');
    });

    test('should change the amount of columns', async ({page}) => {
        const duration = await measurePerformance(page, () => {
            return new Promise(resolve => {
                const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
                const label = findLabel('Amount Columns');
                const combobox = label.closest('.neo-combobox');
                const trigger = combobox.querySelector('.fa-caret-down');

                const pickerObserver = new MutationObserver(() => {
                    const picker = document.querySelector('.neo-picker-container');
                    if (picker) {
                        const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === '75');
                        if (item) {
                            pickerObserver.disconnect();
                            item.click();
                            resolve();
                        }
                    }
                });
                pickerObserver.observe(document.body, { childList: true, subtree: true });
                trigger.click();
            });
        });

        console.log(`[Benchmark] change-cols: ${duration.toFixed(2)} ms`);
        expect(duration).toBeGreaterThan(0);

        await waitForGridReady(page, 1002, 75);
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-colcount', '75');
    });

    test('should filter the grid by firstname', async ({page}) => {
        const initialRowCount = await page.locator('[role="grid"]').getAttribute('aria-rowcount');

        const duration = await measurePerformance(page, () => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Firstname');
            const textfield = label.closest('.neo-textfield');
            const input = textfield.querySelector('input');
            input.value = 'Amanda';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        console.log(`[Benchmark] filter-grid: ${duration.toFixed(2)} ms`);
        expect(duration).toBeGreaterThan(0);

        await waitForGridFilter(page, parseInt(initialRowCount));
        const grid = await page.locator('[role="grid"]');
        const currentRowCount = await grid.getAttribute('aria-rowcount');
        expect(parseInt(currentRowCount)).toBeLessThan(parseInt(initialRowCount));
        expect(parseInt(currentRowCount)).toBeGreaterThan(0);
    });
});