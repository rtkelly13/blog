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

  // Regression: the drawer lives inside the sticky header, which carries
  // `backdrop-blur`. A non-`none` backdrop-filter makes that header the
  // containing block for `position: fixed` descendants, so the panel's
  // `h-full` resolved against the header (~80px) rather than the viewport —
  // the links spilled out below the painted panel and read as a menu with a
  // transparent background. Assert the geometry, not a screenshot, so the
  // check runs everywhere (visual baselines are CI-only).
  test('mobile nav panel covers the viewport behind its links', async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('expected a fixed viewport');

    await page.goto('/');
    await page.locator('button[aria-label="Toggle Menu"]').click();

    // The panel is the drawer div wrapping the link list.
    const panel = page.locator('nav.fixed').locator('xpath=..');
    const panelBox = await panel.boundingBox();
    if (!panelBox) throw new Error('expected the nav panel to be laid out');

    // It must reach the bottom of the viewport, not stop at the header.
    expect(panelBox.y + panelBox.height).toBeGreaterThanOrEqual(
      viewport.height,
    );

    // And every link must sit inside that painted area.
    const links = page.locator('nav.fixed a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const linkBox = await links.nth(i).boundingBox();
      if (!linkBox) throw new Error(`nav link ${i} was not laid out`);
      expect(linkBox.y).toBeGreaterThanOrEqual(panelBox.y);
      expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(
        panelBox.y + panelBox.height,
      );
    }
  });

  // Regression: the drawer used to live inside the header, a `z-50` stacking
  // context, so covering the viewport from there painted the panel over the
  // header's own controls and swallowed their clicks. It is portalled to
  // <body> at `z-40` now, so the header stays on top.
  test('site header stays interactive while the mobile nav is open', async ({
    page,
  }) => {
    await page.goto('/');

    const toggle = page.locator('button[aria-label="Toggle Menu"]');
    await toggle.click();
    await expect(
      page.locator('nav.fixed').getByRole('link', { name: 'Blog' }),
    ).toBeVisible();

    // Nothing may sit on top of the header's controls.
    const covered = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) throw new Error('expected a site header');
      return [...header.querySelectorAll('button')]
        .filter((button) => {
          const box = button.getBoundingClientRect();
          const top = document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          return !(top && button.contains(top));
        })
        .map((button) => button.getAttribute('aria-label'));
    });
    expect(covered).toEqual([]);

    // And the toggle still closes the drawer.
    await toggle.click();
    const panel = page.locator('nav.fixed').locator('xpath=..');
    await expect
      .poll(async () => (await panel.boundingBox())?.x ?? -1)
      .toBeGreaterThanOrEqual(page.viewportSize()?.width ?? 0);
  });

  // The drawer only slides off screen when closed (`translate-x-full`), which
  // hides it from sight but not from the keyboard. `inert` is what takes it out
  // of the tab order and the accessibility tree.
  test('closed mobile nav is out of the tab order', async ({ page }) => {
    await page.goto('/');
    // The drawer is portalled on mount, so wait for it to exist rather than
    // racing hydration and measuring an empty panel.
    await expect(page.locator('#mobile-nav-panel a').first()).toBeAttached();

    const reachable = await page.evaluate(() => {
      const links = [
        ...document.querySelectorAll<HTMLElement>('#mobile-nav-panel a'),
      ];
      return {
        total: links.length,
        focusable: links.filter((link) => {
          link.focus();
          return document.activeElement === link;
        }).length,
      };
    });

    expect(reachable.total).toBeGreaterThan(0);
    expect(reachable.focusable).toBe(0);
  });

  test('mobile nav closes on Escape and hands focus back', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('button[aria-label="Toggle Menu"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Focus must not be left on a control that has slid off screen.
    await expect(toggle).toBeFocused();
  });

  // Regression, two of them. The lock used to be set on <body>, which is not
  // the scrolling element here, so the page scrolled behind the open drawer.
  // And it was released only by the toggle handler, so hiding the drawer with
  // a resize instead of a click left the lock behind for good.
  //
  // Drive this with a real wheel gesture: `html` carries
  // `scroll-behavior: smooth`, so reading `scrollY` straight after a
  // `scrollTo` measures the animation rather than whether scrolling is
  // possible at all.
  test('the mobile nav locks page scroll, and lets go past lg', async ({
    page,
  }) => {
    await page.goto('/blog/aws-batch/cookbook');

    const wheelTo = async (y: number) => {
      await page.mouse.move(195, 600);
      await page.mouse.wheel(0, y);
      await page.waitForTimeout(400);
      return page.evaluate(() => window.scrollY);
    };

    // Scrolls freely to begin with.
    expect(await wheelTo(600)).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    await page.locator('button[aria-label="Toggle Menu"]').click();
    // Held while the drawer is open.
    expect(await wheelTo(600)).toBe(0);

    // Released when the drawer gives way to the inline nav.
    await page.setViewportSize({ width: 1280, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.overflow))
      .not.toBe('hidden');
    expect(await wheelTo(600)).toBeGreaterThan(0);
  });

  // Same `translate-x-full` pattern, same fix, on the post TOC drawer.
  test('closed post TOC is out of the tab order', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');
    await expect(page.locator('#post-toc-panel a').first()).toBeAttached();

    const reachable = await page.evaluate(() => {
      const links = [
        ...document.querySelectorAll<HTMLElement>('#post-toc-panel a'),
      ];
      return {
        total: links.length,
        focusable: links.filter((link) => {
          link.focus();
          return document.activeElement === link;
        }).length,
      };
    });

    expect(reachable.total).toBeGreaterThan(0);
    expect(reachable.focusable).toBe(0);
  });

  test('blog post TOC toggle button appears', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    await expect(tocButton).toBeVisible();
  });

  test('blog post TOC opens and closes', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook', {
      waitUntil: 'domcontentloaded',
    });

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

    // At tablet width the inline nav collapses to the hamburger menu (the full
    // inline nav only shows at lg+).
    const hamburger = page.locator('button[aria-label="Toggle Menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const mobileNavMenu = page.locator('nav.fixed');
    await expect(
      mobileNavMenu.getByRole('link', { name: 'Blog' }),
    ).toBeVisible();
    await expect(
      mobileNavMenu.getByRole('link', { name: 'Tags' }),
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
      page.getByRole('link', { name: '[ Talks ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ Tags ]', exact: true }),
    ).toBeVisible();
  });
});
