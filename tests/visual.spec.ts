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
  // Wait for DOM content to be loaded (more reliable than networkidle with broken images)
  await page.waitForLoadState('domcontentloaded');
  // Wait for fonts and initial render
  await page.waitForTimeout(1000);
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

  test('tags page', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tags-light.png', { fullPage: true });
  });

  test('talks page', async ({ page }) => {
    await page.goto('/talks');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('talks-light.png', { fullPage: true });
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

  test('tags page', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('tags-dark.png', { fullPage: true });
  });

  test('talks page', async ({ page }) => {
    await page.goto('/talks');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('talks-dark.png', { fullPage: true });
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('404-dark.png', { fullPage: true });
  });
});

// Set a specific theme (next-themes stores the key in localStorage) before the
// first navigation, so the page renders in that theme from the initial paint.
async function setTheme(
  page: import('@playwright/test').Page,
  theme: 'dark' | 'dim' | 'sketch',
) {
  await page.addInitScript((t) => {
    localStorage.setItem('theme', t);
  }, theme);
}

// Basic pathways exercised for the softened `dim` and light `sketch` themes.
const THEMED_PATHWAYS = [
  { name: 'homepage', path: '/' },
  { name: 'blog', path: '/blog' },
  { name: 'blog-post', path: '/blog/aws-batch/cookbook' },
  { name: 'tags', path: '/tags' },
  { name: 'about', path: '/about' },
  { name: 'talks', path: '/talks' },
] as const;

test.describe('Visual Regression - Dim Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setTheme(page, 'dim');
  });

  for (const { name, path } of THEMED_PATHWAYS) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await waitForPageReady(page);
      await expect(page.locator('html')).toHaveClass(/dim/);
      await expect(page).toHaveScreenshot(`${name}-dim.png`, {
        fullPage: true,
      });
    });
  }
});

test.describe('Visual Regression - Sketch Mode', () => {
  test.beforeEach(async ({ page }) => {
    await setTheme(page, 'sketch');
  });

  for (const { name, path } of THEMED_PATHWAYS) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await waitForPageReady(page);
      await expect(page.locator('html')).toHaveClass(/sketch/);
      await expect(page).toHaveScreenshot(`${name}-sketch.png`, {
        fullPage: true,
      });
    });
  }
});
