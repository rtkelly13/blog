import { expect, test } from '@playwright/test';

test.describe('Scroll Buttons Animation', () => {
  test('Menu button always visible, action buttons show when menu opens', async ({
    page,
  }) => {
    await page.goto('/blog/aws-batch/cookbook', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.evaluate(() => window.scrollTo(0, 0));

    const menuButton = page.locator('button[aria-label="Open actions menu"]');
    await expect(menuButton).toBeVisible();

    const tocButton = page.locator(
      'button[aria-label="Toggle table of contents"]',
    );
    const buttonContainer = tocButton.locator('..');
    // Closed: action container is faded out. Use auto-retrying toHaveCSS so we
    // assert the settled value rather than racing the 300ms transition.
    await expect(buttonContainer).toHaveCSS('opacity', '0');

    await menuButton.click();
    await expect(buttonContainer).toHaveCSS('opacity', '1');

    const closeButton = page.locator('button[aria-label="Close actions menu"]');
    await closeButton.click();
    await expect(buttonContainer).toHaveCSS('opacity', '0');
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
