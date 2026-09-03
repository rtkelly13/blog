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

test.describe('Notebook tabs foundation', () => {
  test('every treatment renders in both first-class themes', async ({
    page,
  }) => {
    await page.goto('/design-sandbox/notebook-tabs', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('h1')).toContainText('NOTEBOOK_TABS');

    // Six treatments, each rendered once per theme. The pairing is the point
    // of the page: a treatment that only works on one side is not a
    // foundation. Scoped to <main> because <html> carries the reader's own
    // theme class and would otherwise be counted.
    await expect(page.locator('main .dark')).toHaveCount(6);
    await expect(page.locator('main .sketch')).toHaveCount(6);
  });

  test('opening a tab closes the one it replaced', async ({ page }) => {
    await page.goto('/design-sandbox/notebook-tabs', {
      waitUntil: 'domcontentloaded',
    });

    const rail = page.locator('#flush .dark');
    const blog = rail.getByRole('button', { name: 'BLOG' });
    const talks = rail.getByRole('button', { name: 'TALKS' });

    await expect(blog).toHaveAttribute('aria-expanded', 'true');

    await talks.click();

    await expect(talks).toHaveAttribute('aria-expanded', 'true');
    await expect(blog).toHaveAttribute('aria-expanded', 'false');
  });

  test('the shell rail toggles its panel shut', async ({ page }) => {
    await page.goto('/design-sandbox/notebook-tabs', {
      waitUntil: 'domcontentloaded',
    });

    const shell = page.locator('#shell .dark');
    const blog = shell.getByRole('button', { name: 'BLOG' });

    await expect(blog).toHaveAttribute('aria-expanded', 'true');

    // Clicking the open tab shuts the panel, so the rail can sit at rest with
    // nothing selected — the state a header bar has no equivalent of.
    await blog.click();
    await expect(blog).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Blades — other geometries', () => {
  test('every geometry renders in both first-class themes', async ({
    page,
  }) => {
    await page.goto('/design-sandbox/blades', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('h1')).toContainText('BLADES');

    await expect(page.locator('main .dark')).toHaveCount(7);
    await expect(page.locator('main .sketch')).toHaveCount(7);
  });

  test('opening a rail blade closes the one it replaced', async ({ page }) => {
    await page.goto('/design-sandbox/blades', {
      waitUntil: 'domcontentloaded',
    });

    const rail = page.locator('#rail .dark');
    const blog = rail.getByRole('button', { name: 'BLOG' });
    const talks = rail.getByRole('button', { name: 'TALKS' });

    await expect(blog).toHaveAttribute('aria-expanded', 'true');

    await talks.click();

    await expect(talks).toHaveAttribute('aria-expanded', 'true');
    await expect(blog).toHaveAttribute('aria-expanded', 'false');
  });
});
