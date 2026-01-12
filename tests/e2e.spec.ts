import { expect, test } from '@playwright/test';

test('homepage has title and links to blog', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Ryan Kelly/);

  // Check for some main content
  await expect(page.locator('h1').first()).toBeVisible();
});

test('navigate to blog and open a post', async ({ page }) => {
  await page.goto('/');

  // Click the Blog link.
  await page.click('text=Blog');

  // Expects the URL to contain intro.
  await expect(page).toHaveURL(/.*blog/);

  // Click on the first article
  await page.click('h3 > a');

  // Expect to see article content
  await expect(page.locator('article')).toBeVisible();
});
