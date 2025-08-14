import {test, expect} from '@playwright/test';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, timeout = 10000) {
    await page.waitForFunction((expectedRowCount) => {
        const grid            = document.querySelector('[role="grid"]');
        const rowCountCorrect = grid && grid.getAttribute('aria-rowcount') === String(expectedRowCount);
        const firstRowExists  = document.querySelector('.neo-grid-row');
        return rowCountCorrect && firstRowExists;
    }, expectedRowCount, {timeout});
}

test.describe('Neo BigData App', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('apps/bigData/neo/apps/bigdata/index.html');
    });

    test('should load the app and display the initial grid data', async ({page}) => {
        // Check the page title
        await expect(page).toHaveTitle('Big Data Neo');

        // Wait for the grid to be ready
        await waitForGridReady(page, 1000);

        // Confirm the number of columns
        const columns = await page.locator('.neo-grid-header-cell').count();
        // 50 data columns + 1 index column
        expect(columns).toBe(51);
    });
});