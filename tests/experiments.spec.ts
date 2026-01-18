import { expect, test } from '@playwright/test';

test.describe('Experiments Page', () => {
  test('experiments page renders correctly', async ({ page }) => {
    await page.goto('/experiments', { waitUntil: 'networkidle' });

    await expect(page.locator('h1').first()).toContainText('EXPERIMENTS');

    const designSandboxLink = page.locator('a[href="/design-sandbox"]');
    await expect(designSandboxLink).toBeVisible();
  });

  test('navigation includes experiments link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const experimentsNav = page.locator('a[href="/experiments"]').first();
    await expect(experimentsNav).toBeAttached();
  });

  test('experiments page links to design sandbox', async ({ page }) => {
    await page.goto('/experiments', { waitUntil: 'networkidle' });

    await page.click('a[href="/design-sandbox"]');
    await page.waitForURL('/design-sandbox');

    await expect(page.locator('h1')).toContainText('DESIGN_SANDBOX');
  });
});

test.describe('Mermaid Diagrams', () => {
  test('mermaid diagram renders on diagrams page', async ({ page }) => {
    await page.goto('/design-sandbox/diagrams', { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const diagram = page.locator('.mermaid-diagram svg');
    await expect(diagram).toBeVisible({ timeout: 10000 });
  });

  test('mermaid diagram renders in blog post', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook', { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    const diagram = page.locator('.mermaid-diagram svg').first();
    await expect(diagram).toBeVisible({ timeout: 10000 });
  });
});
