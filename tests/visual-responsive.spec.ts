import { expect, test } from '@playwright/test';

test.skip(process.platform !== 'linux', 'Visual tests only run on Linux CI');

async function waitForPageReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

test.describe('Visual Regression - Mobile (iPhone 12)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('homepage mobile', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
    });
  });

  test('blog listing mobile', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('mobile-blog-listing.png', {
      fullPage: true,
    });
  });

  test('blog post mobile - TOC closed', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('mobile-blog-post.png', {
      fullPage: true,
    });
  });

  test('blog post mobile - TOC open', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);

    const tocButton = page.locator('button[aria-label*="table of contents"]');
    await tocButton.click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-blog-post-toc-open.png', {
      fullPage: false,
    });
  });

  test('tags page mobile', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('mobile-tags.png', {
      fullPage: true,
    });
  });

  test('about page mobile', async ({ page }) => {
    await page.goto('/about');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('mobile-about.png', {
      fullPage: true,
    });
  });

  test('404 page mobile', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('mobile-404.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Tablet (iPad)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage tablet', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-homepage.png', {
      fullPage: true,
    });
  });

  test('blog listing tablet', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-blog-listing.png', {
      fullPage: true,
    });
  });

  test('blog post tablet - TOC closed', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-blog-post.png', {
      fullPage: true,
    });
  });

  test('blog post tablet - TOC open', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);

    const tocButton = page.locator('button[aria-label*="table of contents"]');
    await tocButton.click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('tablet-blog-post-toc-open.png', {
      fullPage: false,
    });
  });

  test('tags page tablet', async ({ page }) => {
    await page.goto('/tags');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-tags.png', {
      fullPage: true,
    });
  });

  test('about page tablet', async ({ page }) => {
    await page.goto('/about');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-about.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Tablet Landscape (iPad Pro)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('homepage tablet landscape', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-landscape-homepage.png', {
      fullPage: true,
    });
  });

  test('blog post tablet landscape with TOC sidebar', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('tablet-landscape-blog-post.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Small Mobile (iPhone SE)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage small mobile', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('small-mobile-homepage.png', {
      fullPage: true,
    });
  });

  test('blog post small mobile', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot('small-mobile-blog-post.png', {
      fullPage: true,
    });
  });
});
