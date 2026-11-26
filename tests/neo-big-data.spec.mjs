import {test, expect} from '@playwright/test';
import {
    assertNeoVdomWorkerTopology,
    configureNeoVdomWorker,
    installWorkerMessageProbeInBrowser,
    isCellInViewportInBrowser,
    measureJankInBrowser,
    measureMainThreadProbeInBrowser,
    measurePerformanceInBrowser,
    measureUiUpdatePerformanceInBrowser
} from './utils/browser-test-helpers.mjs';

const getNeoGridNames = () => {
    const names = [];
    for (let i = 0; i < 3; i++) {
        const cell = document.querySelector(`.neo-grid-row[data-row-id="${i}"] .neo-grid-cell[data-field="firstname"]`);
        if (cell) names.push(cell.textContent.trim());
    }
    return names;
};

const selectComboboxItem = (labelText, itemText) => {
    return new Promise((resolve, reject) => {
        const findLabel = (text) => Array.from(document.querySelectorAll('label')).find(l => l.textContent === text);
        const label = findLabel(labelText);
        if (!label) {
            return reject(new Error(`Label "${labelText}" not found.`));
        }
        const combobox = label.closest('.neo-combobox');
        if (!combobox) {
            return reject(new Error(`Combobox not found for label "${labelText}".`));
        }
        const trigger = combobox.querySelector('.fa-caret-down');
        if (!trigger) {
            return reject(new Error(`Combobox trigger not found for label "${labelText}".`));
        }

        const pickerObserver = new MutationObserver((mutations, observer) => {
            const picker = document.getElementById(`${combobox.id}__picker`);
            if (picker && picker.getBoundingClientRect().height > 0) {
                const item = Array.from(picker.querySelectorAll('li')).find(li => li.textContent.trim() === itemText);
                if (item) {
                    observer.disconnect();
                    item.click();
                    resolve();
                }
            }
        });
        pickerObserver.observe(document.body, { attributes: true, childList: true, subtree: true });

        trigger.click();
    });
};

