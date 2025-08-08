// @ts-check
import { test, expect } from '@playwright/test';

test('Neo.mjs benchmark: Create 1k rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // Click the "Create 1k rows" button
  await page.getByRole('button', { name: 'Create 1k rows' }).click();

  const startTime = await page.evaluate(() => performance.now());

  // Wait for the grid to have 1000 rows
  await page.locator('[role="grid"][aria-rowcount="1002"]').waitFor();

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to render 1k rows: ${duration}ms`);

  expect(duration).toBeLessThan(1000);
});

test('Neo.mjs benchmark: Create 10k rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // Click the "Create 10k rows" button
  await page.getByRole('button', { name: 'Create 10k rows' }).click();

  const startTime = await page.evaluate(() => performance.now());

  // Wait for the grid to have 10000 rows
  await page.locator('[role="grid"][aria-rowcount="10002"]').waitFor();

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to render 10k rows: ${duration}ms`);

  expect(duration).toBeLessThan(35000);
});

test('Neo.mjs benchmark: Update every 10th row', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // First, create 1k rows to operate on
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await page.locator('[role="grid"][aria-rowcount="1002"]').waitFor();

  const startTime = await page.evaluate(() => performance.now());

  // Click the "Update every 10th row" button
  await page.getByRole('button', { name: 'Update every 10th row' }).click();

  // Wait for a specific cell to update its content
  // Assuming the first updated row is at index 0 (id 1), its label will change to 'updated row 1'
  await expect(page.locator('#neo-grid-body-1__row-0__label')).toHaveText('updated row 1');

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to update 1k rows (every 10th): ${duration}ms`);

  expect(duration).toBeLessThan(250);
});

test('Neo.mjs benchmark: Select row', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // First, create 1k rows to operate on
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await page.locator('[role="grid"][aria-rowcount="1002"]').waitFor();

  const startTime = await page.evaluate(() => performance.now());

  // Click the "Select" button
  await page.getByRole('button', { name: 'Select' }).click();

  // Wait for at least one row to be selected
  await page.locator('[role="row"][aria-selected="true"]').first().waitFor();

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to select a row: ${duration}ms`);

  expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Swap rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // First, create 1k rows to operate on
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await page.locator('[role="grid"][aria-rowcount="1002"]').waitFor();

  // Get initial text of two rows to verify swap
  const initialText1 = await page.locator('#neo-grid-body-1__row-0__label').textContent();
  const initialText2 = await page.locator('#neo-grid-body-1__row-1__label').textContent();

  const startTime = await page.evaluate(() => performance.now());

  // Click the "Swap" button
  await page.getByRole('button', { name: 'Swap' }).click();

  // Wait for the text content of the two rows to change (swap)
  await expect(page.locator('#neo-grid-body-1__row-0__label')).not.toHaveText(initialText1);
  await expect(page.locator('#neo-grid-body-1__row-1__label')).not.toHaveText(initialText2);

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to swap rows: ${duration}ms`);

  expect(duration).toBeLessThan(500);
});

test('Neo.mjs benchmark: Remove row', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // First, create 1k rows to operate on
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await page.locator('[role="grid"][aria-rowcount="1002"]').waitFor();

  // Get initial aria-rowcount
  const initialAriaRowCount = await page.locator('[role="grid"]').getAttribute('aria-rowcount');

  const startTime = await page.evaluate(() => performance.now());

  // Click the "Remove" button
  await page.getByRole('button', { name: 'Remove' }).click();

  // Wait for the row count to decrease by 1
  await page.locator('[role="grid"][aria-rowcount="' + (parseInt(initialAriaRowCount) - 1) + '"]').waitFor();

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to remove a row: ${duration}ms`);

  expect(duration).toBeLessThan(200);
});

test('Neo.mjs benchmark: Clear rows', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');

  // First, create 1k rows to operate on
  await page.getByRole('button', { name: 'Create 1k rows' }).click();
  await page.locator('[role="grid"][aria-rowcount="1002"]').waitFor();

  const startTime = await page.evaluate(() => performance.now());

  // Click the "Clear" button
  await page.getByRole('button', { name: 'Clear' }).click();

  // Wait for the row count to return to 2 (header + wrapper)
  await page.locator('[role="grid"][aria-rowcount="2"]').waitFor();

  const endTime = await page.evaluate(() => performance.now());

  const duration = endTime - startTime;
  console.log(`Time to clear rows: ${duration}ms`);

  expect(duration).toBeLessThan(500);
});
