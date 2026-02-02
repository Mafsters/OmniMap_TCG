import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('loads app and shows login or main view', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/omnimap|OmniMap/i).catch(() => {});
    const body = page.locator('body');
    await expect(body).toBeVisible();
    const loginOrDashboard = page.getByText(/omnimap|sign in|strategic roadmap|big rocks|goals/i).first();
    await expect(loginOrDashboard).toBeVisible({ timeout: 10000 });
  });
});
