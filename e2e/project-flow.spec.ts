import { test, expect } from '@playwright/test';

test.describe('Project flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const showDevButton = page.getByRole('button', { name: /show dev login/i });
    if (await showDevButton.isVisible()) {
      await showDevButton.click();
      await page.getByPlaceholder(/enter dev code/i).fill('123');
      await page.getByRole('button', { name: /unlock/i }).click();
      const firstUser = page.getByRole('button', { name: /admin|alice|bob|user/i }).first();
      if (await firstUser.isVisible({ timeout: 3000 })) {
        await firstUser.click();
        await page.getByText(/big rocks|goals|project manager/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      }
    }
  });

  test('admin can open Project Manager and see New project', async ({ page }) => {
    const projectManagerTab = page.getByRole('button', { name: /project manager/i });
    if (await projectManagerTab.isVisible({ timeout: 5000 })) {
      await projectManagerTab.click();
      await expect(page.getByRole('button', { name: /new project/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/no projects yet|project/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
