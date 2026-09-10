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
async function setMidnight(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'midnight');
  });
}

/**
 * Two levels, two describe blocks.
 *
 * There used to be four. `Light Mode` set no theme at all, so it re-shot the
 * default — all seven of its baselines were byte-identical to the dark ones,
 * dead weight inherited from the upstream starter. `Dim Mode` became a
 * duplicate of this block when `dim` collapsed into `midnight` in design-system
 * 0.5.0. Both are gone, with their baselines: 26 themed shots down to 13.
 */
test.describe('Visual Regression - Midnight', () => {
  test.beforeEach(async ({ page }) => {
    await setMidnight(page);
  });

  test('homepage', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    // Verify midnight is active
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('homepage-midnight.png', {
      fullPage: true,
    });
  });

  test('blog listing', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('blog-midnight.png', {
      fullPage: true,
    });
  });

  test('blog post', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('blog-post-midnight.png', {
      fullPage: true,
    });
  });

  test('about page', async ({ page }) => {
    await page.goto('/about');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('about-midnight.png', {
      fullPage: true,
    });
  });

  test('tags page', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('tags-midnight.png', {
      fullPage: true,
    });
  });

  test('talks page', async ({ page }) => {
    await page.goto('/talks');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('talks-midnight.png', {
      fullPage: true,
    });
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageReady(page);
    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page).toHaveScreenshot('404-midnight.png', { fullPage: true });
  });
});

// Set a specific theme (next-themes stores the key in localStorage) before the
// first navigation, so the page renders in that theme from the initial paint.
async function setTheme(
  page: import('@playwright/test').Page,
  theme: 'midnight' | 'sketch',
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
