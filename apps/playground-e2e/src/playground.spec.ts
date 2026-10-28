import { test, expect } from '@playwright/test';

test('loads the playground', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Sheets playground');
  await expect(
    page.getByRole('heading', { name: 'Sheets playground' }),
  ).toBeVisible();
});
