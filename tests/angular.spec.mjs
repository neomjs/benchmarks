import {test, expect} from '@playwright/test';
import { measurePerformanceInBrowser, measureJankInBrowser } from './utils/browser-test-helpers.mjs';

/**
 * A robust, observer-based function to wait for the grid to be ready for test setup.
 * This is used BEFORE the performance measurement begins.
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedRowCount
 * @param {number} [timeout=10000]
 */
async function waitForGridReady(page, expectedRowCount, timeout = 10000) {
    await page.waitForFunction((expectedRowCount) => {
        const grid = document.querySelector('.ag-root-wrapper');
        if (!grid) return false;
        const rowCount = grid.querySelectorAll('.ag-row').length;
        // A simple check for rendered rows is sufficient for AG Grid
        return rowCount > 0 && grid.querySelector('.ag-body-viewport');
    }, expectedRowCount, { timeout });
}

const getButtonByText = (text) => {
    return document.evaluate(`//button[normalize-space(.)='${text}']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};

test.beforeEach(async ({page}) => {
    await page.addInitScript({
        content: `
            window.measurePerformance = ${measurePerformanceInBrowser.toString()};
            window.measureJank        = ${measureJankInBrowser.toString()};
            window.getButtonByText    = ${getButtonByText.toString()};
            window.consoleLogs        = [];
        `
    });

    page.on('console', msg => {
        page.evaluate(log => {
            if (window.consoleLogs) {
                window.consoleLogs.push(log);
            }
        }, msg.text()).catch(() => {});

        if (msg.type() !== 'debug' && msg.type() !== 'info' && msg.type() !== 'warning') {
            console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
        }
    });
});

test('Angular benchmark: Create 10k Rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 10k Rows').click();
        };
        const condition = () => {
            const {gridApi} = window;
            return gridApi?.getDisplayedRowCount() === 10000;
        };
        return window.measurePerformance('Create 10k Rows', action, condition, undefined, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 10k Rows: ${duration}ms`);
    expect(duration).toBeLessThan(30000);
});

test('Angular benchmark: Create 100k Rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 100k Rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 100k Rows').click();
        };
        const condition = () => {
            const {gridApi} = window;
            return gridApi?.getDisplayedRowCount() === 100000;
        };
        return window.measurePerformance('Create 100k Rows', action, condition, undefined, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 100k Rows: ${duration}ms`);
    expect(duration).toBeLessThan(350000);
});

test('Angular benchmark: Create 1M Rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 1M Rows'}).waitFor();

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Create 1M Rows').click();
        };
        const condition = () => {
            const {gridApi} = window;
            return gridApi?.getDisplayedRowCount() === 1000000;
        };
        return window.measurePerformance('Create 1M Rows', action, condition, undefined, { timeout: 110000, resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to render 1M Rows: ${duration}ms`);
    expect(duration).toBeLessThan(350000);
});

test('Angular benchmark: Update Every 10th Row', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Update Every 10th Row').click();
        };
        const condition = () => {
            const node = document.querySelector('.ag-row:first-child .ag-cell:last-child');
            return node?.textContent.includes('updated');
        };
        return window.measurePerformance('Update Every 10th Row', action, condition, undefined, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to update 10k rows (every 10th): ${duration}ms`);
    expect(duration).toBeLessThan(5000);
});

test('Angular benchmark: Select Row', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Select Row').click();
        };
        const condition = () => {
            return document.querySelector('.ag-row-selected');
        };
        return window.measurePerformance('Select Row', action, condition, undefined, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to select a row: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Angular benchmark: Swap Rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    const duration = await page.evaluate(() => {
        // Capture the initial state directly in the browser
        const initialTransforms = Array.from(
            document.querySelectorAll('.ag-row[row-index]'),
            el => window.getComputedStyle(el).transform
        );

        const action = () => {
            window.getButtonByText('Swap Rows').click();
        };

        const condition = (initials) => {
            const newStyles = Array.from(
                document.querySelectorAll('.ag-row[row-index]'),
                el => window.getComputedStyle(el).transform
            );
            return newStyles.length > 0 && newStyles.join(',') !== initials.join(',');
        };

        return window.measurePerformance('Swap Rows', action, condition, initialTransforms, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to swap rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Angular benchmark: Remove Row', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Remove Row').click();
        };
        const condition = () => {
            const {gridApi} = window;
            return gridApi?.getDisplayedRowCount() === 9999;
        };
        return window.measurePerformance('Remove Row', action, condition, undefined, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to remove a row: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Angular benchmark: Clear Rows', async ({page}) => {
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    const duration = await page.evaluate(() => {
        const action    = () => {
            window.getButtonByText('Clear Rows').click();
        };
        const condition = () => {
            const grid = document.querySelector('.ag-root-wrapper');
            if (!grid) return true;
            const rowCount = grid.querySelectorAll('.ag-row').length;
            return rowCount === 0;
        };
        return window.measurePerformance('Clear Rows', action, condition, undefined, { resolveOnTimeout: true });
    });

    test.info().annotations.push({type: 'duration', description: `${duration}`});
    console.log(`Time to clear rows: ${duration}ms`);
    expect(duration).toBeLessThan(500);
});

test('Angular benchmark: Real-time Feed UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).click();
    await waitForGridReady(page, 10000);
    await page.waitForTimeout(100);

    // Start the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    // Measure jank for 4 seconds while the feed is running
    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    // Stop the feed
    await page.getByRole('button', {name: 'Start/Stop Real-time Feed'}).click();

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Real-time Feed (4s active) Jank Metrics:`, jankMetrics);

    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(5);
    expect(jankMetrics.longFrameCount).toBeLessThan(60);
});

test('Angular benchmark: Heavy Calculation (Main Thread) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).waitFor();

    page.getByRole('button', {name: 'Run Heavy Calculation', exact: true}).click();

    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Main Thread.'));
    }, null, {timeout: 60000});

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Main Thread) Jank Metrics:`, jankMetrics);
    expect(jankMetrics.averageFps).toBeLessThan(40);
    expect(jankMetrics.longFrameCount).toBeLessThan(5);
});

test('Angular benchmark: Heavy Calculation (Task Worker) UI Responsiveness', async ({page}) => {
    test.info().annotations.push({type: 'story', description: 'https://github.com/neomjs/benchmarks/blob/main/.github/EPIC-Performance-Showcases.md'});
    await page.goto('http://localhost:4200/');
    await expect(page).toHaveTitle('Interactive Benchmark Angular');
    await page.getByRole('button', {name: 'Create 10k Rows'}).waitFor();

    await page.getByRole('button', {name: 'Run Heavy Calculation (Task Worker)'}).click();

    const jankMetrics = await page.evaluate(() => {
        return window.measureJank(4000);
    });

    await page.waitForFunction(() => {
        return window.consoleLogs.some(log => log.includes('Heavy calculation finished in Task Worker.'));
    }, null, {timeout: 60000});

    test.info().annotations.push({type: 'averageFps', description: `${jankMetrics.averageFps}`});
    test.info().annotations.push({type: 'longFrameCount', description: `${jankMetrics.longFrameCount}`});

    console.log(`Heavy Calculation (Task Worker) Jank Metrics:`, jankMetrics);
    expect(jankMetrics.averageFps).toBeGreaterThanOrEqual(40);
    expect(jankMetrics.longFrameCount).toBeLessThan(10);
});
