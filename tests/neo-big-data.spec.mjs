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

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
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
    await expect(grid).toHaveAttribute('aria-rowcount', '1002');
    await expect(grid).toHaveAttribute('aria-colcount', '50');
});

test('should change the amount of rows', async ({page}) => {
    const duration = await page.evaluate(() => {
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
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '5002';
        };

        return window.measurePerformance('change-rows', action, condition);
    });

    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'change-rows': duration }) });
    console.log(`[Benchmark] change-rows: ${duration.toFixed(2)} ms`);
});

test('should change the amount of columns', async ({page}) => {
    const duration = await page.evaluate(() => {
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
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-colcount') === '75';
        };

        return window.measurePerformance('change-cols', action, condition);
    });

    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'change-cols': duration }) });
    console.log(`[Benchmark] change-cols: ${duration.toFixed(2)} ms`);
});

test('should filter the grid by firstname', async ({page}) => {
    const duration = await page.evaluate(() => {
        const action = () => {
            const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
            const label = findLabel('Firstname');
            const textfield = label.closest('.neo-textfield');
            const input = textfield.querySelector('input');
            input.value = 'Amanda';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            // Assuming initial row count is 1002, and filtering will result in fewer rows.
            return grid && grid.getAttribute('aria-rowcount') !== '1002';
        };

        return window.measurePerformance('filter-grid', action, condition);
    });

    test.info().annotations.push({ type: 'performance', description: JSON.stringify({ 'filter-grid': duration }) });
    console.log(`[Benchmark] filter-grid: ${duration.toFixed(2)} ms`);
});
