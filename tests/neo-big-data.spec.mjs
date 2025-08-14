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

test.beforeEach(async ({page}) => {
    // Inject the measurement functions into the browser context's window object
    await page.addInitScript({
        content: `
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
        }, msg.text()).catch(() => {
            // This can happen if the test ends and the page is closed
            // before the console message is processed. It's safe to ignore.
        });

        if (msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test.describe('Neo BigData App', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/apps/bigdata/');
    });

    test('should load the app and display the initial grid data', async ({page}) => {
        // Check the page title
        await expect(page).toHaveTitle('Big Data Neo');

        // Wait for the grid to be ready with 1002 rows (1-based index, plus column headers) and 50 columns
        await waitForGridReady(page, 1002, 50);

        // At this point, the core conditions are met, so we can consider the test passed.
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-rowcount', '1002');
        await expect(grid).toHaveAttribute('aria-colcount', '50');
    });

    test('should change the amount of rows', async ({page}) => {
        await waitForGridReady(page, 1002, 50);

        // Open the controls panel
        await page.locator('button.controls-container-button').click();
        await page.waitForTimeout(500); // Wait for animation

        // Click the combo box to open the list, then click the item.
        await page.locator('label:has-text("Amount Rows")').click();
        await page.getByRole('option', { name: '5000', exact: true }).click();

        await waitForGridReady(page, 5002, 50);
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-rowcount', '5002');
    });

    test('should change the amount of columns', async ({page}) => {
        await waitForGridReady(page, 1002, 50);

        // Open the controls panel
        await page.locator('button.controls-container-button').click();
        await page.waitForTimeout(500); // Wait for animation

        await page.locator('label:has-text("Amount Columns")').click();
        await page.locator('.neo-list-item', { hasText: '75' }).click();

        await waitForGridReady(page, 1002, 75);
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-colcount', '75');
    });

    test('should filter the grid by firstname', async ({page}) => {
        await waitForGridReady(page, 1002, 50);

        // Open the controls panel
        await page.locator('button.controls-container-button').click();
        await page.waitForTimeout(500); // Wait for animation

        await page.locator('input[name="firstname"]').fill('Amanda');

        // Wait for the filter to be applied, which will change the row count
        await waitForGridFilter(page, 1002);

        const grid = await page.locator('[role="grid"]');
        const currentRowCount = await grid.getAttribute('aria-rowcount');
        expect(parseInt(currentRowCount)).toBeLessThan(1002);
        expect(parseInt(currentRowCount)).toBeGreaterThan(0);
    });
});
