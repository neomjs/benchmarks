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

const getButtonByText = (text) => {
    return document.evaluate(`//button[normalize-space(.)='${text}']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

test.beforeEach(async ({page}) => {
    // Inject the measurePerformance function into the browser context's window object
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.getButtonByText = ${getButtonByText.toString()};
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
        }, msg.text());

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
            window.getButtonByText('Create 1k rows').click();
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
            window.getButtonByText('Create 10k rows').click();
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
            window.getButtonByText('Update every 10th row').click();
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
            window.getButtonByText('Select').click();
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
            window.getButtonByText('Swap').click();
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
            window.getButtonByText('Remove').click();
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
            window.getButtonByText('Clear').click();
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

test('Neo.mjs benchmark: Real-time Feed', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', {name: 'Create 1k rows'}).click();
    await waitForGridReady(page, 1002);

    const duration = await page.evaluate(async () => {
        const getCellText = (rowIndex) => {
            const cell = document.querySelector(`#neo-grid-body-1__row-${rowIndex}__label`);
            return cell ? cell.textContent : null;
        };

        const initialCellTexts = [];
        for (let i = 0; i < 10; i++) { // Sample 10 rows
            initialCellTexts.push(getCellText(i));
        }

        const action = () => {
            window.getButtonByText('Start/Stop Real-time Feed').click();
            // Let the feed run for a few seconds
            return new Promise(resolve => setTimeout(() => {
                window.getButtonByText('Start/Stop Real-time Feed').click(); // Stop the feed
                resolve();
            }, 5000)); // Run for 5 seconds
        };
        const condition = () => {
            // Check if the spinner is still animating (by checking its class) and input is enabled
            const spinner = document.querySelector('.spinner');
            const input   = document.querySelector('[data-ref="main-thread-input"]');

            let cellsUpdated = false;
            for (let i = 0; i < 10; i++) {
                if (getCellText(i) !== initialCellTexts[i]) {
                    cellsUpdated = true;
                    break;
                }
            }

            return spinner && spinner.classList.contains('spinner') && input && !input.disabled && cellsUpdated;
        };
        return window.measurePerformance('Real-time Feed', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time for Real-time Feed (5s active): ${duration}ms`);

    // TODO: resolves after e.g. 236ms => changed cell found
    expect(duration).toBeGreaterThan(4500); // Should be at least 4.5 seconds
    expect(duration).toBeLessThan(5500);  // Should not exceed 5.5 seconds significantly
});

test('Neo.mjs benchmark: Heavy Calculation (App Worker)', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');
    await page.getByRole('button', { name: 'Run Heavy Calculation', exact: true }).click();

    const duration = await page.evaluate(async () => {
        const inputField = document.querySelector('[data-ref="main-thread-input"]');
        if (inputField) {
            inputField.value = ''; // Clear the input field
        }

        const action = async () => {
            if (inputField) {
                inputField.value = 'typing test'; // Type into the input field
            }
        };
        const condition = () => {
            // Check if the heavy calculation console log is present
            const calculationFinished = window.consoleLogs.some(log => log.includes('Heavy calculation finished in App Worker.'));

            // Check if the typed text is present in the input field
            const typedTextPresent = inputField?.value === 'typing test';

            return calculationFinished && typedTextPresent;
        };
        return window.measurePerformance('Heavy Calculation (App Worker)', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time for Heavy Calculation (App Worker): ${duration}ms`);
    expect(duration).toBeGreaterThan(1000); // Should take at least 1 second
    expect(duration).toBeLessThan(10000); // Should not exceed 10 seconds (adjust based on expected calculation time)
});

test('Neo.mjs benchmark: Heavy Calculation (Task Worker)', async ({page}) => {
    await page.goto('/apps/benchmarks/');
    await expect(page).toHaveTitle('Benchmarks');

    const duration = await page.evaluate(async () => {
        const inputField = document.querySelector('[data-ref="main-thread-input"]');
        if (inputField) {
            inputField.value = ''; // Clear the input field
        }

        const action = async () => {
            let button = window.getButtonByText('Run Heavy Calculation (Task Worker)');
            button.click();

            if (inputField) {
                inputField.value = 'typing test'; // Type into the input field
            }
        };
        const condition = () => {
            // Check if the heavy calculation console log is present
            const calculationFinished = window.consoleLogs.some(log => log.includes('Heavy calculation finished in Task Worker.'));

            // Check if the typed text is present in the input field
            const typedTextPresent = inputField?.value === 'typing test';

            return calculationFinished && typedTextPresent;
        };
        return window.measurePerformance('Heavy Calculation (Task Worker)', action, condition);
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time for Heavy Calculation (Task Worker): ${duration}ms`);
    expect(duration).toBeGreaterThan(1000); // Should take at least 1 second
    expect(duration).toBeLessThan(10000); // Should not exceed 10 seconds (adjust based on expected calculation time)
});