test.beforeEach(async ({page}) => {
    await configureNeoVdomWorker(page);

    await page.addInitScript({
        content: `
            (${installWorkerMessageProbeInBrowser.toString()})();
            window.getNeoGridNames            = ${getNeoGridNames.toString()};
            window.isCellInViewport           = ${isCellInViewportInBrowser.toString()};
            window.measureJank                = ${measureJankInBrowser.toString()};
            window.measurePerformance         = ${measurePerformanceInBrowser.toString()};
            window.measureUiUpdatePerformance = ${measureUiUpdatePerformanceInBrowser.toString()};
            window.measureMainThreadProbe     = ${measureMainThreadProbeInBrowser.toString()};
            window.selectComboboxItem         = ${selectComboboxItem.toString()};
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
    const topology = await assertNeoVdomWorkerTopology(page);
    if (topology?.engineProvenance) {
        test.info().annotations.push({
            type       : 'engineProvenance',
            description: JSON.stringify(topology.engineProvenance)
        });
    }
});

test('should load the app and display the initial grid data', async ({page}) => {
    await expect(page).toHaveTitle('Big Data Neo');
    const grid = await page.locator('[role="grid"]');
    await expect(grid).toHaveAttribute('aria-rowcount', '1001');
    await expect(grid).toHaveAttribute('aria-colcount', '50');
});

test('should change the amount of rows', async ({page}) => {
    await page.waitForSelector('.neo-grid-row[data-row-id="2"] .neo-grid-cell[data-field="firstname"]');

    const initialNames = await page.evaluate(() => window.getNeoGridNames());

    // Step 1: Trigger the UI action and start total duration + main-thread probe measurement
    const totalProbePromise = page.evaluate((initial) => {
        const action = () => {
            window.selectComboboxItem('Amount Rows', '5000');
        };

        const condition = () => {
            const currentNames = window.getNeoGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };

        return window.measureMainThreadProbe('change-rows-total', action, condition);
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
    await page.waitForSelector('.neo-grid-row[data-row-id="2"] .neo-grid-cell[data-field="firstname"]');

    const initialNames = await page.evaluate(() => window.getNeoGridNames());

    // Step 1: Trigger the UI action and start total duration + main-thread probe measurement
    const totalProbePromise = page.evaluate((initial) => {
        const action = () => {
            window.selectComboboxItem('Amount Columns', '75');
        };

        const condition = () => {
            const currentNames = window.getNeoGridNames();
            return currentNames.length === initial.length && currentNames.some((name, i) => name !== initial[i]);
        };

        return window.measureMainThreadProbe('change-cols-total', action, condition);
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
    // Wait for the grid and its first row to be rendered before starting the test.
    await page.waitForSelector('.neo-grid-row[data-row-id="0"] .neo-grid-cell[data-field="firstname"]');

    const probes = await page.evaluate(async () => {
        const measureProbe = window.measureMainThreadProbe;

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
            const firstRow = document.querySelector('.neo-grid-row[data-row-id="0"]');
            if (!firstRow) {
                return null;
            }
            const firstCell = firstRow.querySelector('.neo-grid-cell[data-field="firstname"]');
            if (!firstCell) {
                return null;
            }
            return firstCell.textContent.trim();
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
            return getFirstCellContent() === initialFirstCellContent;
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
    test.setTimeout(60000);
    // 1. Change rows to 100k
    // Step 1: Trigger the UI action and start total duration + main-thread responsiveness measurement
    const rowsProbePromise = page.evaluate(() => {
        const action = () => {
            window.selectComboboxItem('Amount Rows', '100000');
        };

        const condition = () => {
            const grid = document.querySelector('[role="grid"]');
            return grid && grid.getAttribute('aria-rowcount') === '100001';
        };
        return window.measureMainThreadProbe('change-rows-100k-total', action, condition);
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

    // 2. Change columns to 200
    const namesBefore200Cols = await page.evaluate(() => window.getNeoGridNames());

    // Step 1: Trigger the UI action and start total duration + main-thread responsiveness measurement
    const colsProbePromise = page.evaluate((initial) => {
        const action = () => {
            window.selectComboboxItem('Amount Columns', '200');
        };

        const condition = () => {
            const grid         = document.querySelector('[role="grid"]');
            const currentNames = window.getNeoGridNames();
            return grid && grid.getAttribute('aria-colcount') === '200' &&
                   currentNames.length === initial.length &&
                   currentNames.some((name, i) => name !== initial[i]);
        };
        return window.measureMainThreadProbe('change-cols-200-total', action, condition);
    }, namesBefore200Cols);

    // Step 2: Wait for the "Data creation total time" log
    await page.waitForEvent('console', msg => msg.text().includes('Data creation total time:'));

    // Step 3: Start measuring UI update
    const colsUiUpdateDurationPromise = page.evaluate((initial) => {
        const condition = () => {
            const grid         = document.querySelector('[role="grid"]');
            const currentNames = window.getNeoGridNames();
            return grid && grid.getAttribute('aria-colcount') === '200' &&
                   currentNames.length === initial.length &&
                   currentNames.some((name, i) => name !== initial[i]);
        };
        return window.measureUiUpdatePerformance('change-cols-200-ui-update', condition);
    }, namesBefore200Cols);

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

    // Ensure all 200 column positions, newly loaded 200-column cells, and 100k row scrollHeight are settled before scrolling
    await page.waitForFunction(() => {
        const vScroll  = document.querySelector('.neo-grid-view');
        const hScroll  = document.querySelector('.neo-grid-horizontal-scrollbar');
        const numCell  = document.querySelector('.neo-grid-row[data-row-id="0"] .neo-grid-cell[data-field="number7"]');
        return vScroll && vScroll.scrollHeight > 3000000 &&
               vScroll.scrollTop === 0 &&
               hScroll && hScroll.scrollWidth > 15000 &&
               numCell && numCell.textContent.trim().length > 0;
    });

    // 3. 2D Scrolling Benchmarks on 100,000 rows x 200 columns (Vertical, Horizontal, Diagonal)
    const scrollProbes = await page.evaluate(async () => {
        const measureProbe = window.measureMainThreadProbe;
        const vScroller    = document.querySelector('.neo-grid-view');
        const hScroller    = document.querySelector('.neo-grid-horizontal-scrollbar');
        const sampleRow    = document.querySelector('.neo-grid-row[data-row-id]');
        const rowHeight    = sampleRow ? (parseFloat(sampleRow.style.height) || sampleRow.offsetHeight || 32) : 32;

        const getColScrollLeft = (colNum) => {
            if (colNum <= 0) return 0;
            const maxLeft = Math.max(0, hScroller.scrollWidth - hScroller.clientWidth);
            return Math.min(maxLeft, 760 + (colNum - 7) * 100);
        };

        const isRowMounted = (rowId) => window.isCellInViewport(vScroller, rowId, null);

        const isCellMounted = (rowId, field) => window.isCellInViewport(vScroller, rowId, field);

        // 3a. Vertical Scroll across 100k rows (8 render-gated steps)
        const vSteps = [5000, 15000, 30000, 45000, 60000, 75000, 90000, 0];
        let vIdx = 0;
        window.startWorkerMessageProbe();
        const verticalProbe = await measureProbe('scroll-vertical-100k', () => {
            vIdx = 0;
            vScroller.scrollTop = vSteps[0] * rowHeight;
        }, () => {
            while (vIdx < vSteps.length && isRowMounted(vSteps[vIdx])) {
                vIdx++;
                if (vIdx < vSteps.length) {
                    vScroller.scrollTop = vSteps[vIdx] * rowHeight;
                }
            }
            return vIdx >= vSteps.length;
        });
        const verticalWorkerStats = window.stopWorkerMessageProbe();

        // 3b. Horizontal Scroll across 200 columns (8 render-gated steps at row 0)
        const hSteps = [
            { colNum: 30,  field: 'number30'  },
            { colNum: 60,  field: 'number60'  },
            { colNum: 90,  field: 'number90'  },
            { colNum: 120, field: 'number120' },
            { colNum: 150, field: 'number150' },
            { colNum: 180, field: 'number180' },
            { colNum: 195, field: 'number195' },
            { colNum: 0,   field: 'firstname' }
        ];
        let hIdx = 0;
        window.startWorkerMessageProbe();
        const horizontalProbe = await measureProbe('scroll-horizontal-200-cols', () => {
            hIdx = 0;
            hScroller.scrollLeft = getColScrollLeft(hSteps[0].colNum);
        }, () => {
            while (hIdx < hSteps.length && isCellMounted(0, hSteps[hIdx].field)) {
                hIdx++;
                if (hIdx < hSteps.length) {
                    hScroller.scrollLeft = getColScrollLeft(hSteps[hIdx].colNum);
                }
            }
            return hIdx >= hSteps.length;
        });
        const horizontalWorkerStats = window.stopWorkerMessageProbe();

        // 3c. 2D Diagonal Scroll across 100k rows x 200 columns (8 simultaneous vertical + horizontal steps)
        const dSteps = [
            { rowId: 5000,  colNum: 30,  field: 'number30'  },
            { rowId: 15000, colNum: 60,  field: 'number60'  },
            { rowId: 30000, colNum: 90,  field: 'number90'  },
            { rowId: 45000, colNum: 120, field: 'number120' },
            { rowId: 60000, colNum: 150, field: 'number150' },
            { rowId: 75000, colNum: 180, field: 'number180' },
            { rowId: 90000, colNum: 195, field: 'number195' },
            { rowId: 0,     colNum: 0,   field: 'firstname' }
        ];
        let dIdx = 0;
        window.startWorkerMessageProbe();
        const diagonalProbe = await measureProbe('scroll-diagonal-2d', () => {
            dIdx = 0;
            vScroller.scrollTop  = dSteps[0].rowId * rowHeight;
            hScroller.scrollLeft = getColScrollLeft(dSteps[0].colNum);
        }, () => {
            while (dIdx < dSteps.length && isCellMounted(dSteps[dIdx].rowId, dSteps[dIdx].field)) {
                dIdx++;
                if (dIdx < dSteps.length) {
                    vScroller.scrollTop  = dSteps[dIdx].rowId * rowHeight;
                    hScroller.scrollLeft = getColScrollLeft(dSteps[dIdx].colNum);
                }
            }
            return dIdx >= dSteps.length;
        });
        const diagonalWorkerStats = window.stopWorkerMessageProbe();

        return {
            verticalProbe,
            horizontalProbe,
            diagonalProbe,
            verticalWorkerStats,
            horizontalWorkerStats,
            diagonalWorkerStats
        };
    });

    test.info().annotations.push({
        type: 'workerMessagesScroll2D',
        description: JSON.stringify({
            vertical  : scrollProbes.verticalWorkerStats,
            horizontal: scrollProbes.horizontalWorkerStats,
            diagonal  : scrollProbes.diagonalWorkerStats
        })
    });

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            'scroll-vertical-100k'                  : scrollProbes.verticalProbe.tvsMs,
            'scroll-vertical-100k (Max RAF Delta)'  : scrollProbes.verticalProbe.maxRafDeltaMs,
            ...(scrollProbes.verticalProbe.longTaskTotalBlockingMs !== null ? {
                'scroll-vertical-100k (Long Task Block)' : scrollProbes.verticalProbe.longTaskTotalBlockingMs
            } : {}),
            'scroll-horizontal-200-cols'                  : scrollProbes.horizontalProbe.tvsMs,
            'scroll-horizontal-200-cols (Max RAF Delta)'  : scrollProbes.horizontalProbe.maxRafDeltaMs,
            ...(scrollProbes.horizontalProbe.longTaskTotalBlockingMs !== null ? {
                'scroll-horizontal-200-cols (Long Task Block)' : scrollProbes.horizontalProbe.longTaskTotalBlockingMs
            } : {}),
            'scroll-diagonal-2d'                  : scrollProbes.diagonalProbe.tvsMs,
            'scroll-diagonal-2d (Max RAF Delta)'  : scrollProbes.diagonalProbe.maxRafDeltaMs,
            ...(scrollProbes.diagonalProbe.longTaskTotalBlockingMs !== null ? {
                'scroll-diagonal-2d (Long Task Block)' : scrollProbes.diagonalProbe.longTaskTotalBlockingMs
            } : {})
        })
    });

    console.log(`[Benchmark] scroll-vertical-100k: ${scrollProbes.verticalProbe.tvsMs.toFixed(2)} ms (maxRafDelta: ${scrollProbes.verticalProbe.maxRafDeltaMs.toFixed(2)} ms)`);
    console.log(`[Benchmark] scroll-horizontal-200-cols: ${scrollProbes.horizontalProbe.tvsMs.toFixed(2)} ms (maxRafDelta: ${scrollProbes.horizontalProbe.maxRafDeltaMs.toFixed(2)} ms)`);
    console.log(`[Benchmark] scroll-diagonal-2d: ${scrollProbes.diagonalProbe.tvsMs.toFixed(2)} ms (maxRafDelta: ${scrollProbes.diagonalProbe.maxRafDeltaMs.toFixed(2)} ms)`);
});

test('should sustain real-time streaming and 2D scrolling under duress (100k rows x 200 cols)', async ({ page }) => {
    test.setTimeout(90000);

    await page.evaluate(() => window.selectComboboxItem('Amount Rows', '100000'));
    await page.waitForFunction(() => document.querySelector('[role="grid"]')?.getAttribute('aria-rowcount') === '100001');

    await page.evaluate(() => window.selectComboboxItem('Amount Columns', '200'));
    await page.waitForFunction(() => {
        const grid    = document.querySelector('[role="grid"]');
        const hScroll = document.querySelector('.neo-grid-horizontal-scrollbar');
        return grid?.getAttribute('aria-colcount') === '200' && hScroll && hScroll.scrollWidth > 15000;
    });

    const duressMetrics = await page.evaluate(async () => {
        const toggleFeed = () => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start/Stop Feed'));
            if (!btn) throw new Error('Start/Stop Feed button not found in BigData ControlsContainer.');
            btn.click();
        };

        toggleFeed();
        await new Promise(res => setTimeout(res, 50));

        // 1. Stationary high-frequency viewport + multi-column + sibling-component streaming (2,500ms)
        window.startWorkerMessageProbe();
        const streamJank        = await window.measureJank(2500);
        const streamWorkerStats = window.stopWorkerMessageProbe();

        // 2. 8-hop 2D Diagonal Scroll across 100k x 200 cols while 5ms real-time feed is active
        const vScroller = document.querySelector('.neo-grid-view');
        const hScroller = document.querySelector('.neo-grid-horizontal-scrollbar');
        const sampleRow = document.querySelector('.neo-grid-row[data-row-id]');
        const rowHeight = sampleRow ? (parseFloat(sampleRow.style.height) || sampleRow.offsetHeight || 32) : 32;

        const getColScrollLeft = (colNum) => {
            if (colNum <= 0) return 0;
            const maxLeft = Math.max(0, hScroller.scrollWidth - hScroller.clientWidth);
            return Math.min(maxLeft, 760 + (colNum - 7) * 100);
        };

        const isCellMounted = (rowId, field) => window.isCellInViewport(vScroller, rowId, field);

        const dSteps = [
            { rowId: 5000,  colNum: 30,  field: 'number30'  },
            { rowId: 15000, colNum: 60,  field: 'number60'  },
            { rowId: 30000, colNum: 90,  field: 'number90'  },
            { rowId: 45000, colNum: 120, field: 'number120' },
            { rowId: 60000, colNum: 150, field: 'number150' },
            { rowId: 75000, colNum: 180, field: 'number180' },
            { rowId: 90000, colNum: 195, field: 'number195' },
            { rowId: 0,     colNum: 0,   field: 'firstname' }
        ];
        let dIdx = 0;

        window.startWorkerMessageProbe();
        const diagonalDuressProbe = await window.measureMainThreadProbe('scroll-diagonal-2d-under-stream', () => {
            dIdx = 0;
            vScroller.scrollTop  = dSteps[0].rowId * rowHeight;
            hScroller.scrollLeft = getColScrollLeft(dSteps[0].colNum);
        }, () => {
            while (dIdx < dSteps.length && isCellMounted(dSteps[dIdx].rowId, dSteps[dIdx].field)) {
                dIdx++;
                if (dIdx < dSteps.length) {
                    vScroller.scrollTop  = dSteps[dIdx].rowId * rowHeight;
                    hScroller.scrollLeft = getColScrollLeft(dSteps[dIdx].colNum);
                }
            }
            return dIdx >= dSteps.length;
        });
        const diagonalDuressWorkerStats = window.stopWorkerMessageProbe();

        toggleFeed();

        return {
            streamJank,
            streamWorkerStats,
            diagonalDuressProbe,
            diagonalDuressWorkerStats
        };
    });

    test.info().annotations.push({
        type: 'performance',
        description: JSON.stringify({
            'stream-100k-x-200-fps'                                   : duressMetrics.streamJank.averageFps,
            'stream-100k-x-200-long-frames'                           : duressMetrics.streamJank.longFrameCount,
            'stream-100k-x-200-flights-per-sec'                       : duressMetrics.streamWorkerStats.flightsPerSec,
            'stream-100k-x-200-main-msgs'                             : duressMetrics.streamWorkerStats.totalMainWorkerMessages,
            'scroll-diagonal-2d-under-stream'                         : duressMetrics.diagonalDuressProbe.tvsMs,
            'scroll-diagonal-2d-under-stream (Max RAF Delta)'         : duressMetrics.diagonalDuressProbe.maxRafDeltaMs,
            ...(duressMetrics.diagonalDuressProbe.longTaskTotalBlockingMs !== null ? {
                'scroll-diagonal-2d-under-stream (Long Task Block)'   : duressMetrics.diagonalDuressProbe.longTaskTotalBlockingMs
            } : {}),
            'scroll-diagonal-2d-under-stream-flights'                 : duressMetrics.diagonalDuressWorkerStats.domUpdateFlights,
            'scroll-diagonal-2d-under-stream-main-msgs'               : duressMetrics.diagonalDuressWorkerStats.totalMainWorkerMessages
        })
    });

    test.info().annotations.push({
        type: 'workerMessagesDuress',
        description: JSON.stringify({
            stationaryStream  : duressMetrics.streamWorkerStats,
            diagonalUnderStream: duressMetrics.diagonalDuressWorkerStats
        })
    });

    console.log(`[Benchmark] BigData 100k x 200 Stationary Stream (2.5s): FPS=${duressMetrics.streamJank.averageFps}, flights/s=${duressMetrics.streamWorkerStats.flightsPerSec}, mainMsgs=${duressMetrics.streamWorkerStats.totalMainWorkerMessages}`);
    console.log(`[Benchmark] BigData 100k x 200 Diagonal Scroll Under Stream: ${duressMetrics.diagonalDuressProbe.tvsMs.toFixed(2)} ms (maxRafDelta: ${duressMetrics.diagonalDuressProbe.maxRafDeltaMs.toFixed(2)} ms, flights: ${duressMetrics.diagonalDuressWorkerStats.domUpdateFlights}, mainMsgs: ${duressMetrics.diagonalDuressWorkerStats.totalMainWorkerMessages})`);
});

test('should stress high row/column buffering (50x20, >5k nodes), 100k store filter/re-render, and n=20 2D scroll under stream', async ({ page }) => {
    test.setTimeout(180000);

    await page.evaluate(() => window.selectComboboxItem('Amount Rows', '100000'));
    await page.waitForFunction(() => {
        const grid    = document.querySelector('[role="grid"]');
        const vScroll = document.querySelector('.neo-grid-view');
        return grid?.getAttribute('aria-rowcount') === '100001' && vScroll && vScroll.scrollHeight > 3000000;
    });

    await page.evaluate(() => window.selectComboboxItem('Amount Columns', '200'));
    await page.waitForFunction(() => {
        const grid    = document.querySelector('[role="grid"]');
        const hScroll = document.querySelector('.neo-grid-horizontal-scrollbar');
        const numCell = document.querySelector('.neo-grid-row[data-row-id="0"] .neo-grid-cell[data-field="firstname"]');
        return grid?.getAttribute('aria-colcount') === '200' &&
               hScroll && hScroll.scrollWidth > 15000 &&
               numCell && numCell.textContent.trim().length > 0;
    });

    // Maximize mounted VDOM/VNode tree via Buffer Rows = 50 and Buffer Columns = 20
    await page.evaluate(() => window.selectComboboxItem('Buffer Rows', '50'));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.selectComboboxItem('Buffer Columns', '20'));

    // Position viewport at (row 60, scrollLeft 800) so both -/+ row buffers and col 0..40+ are mounted
    await page.evaluate(() => {
        const vScroller   = document.querySelector('.neo-grid-view');
        const hScroller   = document.querySelector('.neo-grid-horizontal-scrollbar');
        const sampleRow   = document.querySelector('.neo-grid-row[data-row-id]');
        const rowHeight   = sampleRow ? (parseFloat(sampleRow.style.height) || sampleRow.offsetHeight || 32) : 32;
        vScroller.scrollTop  = 60 * rowHeight;
        hScroller.scrollLeft = 800;
    });

    await page.waitForFunction(() => {
        const rows  = document.querySelectorAll('.neo-grid-body .neo-grid-row');
        const cells = document.querySelectorAll('.neo-grid-body .neo-grid-cell');
        return rows.length >= 80 && cells.length >= 2000;
    });

    const highBufferMetrics = await page.evaluate(async () => {
        const gridBody        = document.querySelector('.neo-grid-body');
        const vScroller       = document.querySelector('.neo-grid-view');
        const hScroller       = document.querySelector('.neo-grid-horizontal-scrollbar');
        const mountedRows     = gridBody.querySelectorAll('.neo-grid-row').length;
        const mountedCells    = gridBody.querySelectorAll('.neo-grid-cell').length;
        const mountedDomNodes = gridBody.querySelectorAll('*').length;

        const toggleFeed = () => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start/Stop Feed'));
            if (!btn) throw new Error('Start/Stop Feed button not found.');
            btn.click();
        };

        const setFirstnameFilter = (value) => {
            const label     = Array.from(document.querySelectorAll('label')).find(l => l.textContent === 'Firstname');
            const textfield = label.closest('.neo-textfield');
            const input     = textfield.querySelector('input');
            input.value     = value;
            input.dispatchEvent(new Event('input',  { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const getRow0Firstname = () => {
            const cell = document.querySelector('.neo-grid-row[data-row-id="0"] .neo-grid-cell[data-field="firstname"]');
            return cell ? cell.textContent.trim() : null;
        };

        // Start 5ms 60-row/tick real-time feed
        toggleFeed();
        await new Promise(res => setTimeout(res, 60));

        // 1. Stationary high-buffer (>4k DOM nodes) streaming window (2,000ms)
        window.startWorkerMessageProbe();
        const streamJank        = await window.measureJank(2000);
        const streamWorkerStats = window.stopWorkerMessageProbe();

        // Reset to top-left so row 0 firstname is mounted across 100k filter toggles (Buffer 50x20 keeps ~72 rows x ~35 cols mounted)
        vScroller.scrollTop  = 0;
        hScroller.scrollLeft = 0;
        await new Promise(res => setTimeout(res, 80));

        // 2. 10x App-worker 100k-record filter + full high-buffer structural re-renders under stream
        const filterStepTvs    = [];
        const filterStepMaxRaf = [];
        let filterLongTaskSum  = 0;
        window.startWorkerMessageProbe();
        for (let i = 0; i < 10; i++) {
            const isClearStep = (i === 9);
            const currentName = getRow0Firstname();
            const targetValue = isClearStep ? '' : (i % 2 === 0
                ? (currentName === 'Amanda' ? 'Andrew' : 'Amanda')
                : (currentName === 'John'   ? 'Jessica' : 'John'));

            const probe = await window.measureMainThreadProbe(`highbuf-filter-${i + 1}`, () => {
                setFirstnameFilter(targetValue);
            }, () => {
                if (isClearStep) {
                    return document.querySelector('[role="grid"]')?.getAttribute('aria-rowcount') === '100001' &&
                           Boolean(getRow0Firstname());
                }
                return getRow0Firstname() === targetValue;
            });

            filterStepTvs.push(probe.tvsMs);
            filterStepMaxRaf.push(probe.maxRafDeltaMs);
            filterLongTaskSum += (probe.longTaskTotalBlockingMs || 0);
            await new Promise(res => setTimeout(res, 20));
        }
        const filterWorkerStats = window.stopWorkerMessageProbe();

        while (vScroller.scrollHeight < 3000000) {
            await new Promise(res => setTimeout(res, 16));
        }

        // 3. 12x discrete 2D diagonal scroll hops across 100k x 200 under high-buffer (>5k nodes) + active stream
        const sampleRow = document.querySelector('.neo-grid-row[data-row-id]');
        const rowHeight = sampleRow ? (parseFloat(sampleRow.style.height) || sampleRow.offsetHeight || 32) : 32;

        const getColScrollLeft = (colNum) => {
            if (colNum <= 0) return 0;
            const maxLeft = Math.max(0, hScroller.scrollWidth - hScroller.clientWidth);
            return Math.min(maxLeft, 760 + (colNum - 7) * 100);
        };

        const isCellMounted = (rowId, field) => window.isCellInViewport(vScroller, rowId, field);

        const hops20 = [
            { rowId: 4000,  colNum: 25,  field: 'number25'  },
            { rowId: 9000,  colNum: 45,  field: 'number45'  },
            { rowId: 14000, colNum: 65,  field: 'number65'  },
            { rowId: 19000, colNum: 85,  field: 'number85'  },
            { rowId: 25000, colNum: 105, field: 'number105' },
            { rowId: 31000, colNum: 125, field: 'number125' },
            { rowId: 38000, colNum: 145, field: 'number145' },
            { rowId: 45000, colNum: 165, field: 'number165' },
            { rowId: 52000, colNum: 180, field: 'number180' },
            { rowId: 60000, colNum: 155, field: 'number155' },
            { rowId: 68000, colNum: 135, field: 'number135' },
            { rowId: 76000, colNum: 115, field: 'number115' },
            { rowId: 84000, colNum: 95,  field: 'number95'  },
            { rowId: 92000, colNum: 75,  field: 'number75'  },
            { rowId: 80000, colNum: 55,  field: 'number55'  },
            { rowId: 65000, colNum: 35,  field: 'number35'  },
            { rowId: 50000, colNum: 70,  field: 'number70'  },
            { rowId: 35000, colNum: 110, field: 'number110' },
            { rowId: 20000, colNum: 150, field: 'number150' },
            { rowId: 5000,  colNum: 30,  field: 'number30'  }
        ];

        const scrollHopTvs    = [];
        const scrollHopMaxRaf = [];
        let scrollLongTaskSum = 0;
        let peakMountedNodes  = mountedDomNodes;

        window.startWorkerMessageProbe();
        for (let i = 0; i < hops20.length; i++) {
            const hop = hops20[i];
            const probe = await window.measureMainThreadProbe(`highbuf-hop-${i + 1}`, () => {
                vScroller.scrollTop  = hop.rowId * rowHeight;
                hScroller.scrollLeft = getColScrollLeft(hop.colNum);
            }, () => isCellMounted(hop.rowId, hop.field));

            scrollHopTvs.push(probe.tvsMs);
            scrollHopMaxRaf.push(probe.maxRafDeltaMs);
            scrollLongTaskSum += (probe.longTaskTotalBlockingMs || 0);
            if (i === 4) {
                peakMountedNodes = Math.max(peakMountedNodes, gridBody.querySelectorAll('*').length);
            }
            await new Promise(res => setTimeout(res, 25));
        }
        const scrollWorkerStats = window.stopWorkerMessageProbe();

        toggleFeed();

        const sum = (arr) => arr.reduce((s, x) => s + x, 0);
        return {
            mountedRows,
            mountedCells,
            mountedDomNodes,
            peakMountedNodes,
            streamJank,
            streamWorkerStats,
            filterStepTvs,
            filterStepMaxRaf,
            filterTotalTvsMs    : Math.round(sum(filterStepTvs) * 100) / 100,
            filterMeanStepTvsMs : Math.round((sum(filterStepTvs) / filterStepTvs.length) * 100) / 100,
            filterMaxStepTvsMs  : Math.max(...filterStepTvs),
            filterMaxRafMs      : Math.max(...filterStepMaxRaf),
            filterLongTaskSumMs : Math.round(filterLongTaskSum * 100) / 100,
            filterWorkerStats,
            scrollHopTvs,
            scrollHopMaxRaf,
            scrollTotalTvsMs    : Math.round(sum(scrollHopTvs) * 100) / 100,
            scrollMeanHopTvsMs  : Math.round((sum(scrollHopTvs) / scrollHopTvs.length) * 100) / 100,
            scrollMaxHopTvsMs   : Math.max(...scrollHopTvs),
            scrollMaxRafMs      : Math.max(...scrollHopMaxRaf),
            scrollLongTaskSumMs : Math.round(scrollLongTaskSum * 100) / 100,
            scrollWorkerStats
        };
    });

    test.info().annotations.push({
        type       : 'performance',
        description: JSON.stringify({
            'highbuf-50x20-peak-dom-nodes'             : highBufferMetrics.peakMountedNodes,
            'highbuf-50x20-stream-fps'                 : highBufferMetrics.streamJank.averageFps,
            'highbuf-50x20-stream-long-frames'         : highBufferMetrics.streamJank.longFrameCount,
            'highbuf-50x20-stream-flights-per-sec'     : highBufferMetrics.streamWorkerStats.flightsPerSec,
            'highbuf-50x20-stream-vnode-relays'        : highBufferMetrics.streamWorkerStats.vnodeRelayMessages,
            'highbuf-50x20-filter20-mean-step-tvs'     : highBufferMetrics.filterMeanStepTvsMs,
            'highbuf-50x20-filter20-max-step-tvs'      : highBufferMetrics.filterMaxStepTvsMs,
            'highbuf-50x20-filter20-max-raf'           : highBufferMetrics.filterMaxRafMs,
            'highbuf-50x20-filter20-longtask'          : highBufferMetrics.filterLongTaskSumMs,
            'highbuf-50x20-scroll20-mean-hop-tvs'      : highBufferMetrics.scrollMeanHopTvsMs,
            'highbuf-50x20-scroll20-max-hop-tvs'       : highBufferMetrics.scrollMaxHopTvsMs,
            'highbuf-50x20-scroll20-max-raf'           : highBufferMetrics.scrollMaxRafMs,
            'highbuf-50x20-scroll20-longtask'          : highBufferMetrics.scrollLongTaskSumMs
        })
    });

    test.info().annotations.push({
        type       : 'highBufferFilterStepTimes',
        description: JSON.stringify(highBufferMetrics.filterStepTvs)
    });

    test.info().annotations.push({
        type       : 'highBufferScrollHopTimes',
        description: JSON.stringify(highBufferMetrics.scrollHopTvs)
    });

    test.info().annotations.push({
        type       : 'workerMessagesHighBuffer',
        description: JSON.stringify({
            mountedRows      : highBufferMetrics.mountedRows,
            mountedCells     : highBufferMetrics.mountedCells,
            peakMountedNodes : highBufferMetrics.peakMountedNodes,
            stationaryStream : highBufferMetrics.streamWorkerStats,
            filter20UnderFeed: highBufferMetrics.filterWorkerStats,
            scroll20UnderFeed: highBufferMetrics.scrollWorkerStats
        })
    });

    console.log(`[Benchmark] High-Buffer (50x20, peakNodes=${highBufferMetrics.peakMountedNodes}) Stream: FPS=${highBufferMetrics.streamJank.averageFps}, flights/s=${highBufferMetrics.streamWorkerStats.flightsPerSec}, relays=${highBufferMetrics.streamWorkerStats.vnodeRelayMessages}`);
    console.log(`[Benchmark] High-Buffer (50x20) 20x 100k Filter+Render Under Feed: mean=${highBufferMetrics.filterMeanStepTvsMs}ms, max=${highBufferMetrics.filterMaxStepTvsMs}ms, maxRAF=${highBufferMetrics.filterMaxRafMs}ms`);
    console.log(`[Benchmark] High-Buffer (50x20) 20x 2D Scroll Hops Under Feed: mean=${highBufferMetrics.scrollMeanHopTvsMs}ms, max=${highBufferMetrics.scrollMaxHopTvsMs}ms, maxRAF=${highBufferMetrics.scrollMaxRafMs}ms`);
});
