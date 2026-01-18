import { expect, test } from '@playwright/test';

test.describe('Mobile - iPhone 12 (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Ryan Kelly/);
    await expect(page.locator('h1').first()).toBeVisible();

    const mobileNav = page
      .locator('[role="button"]')
      .filter({ hasText: /menu/i });
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('mobile navigation works', async ({ page }) => {
    await page.goto('/');

    const hamburger = page.locator('button[aria-label="Toggle Menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const mobileNavMenu = page.locator('nav.fixed');
    await expect(
      mobileNavMenu.getByRole('link', { name: 'Blog' }),
    ).toBeVisible();
  });

  test('blog post TOC toggle button appears', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    await expect(tocButton).toBeVisible();
  });

  test('blog post TOC opens and closes', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook', { waitUntil: 'networkidle' });

    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(500);

    const menuButton = page.locator('button[aria-label="Open actions menu"]');
    await menuButton.click();
    await page.waitForTimeout(300);

    const tocToggleButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    const tocAside = page.locator('aside').filter({ hasText: /CONTENTS/i });

    await tocToggleButton.click();
    await expect(tocAside).toHaveClass(/translate-x-0/);

    const tocCloseButton = page.locator(
      'button[aria-label="Close table of contents"]',
    );
    await tocCloseButton.click();
    await expect(tocAside).toHaveClass(/translate-x-full/);
  });

  test('blog post content is readable', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    await expect(page.locator('article h1').first()).toBeVisible();
    await expect(page.locator('article .prose')).toBeVisible();
  });

  test('tags page is accessible', async ({ page }) => {
    await page.goto('/tags');

    await expect(page).toHaveTitle(/Tags/);
    await expect(page.locator('a[href^="/tags/"]').first()).toBeVisible();
  });
});

test.describe('Tablet - iPad (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Ryan Kelly/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('navigation is accessible', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('link', { name: '[ Blog ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ Tags ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ About ]', exact: true }),
    ).toBeVisible();
  });

  test('blog post TOC toggle button appears', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    await expect(tocButton).toBeVisible();
  });

  test('blog post layout is comfortable', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    await expect(page.locator('article h1').first()).toBeVisible();
    await expect(page.locator('article .prose')).toBeVisible();

    const content = page.locator('article .prose');
    const box = await content.boundingBox();
    expect(box?.width).toBeGreaterThan(400);
  });

  test('can navigate between posts', async ({ page }) => {
    await page.goto('/blog');

    await page.locator('h3 > a').first().click();

    await expect(page.locator('article h1').first()).toBeVisible();
  });
});

test.describe('Mobile Landscape - iPhone 12 Pro (844x390)', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('homepage is usable in landscape', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Ryan Kelly/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('blog post is readable in landscape', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    await expect(page.locator('article h1').first()).toBeVisible();
    await expect(page.locator('article .prose')).toBeVisible();
  });
});

test.describe('Small Mobile - iPhone SE (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage renders on small screen', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Ryan Kelly/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('blog post is accessible on small screen', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    await expect(page.locator('article h1').first()).toBeVisible();

    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    await expect(tocButton).toBeVisible();
  });

  test('text does not overflow', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe('Tablet Landscape - iPad Pro (1024x768)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('homepage uses desktop-like layout', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Ryan Kelly/);
    await expect(
      page.getByRole('link', { name: '[ Blog ]', exact: true }),
    ).toBeVisible();
  });

  test('blog post shows TOC sidebar', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    await expect(page.locator('article h1').first()).toBeVisible();

    const aside = page.locator('aside').filter({ hasText: /CONTENTS/i });
    await expect(aside).toBeVisible();
  });

  test('full navigation is visible', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('link', { name: '[ Blog ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ Tags ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ About ]', exact: true }),
    ).toBeVisible();
  });
});
