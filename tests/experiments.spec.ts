import { expect, test } from '@playwright/test';

test.describe('Experiments Page', () => {
  test('experiments page renders correctly', async ({ page }) => {
    await page.goto('/experiments', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1').first()).toContainText('EXPERIMENTS');

    const designSandboxLink = page.locator('a[href="/design-sandbox"]');
    await expect(designSandboxLink).toBeVisible();
  });

  test('navigation includes experiments link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const experimentsNav = page.locator('a[href="/experiments"]').first();
    await expect(experimentsNav).toBeAttached();
  });

  test('experiments page links to design sandbox', async ({ page }) => {
    await page.goto('/experiments', { waitUntil: 'domcontentloaded' });

    await page.click('a[href="/design-sandbox"]');
    await page.waitForURL('/design-sandbox');

    await expect(page.locator('h1')).toContainText('DESIGN_SANDBOX');
  });
});

test.describe('Mermaid Diagrams', () => {
  test('mermaid diagram renders on diagrams page', async ({ page }) => {
    await page.goto('/design-sandbox/diagrams', {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(2000);

    const diagram = page.locator('.mermaid-diagram svg');
    await expect(diagram).toBeVisible({ timeout: 10000 });
  });

  test('mermaid diagram renders in blog post', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook', {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(2000);

    const diagram = page.locator('.mermaid-diagram svg').first();
    await expect(diagram).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Site rail foundation', () => {
  test('renders in both first-class themes, at two locations', async ({
    page,
  }) => {
    await page.goto('/design-sandbox/site-rail', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('h1')).toContainText('SITE_RAIL');

    // One rail per theme. Scoped to <main> because <html> carries the
    // reader's own theme class and would otherwise be counted.
    await expect(page.locator('main .dark')).toHaveCount(1);
    await expect(page.locator('main .sketch')).toHaveCount(1);
  });

  test('marks where the reader is, independently of which tab is open', async ({
    page,
  }) => {
    await page.goto('/design-sandbox/site-rail', {
      waitUntil: 'domcontentloaded',
    });

    const rail = page.locator('main .dark');
    const talks = rail.getByRole('tab', { name: 'TALKS' });
    const blog = rail.getByRole('tab', { name: 'BLOG' });

    // The dark panel is a reader on /talks: TALKS is both open and here, and
    // the page itself is marked on the inner rail.
    await expect(talks).toHaveAttribute('aria-selected', 'true');
    await expect(talks).toHaveAttribute('aria-current', 'location');
    await expect(rail.getByRole('link', { name: 'Talks' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Opening BLOG shows its pages without moving the reader: the location
    // stays on TALKS, the selection moves to BLOG.
    await blog.click();
    await expect(blog).toHaveAttribute('aria-selected', 'true');
    await expect(talks).toHaveAttribute('aria-selected', 'false');
    await expect(talks).toHaveAttribute('aria-current', 'location');
    await expect(blog).not.toHaveAttribute('aria-current', 'location');
    await expect(rail.getByRole('link', { name: 'Posts' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Talks' })).toHaveCount(0);
  });

  test('the section tabs are a vertical tablist with roving focus', async ({
    page,
  }) => {
    await page.goto('/design-sandbox/site-rail', {
      waitUntil: 'domcontentloaded',
    });

    const rail = page.locator('main .sketch');
    const tablist = rail.getByRole('tablist', { name: 'Site sections' });
    await expect(tablist).toHaveAttribute('aria-orientation', 'vertical');

    // The sketch panel is a reader on /ideas.
    const ideas = rail.getByRole('tab', { name: 'IDEAS' });
    const about = rail.getByRole('tab', { name: 'ABOUT' });
    const blog = rail.getByRole('tab', { name: 'BLOG' });

    await ideas.focus();
    await page.keyboard.press('ArrowDown');
    await expect(about).toBeFocused();
    await expect(about).toHaveAttribute('aria-selected', 'true');

    // Wraps at the end.
    await page.keyboard.press('ArrowDown');
    await expect(blog).toBeFocused();

    await page.keyboard.press('End');
    await expect(about).toBeFocused();

    // Only the selected tab is in the tab order.
    await expect(about).toHaveAttribute('tabindex', '0');
    await expect(ideas).toHaveAttribute('tabindex', '-1');
  });
});
