import { expect, test } from '@playwright/test';

test.describe('Blog Upgrade Article', () => {
  test('expandable image component renders', async ({ page }) => {
    await page.goto('/blog/blog-upgrade-2026', { waitUntil: 'networkidle' });

    await expect(page.locator('h1').first()).toContainText('Reviving My Blog');

    const expandButton = page.locator('button:has-text("Expand Full Image")');
    await expect(expandButton).toBeVisible();

    const fullscreenButton = page.locator('button:has-text("Fullscreen")');
    await expect(fullscreenButton).toBeVisible();

    const cookbookImage = page.locator('img[alt*="Full screenshot"]');
    await expect(cookbookImage).toBeVisible();
  });

  test('cookbook screenshot is visible', async ({ page }) => {
    await page.goto('/blog/blog-upgrade-2026', { waitUntil: 'networkidle' });

    const image = page.locator('img[alt*="Full screenshot"]');
    await expect(image).toBeVisible();

    const imageSrc = await image.getAttribute('src');
    expect(imageSrc).toContain('cookbook-full');
  });

  test('reading time displays correctly', async ({ page }) => {
    await page.goto('/blog/blog-upgrade-2026', { waitUntil: 'networkidle' });

    const readingTime = page.locator('text=/\\d+ min read/');
    await expect(readingTime).toBeVisible();
  });

  test('reading time displays in blog listing', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' });

    const readingTimes = page.locator('text=/\\d+ min read/');
    await expect(readingTimes.first()).toBeVisible();
  });
});
