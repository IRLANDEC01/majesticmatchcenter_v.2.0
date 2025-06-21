const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard', () => {
  test('should display the main heading', async ({ page }) => {
    // Navigate to the admin dashboard page
    await page.goto('/admin');

    // Find the main heading
    const heading = page.locator('h1');

    // Assert that the heading is visible and has the correct text
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Панель управления');
  });
}); 