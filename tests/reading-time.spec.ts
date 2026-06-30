import { expect, test } from '@playwright/test';

test.describe('Reading time', () => {
  // Reading time is surfaced on the blog listing (ListLayout); the individual
  // post layout (PostLayout) does not render it, so there is nothing to assert
  // on a post page.
  test('reading time displays in blog listing', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const readingTimes = page.locator('text=/\\d+ min read/');
    await expect(readingTimes.first()).toBeVisible();
  });
});
