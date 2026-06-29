import { expect, test } from '@playwright/test';

// NOTE: The "Blog Revival 2026" series posts (blog-upgrade-2026*) are currently
// `draft: true` and render an "Under Construction" placeholder, so the previous
// content assertions (expandable image, cookbook screenshot, reading time on the
// article) cannot pass. Those were removed until the series is published; the
// generic reading-time assertion below covers the listing in the meantime.

test.describe('Blog listing', () => {
  test('reading time displays in blog listing', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });

    const readingTimes = page.locator('text=/\\d+ min read/');
    await expect(readingTimes.first()).toBeVisible();
  });
});
