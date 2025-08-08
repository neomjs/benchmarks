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
        const grid            = document.querySelector('[role="grid"]');
        const rowCountCorrect = grid && grid.getAttribute('aria-rowcount') === String(expectedRowCount);
        const firstRowExists  = document.querySelector('#neo-grid-body-1__row-0');
        return rowCountCorrect && firstRowExists;
    }, expectedRowCount, {timeout});
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
        }, 10000);

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

test.beforeEach(async ({page}) => {
    // Inject the measurePerformance function into the browser context's window object
    await page.addInitScript({
        content: `window.measurePerformance = ${measurePerformanceInBrowser.toString()}`
    });

    // Listen for console messages from the browser and print them to Node.js console
    page.on('console', msg => {
        if (msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Neo.mjs benchmark: Create 1k rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            // Use querySelector with a more robust selector
            const button = document.evaluate(`//button[normalize-space(.)='Create 1k rows']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = () => {
            const grid           = document.querySelector('[role="grid"]');
            const rowCount       = grid ? grid.getAttribute('aria-rowcount') : 'null';
            const firstRowExists = !!document.querySelector('#neo-grid-body-1__row-0');

            return grid && rowCount === '1002' && firstRowExists;
        };
        return window.measurePerformance('Create 1k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 1k rows: ${duration}ms`);
    expect(duration).toBeLessThan(3000);
});

test('Neo.mjs benchmark: Create 10k rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 10k rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            const button = document.evaluate(`//button[normalize-space(.)='Create 10k rows']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '10002' && document.querySelector('#neo-grid-body-1__row-0');
        };
        return window.measurePerformance('Create 10k rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 10k rows: ${duration}ms`);
    expect(duration).toBeLessThan(35000);
});

test('Neo.mjs benchmark: Update every 10th row', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            const button = document.evaluate(`//button[normalize-space(.)='Update every 10th row']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = () => {
            const node = document.querySelector('#neo-grid-body-1__row-0__label');
            return node && node.textContent.includes('updated row 1');
        };
        return window.measurePerformance('Update every 10th row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to update 1k rows (every 10th): ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Select row', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            const button = document.evaluate(`//button[normalize-space(.)='Select']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = () => {
            return document.querySelector('[role="row"][aria-selected="true"]');
        };
        return window.measurePerformance('Select row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to select a row: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Swap rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const initialLabels = await page.locator('[role="gridcell"][aria-colindex="2"]').evaluateAll(elements => elements.map(el => el.textContent));

    const duration = await page.evaluate((labels) => {
        const action    = () => {
            const button = document.evaluate(`//button[normalize-space(.)='Swap']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = (initialLabels) => {
            const newLabels = Array.from(document.querySelectorAll('[role="gridcell"][aria-colindex="2"]'), el => el.textContent);
            return newLabels.length > 0 && newLabels.join('') !== initialLabels.join('');
        };
        return window.measurePerformance('Swap rows', action, condition, labels);
    }, initialLabels);

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to swap rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Remove row', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            const button = document.evaluate(`//button[normalize-space(.)='Remove']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '1001';
        };
        return window.measurePerformance('Remove row', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to remove a row: ${duration}ms`);
    expect(duration).toBeLessThan(200);
});

test('Neo.mjs benchmark: Clear rows', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(() => {
        const action    = () => {
            const button = document.evaluate(`//button[normalize-space(.)='Clear']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            button.click();
        };
        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '2';
        };
        return window.measurePerformance('Clear rows', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to clear rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});
