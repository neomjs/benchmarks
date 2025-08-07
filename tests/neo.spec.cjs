// @ts-check
const { test, expect } = require('@playwright/test');

test('Neo.mjs benchmark app loads', async ({ page }) => {
  await page.goto('/apps/benchmarks/');
  await expect(page).toHaveTitle('Benchmarks');
});
