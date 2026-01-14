import { expect, test } from '@playwright/test';

/**
 * Visual regression tests for the blog.
 *
 * These tests only run on Linux (CI environment) because Playwright screenshots
 * are platform-specific due to font rendering differences.
 *
 * To update snapshots:
 * 1. Trigger the GitHub Actions workflow manually with 'update_snapshots' enabled
 * 2. Download the 'playwright-snapshots' artifact
 * 3. Extract to tests/__snapshots__/ and commit
 */

// Skip visual tests on non-Linux platforms (local dev on macOS/Windows)
test.skip(process.platform !== 'linux', 'Visual tests only run on Linux CI');

// Helper to wait for page to be fully loaded
async function waitForPageReady(page: import('@playwright/test').Page) {
  // Wait for network to be idle and no pending requests
  await page.waitForLoadState('networkidle');
  // Additional wait for any animations/transitions to settle
  await page.waitForTimeout(500);
}

// Helper to set dark mode before navigation
async function setDarkMode(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
  });
}

test.describe('Visual Regression - Light Mode', () => {
  test('homepage', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('homepage-light.png', {
      fullPage: true,
    });
  });

  test('blog listing', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('blog-light.png', { fullPage: true });
  });

  test('blog post', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('blog-post-light.png', {
      fullPage: true,
    });
  });

  test('about page', async ({ page }) => {
    await page.goto('/about');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('about-light.png', { fullPage: true });
  });

  test('projects page', async ({ page }) => {
    await page.goto('/projects');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('projects-light.png', {
      fullPage: true,
    });
  });

  test('tags page', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tags-light.png', { fullPage: true });
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('404-light.png', { fullPage: true });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setDarkMode(page);
  });

  test('homepage', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    // Verify dark mode is active
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
    });
  });

  test('blog listing', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('blog-dark.png', { fullPage: true });
  });

  test('blog post', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('blog-post-dark.png', {
      fullPage: true,
    });
  });

  test('about page', async ({ page }) => {
    await page.goto('/about');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('about-dark.png', { fullPage: true });
  });

  test('projects page', async ({ page }) => {
    await page.goto('/projects');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('projects-dark.png', {
      fullPage: true,
    });
  });

  test('tags page', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('tags-dark.png', { fullPage: true });
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('404-dark.png', { fullPage: true });
  });
});
