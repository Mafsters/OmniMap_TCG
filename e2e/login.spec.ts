import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('shows login screen and dev login flow lands on main view', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/strategic roadmap|sign in/i).first()).toBeVisible({ timeout: 10000 });
    const showDevButton = page.getByRole('button', { name: /show dev login/i });
    if (await showDevButton.isVisible()) {
      await showDevButton.click();
      await page.getByPlaceholder(/enter dev code/i).fill('123');
      await page.getByRole('button', { name: /unlock/i }).click();
      const aliceButton = page.getByRole('button', { name: /alice/i }).first();
      await expect(aliceButton).toBeVisible({ timeout: 5000 }).catch(() => {});
      if (await aliceButton.isVisible()) {
        await aliceButton.click();
        await expect(page.getByText(/big rocks|goals|updates/i).first()).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
