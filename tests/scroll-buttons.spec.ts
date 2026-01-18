import { expect, test } from '@playwright/test';

test.describe('Scroll Buttons Animation', () => {
  test('Menu button always visible, action buttons show when menu opens', async ({
    page,
  }) => {
    await page.goto('/blog/aws-batch/cookbook', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const menuButton = page.locator('button[aria-label="Open actions menu"]');
    await expect(menuButton).toBeVisible();

    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    const buttonContainer = tocButton.locator('..');
    const initialOpacity = await buttonContainer.evaluate(
      (el) => window.getComputedStyle(el).opacity,
    );
    expect(parseFloat(initialOpacity)).toBeLessThan(1);

    await menuButton.click();
    await page.waitForTimeout(300);

    const openOpacity = await buttonContainer.evaluate(
      (el) => window.getComputedStyle(el).opacity,
    );
    expect(parseFloat(openOpacity)).toBe(1);

    const closeButton = page.locator('button[aria-label="Close actions menu"]');
    await closeButton.click();
    await page.waitForTimeout(300);

    const closedOpacity = await buttonContainer.evaluate(
      (el) => window.getComputedStyle(el).opacity,
    );
    expect(parseFloat(closedOpacity)).toBeLessThan(1);
  });

  test('buttons have vertical slide animation classes', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const menuButton = page.locator('button[aria-label="Open actions menu"]');
    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    const buttonContainer = tocButton.locator('..');

    const classes = await buttonContainer.getAttribute('class');
    expect(classes).toContain('translate-y');
    expect(classes).toContain('transition-all');

    await menuButton.click();
    await page.waitForTimeout(300);

    const openClasses = await buttonContainer.getAttribute('class');
    expect(openClasses).toContain('translate-y-0');
  });
});
