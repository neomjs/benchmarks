// @ts-check
import { test, expect } from '@playwright/test';

// Helper function to wait for the grid to be ready after an action
async function waitForGridReady(page, expectedRowCount) {
    await page.locator(`[role="grid"][aria-rowcount="${expectedRowCount}"]`).waitFor();
    // This is the crucial part: wait for the first row to actually be in the DOM.
    await page.locator('#neo-grid-body-1__row-0').waitFor();
}

test('Neo.mjs benchmark: Create 1k rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await waitForGridReady(page, 1002);
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to render 1k rows: ${duration}ms`);
  expect(duration).toBeLessThan(3000); // Keep the larger timeout for robustness
});

test('Neo.mjs benchmark: Create 10k rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  await page.getByRole('button', { name: 'Create 10k rows' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await waitForGridReady(page, 10002);
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to render 10k rows: ${duration}ms`);
  expect(duration).toBeLessThan(35000);
});

test('Neo.mjs benchmark: Update every 10th row', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await waitForGridReady(page, 1002);

  await page.getByRole('button', { name: 'Update every 10th row' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await expect(page.locator('#neo-grid-body-1__row-0__label')).toHaveText('updated row 1');
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to update 1k rows (every 10th): ${duration}ms`);
  expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Select row', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await waitForGridReady(page, 1002);

  await page.getByRole('button', { name: 'Select' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await page.locator('[role="row"][aria-selected="true"]').first().waitFor();
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to select a row: ${duration}ms`);
  expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Swap rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await waitForGridReady(page, 1002);

  const getVisibleLabels = () => page.locator('[role="gridcell"][aria-colindex="2"]').evaluateAll(elements => elements.map(el => el.textContent));
  const initialLabels = await getVisibleLabels();

  await page.getByRole('button', { name: 'Swap' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await expect(async () => {
    const newLabels = await getVisibleLabels();
    expect(newLabels).not.toEqual(initialLabels);
  }).toPass();
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to swap rows: ${duration}ms`);
  expect(duration).toBeLessThan(500);

  const newLabels = await getVisibleLabels();
  expect(newLabels.sort()).toEqual(initialLabels.sort());
});

test('Neo.mjs benchmark: Remove row', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await waitForGridReady(page, 1002);

  const initialAriaRowCount = await page.locator('[role="grid"]').getAttribute('aria-rowcount');
  
  await page.getByRole('button', { name: 'Remove' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await page.locator(`[role="grid"][aria-rowcount="${parseInt(initialAriaRowCount) - 1}"]`).waitFor();
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to remove a row: ${duration}ms`);
  expect(duration).toBeLessThan(200);
});

test('Neo.mjs benchmark: Clear rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await waitForGridReady(page, 1002);

  await page.getByRole('button', { name: 'Clear' }).click();
  const startTime = await page.evaluate(() => performance.now());

  await page.locator('[role="grid"][aria-rowcount="2"]').waitFor();
  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  test.info().annotations.push({ type: 'duration', description: `${duration}` });
  console.log(`Time to clear rows: ${duration}ms`);
  expect(duration).toBeLessThan(500);
});