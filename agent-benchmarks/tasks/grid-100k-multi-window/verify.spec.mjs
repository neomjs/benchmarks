import {test, expect} from '@playwright/test';
import {generateRows} from './data/generateRows.mjs';

const TARGET_URL          = process.env.AGENT_BENCH_URL || 'http://localhost:8080';
const TIMEOUT_MS          = Number(process.env.AGENT_BENCH_TIMEOUT_MS || 15000);
const EXPECTED_EMEA_COUNT = generateRows(100000, 42).filter(row => row.region === 'EMEA').length;

/**
 * @summary Arm-agnostic Playwright acceptance suite for the `grid-100k-multi-window` coding-agent benchmark.
 *
 * Grades Arm A (`react-ag-grid-mcp`), Arm B (`neo-kb-only`), and Arm C (`neo-kb-neural-link`) using identical
 * DOM, ARIA, and multi-window (`context.waitForEvent('page')`) assertions:
 * 1. `100,000` rows loaded and virtualized (`< 250` rendered `[role="row"]` DOM elements) with `Identity` and `Performance` grouped headers.
 * 2. Deterministic `arrUsd` descending sort (`ROW-000002` at `999900` visible, `ROW-000001` at `125000` pushed out of the virtualized viewport) and `region` filter (`EMEA` exact count `EXPECTED_EMEA_COUNT`, `ROW-000002` absent).
 * 3. Second-window (`window.open`) row-selection synchronization into `[data-testid="detail-view"]`.
 * 4. Zero uncaught `pageerror` or `console.error` events across both browser windows.
 */
test.describe('3-Arm Coding-Agent Benchmark — grid-100k-multi-window verification', () => {
    test('verifies 100k virtualization, grouped headers, sort, filter, and second-window detail sync', async ({page, context}) => {
        const errors = [];

        const attachErrorListeners = (targetPage, label) => {
            targetPage.on('pageerror', err => errors.push(`[${label}:pageerror] ${err.message}`));
            targetPage.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(`[${label}:console.error] ${msg.text()}`);
                }
            });
        };

        attachErrorListeners(page, 'primary');

        await page.goto(TARGET_URL, {waitUntil: 'networkidle'});

        // 1. 100,000 rows loaded + virtualized DOM slice (< 250 [role="row"] elements) + grouped column headers
        const totalCountLocator = page.getByTestId('total-row-count');
        await expect(totalCountLocator).toHaveText(/100,?000/, {timeout: TIMEOUT_MS});

        await expect(page.getByText('Identity', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('Performance', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('ROW-000001', {exact: true}).first()).toBeVisible();

        const domRowCount = await page.locator('[role="row"]').count();
        expect(domRowCount).toBeGreaterThan(0);
        expect(domRowCount).toBeLessThan(250);

        // 2. Deterministic sort (ARR descending puts ROW-000002 at the top and pushes ROW-000001 out of the top <250 viewport)
        await page.getByTestId('sort-arr-desc').click();
        await expect(page.getByText('ROW-000002', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('ROW-000001', {exact: true})).toHaveCount(0);

        await page.getByTestId('sort-reset').click();
        await expect(page.getByText('ROW-000001', {exact: true}).first()).toBeVisible();

        // 3. Deterministic region filter (EMEA exact count from generateRows(100000, 42), ROW-000002 (APAC) absent)
        const regionFilter = page.getByTestId('region-filter');
        await regionFilter.selectOption('EMEA');

        await expect(totalCountLocator).not.toHaveText(/100,?000/);
        const filteredCount = Number((await totalCountLocator.textContent())?.replace(/[^0-9]/g, ''));
        expect(filteredCount).toBe(EXPECTED_EMEA_COUNT);
        await expect(page.getByText('ROW-000001', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('ROW-000002', {exact: true})).toHaveCount(0);

        // 4. Second-window detail view synchronization
        const detailPagePromise = context.waitForEvent('page', {timeout: 10000});
        await page.getByTestId('open-detail-window').click();
        const detailPage = await detailPagePromise;
        attachErrorListeners(detailPage, 'detail');
        await detailPage.waitForLoadState('domcontentloaded');

        await expect(detailPage.getByTestId('detail-view')).toBeVisible({timeout: 10000});

        // Select ROW-000001 in primary window and verify second window updates
        await page.getByText('ROW-000001', {exact: true}).first().click();
        await expect(detailPage.getByTestId('detail-row-id')).toHaveText('ROW-000001');
        await expect(detailPage.getByTestId('detail-account-name')).toHaveText('Alpha Baseline 1');
        await expect(detailPage.getByTestId('detail-region')).toHaveText('EMEA');
        await expect(detailPage.getByTestId('detail-arr-usd')).toContainText('125000');

        // Reset filter, sort by ARR descending, select ROW-000002, and verify live second-window sync
        await regionFilter.selectOption('ALL');
        await page.getByTestId('sort-arr-desc').click();
        await expect(page.getByText('ROW-000002', {exact: true}).first()).toBeVisible();
        await expect(page.getByText('ROW-000001', {exact: true})).toHaveCount(0);
        await page.getByText('ROW-000002', {exact: true}).first().click();

        await expect(detailPage.getByTestId('detail-row-id')).toHaveText('ROW-000002');
        await expect(detailPage.getByTestId('detail-account-name')).toHaveText('Zenith Apex 2');
        await expect(detailPage.getByTestId('detail-region')).toHaveText('APAC');
        await expect(detailPage.getByTestId('detail-arr-usd')).toContainText('999900');

        expect(errors).toEqual([]);
    });
});
