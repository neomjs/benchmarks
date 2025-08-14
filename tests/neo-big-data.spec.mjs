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

        const rowCountCorrect = grid.getAttribute('aria-rowcount') === String(expectedRowCount);
        const colCountCorrect = grid.getAttribute('aria-colcount') === String(expectedColCount);
        const firstRowExists  = document.querySelector('#neo-grid-body-1__row-0');

        return rowCountCorrect && colCountCorrect && firstRowExists;
    }, { expectedRowCount, expectedColCount }, {timeout});
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
        // We can add a final expect for good measure.
        const grid = await page.locator('[role="grid"]');
        await expect(grid).toHaveAttribute('aria-rowcount', '1002');
        await expect(grid).toHaveAttribute('aria-colcount', '50');
    });
});
