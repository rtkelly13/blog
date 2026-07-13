import { expect, type Page, test } from '@playwright/test';

/**
 * Regression tests for the dark / dim contrast toggle (components/ThemeSwitch).
 *
 * These are functional (computed-style) assertions rather than pixel snapshots,
 * so they run on every platform and pin the *behaviour* of the theme system:
 *
 *  - the toggle exists and is reachable,
 *  - `dark` is the default and `dim` is opt-in,
 *  - switching actually re-themes the rendered surface (body + reading copy),
 *  - the softened palette matches the tokens defined in css/tailwind.css,
 *  - the choice persists across reloads (next-themes localStorage),
 *  - bright accent colours are NOT disturbed by the dim overrides.
 *
 * The exact RGB values below are the source of truth for the dim palette; if
 * css/tailwind.css changes them, update here in lockstep.
 */

// Expected palette (hex tokens from css/tailwind.css, as computed RGB).
const DARK_BG = 'rgb(0, 0, 0)'; // --color-black default
const DARK_FG = 'rgb(255, 255, 255)'; // --color-white default
const DIM_BG = 'rgb(23, 23, 27)'; // #17171b
const DIM_FG = 'rgb(216, 216, 210)'; // #d8d8d2
const DIM_HEADING = 'rgb(234, 234, 228)'; // #eaeae4
const ACCENT_CYAN = 'rgb(34, 211, 238)'; // brutalist-cyan, must stay constant

const toggle = (page: Page) => page.getByRole('button', { name: /^Contrast:/ });

const bodyStyle = (page: Page, prop: string) =>
  page.evaluate(
    (p) => getComputedStyle(document.body).getPropertyValue(p),
    prop,
  );

const htmlVar = (page: Page, name: string) =>
  page.evaluate(
    (n) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );

test.describe('Theme toggle — homepage', () => {
  test('defaults to the high-contrast dark theme', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).not.toHaveClass(/dim/);
    expect(await bodyStyle(page, 'background-color')).toBe(DARK_BG);
    expect(await bodyStyle(page, 'color')).toBe(DARK_FG);
  });

  test('toggle is present and labelled for assistive tech', async ({
    page,
  }) => {
    await page.goto('/');

    const button = toggle(page);
    await expect(button).toBeVisible();
    // Default label announces the current level and the switch target.
    await expect(button).toHaveAttribute(
      'aria-label',
      'Contrast: HIGH. Switch to DIM.',
    );
  });

  test('switching to dim softens the whole surface', async ({ page }) => {
    await page.goto('/');

    await toggle(page).click();

    // Single `dim` class on <html> (not `dark`); the `dark:` variant is taught
    // to also match `.dim`, so every `dark:` utility keeps applying.
    await expect(page.locator('html')).toHaveClass(/dim/);
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    expect(await bodyStyle(page, 'background-color')).toBe(DIM_BG);
    expect(await bodyStyle(page, 'color')).toBe(DIM_FG);

    // The palette tokens themselves are re-pointed (the mechanism the whole
    // site relies on), not just the body.
    expect(await htmlVar(page, '--color-black')).toBe('#17171b');
    expect(await htmlVar(page, '--color-white')).toBe('#d8d8d2');

    // Label now reflects the flipped state.
    await expect(toggle(page)).toHaveAttribute(
      'aria-label',
      'Contrast: DIM. Switch to HIGH.',
    );
  });

  test('toggling back restores pure black-on-white contrast', async ({
    page,
  }) => {
    await page.goto('/');

    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    await toggle(page).click();
    await expect(page.locator('html')).not.toHaveClass(/dim/);
    expect(await bodyStyle(page, 'background-color')).toBe(DARK_BG);
    expect(await bodyStyle(page, 'color')).toBe(DARK_FG);
  });

  test('the chosen theme persists across reloads', async ({ page }) => {
    await page.goto('/');

    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    await page.reload();

    await expect(page.locator('html')).toHaveClass(/dim/);
    expect(await bodyStyle(page, 'background-color')).toBe(DIM_BG);
    // next-themes records the *key*, not the mapped class list.
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
      'dim',
    );
  });

  test('bright accent colours are unaffected by the dim overrides', async ({
    page,
  }) => {
    await page.goto('/');

    // Probe a real element painted with the brutalist-cyan accent. Injected
    // into the page so the assertion does not depend on incidental content.
    const readAccent = () =>
      page.evaluate(() => {
        const el = document.createElement('div');
        el.className = 'bg-brutalist-cyan';
        el.style.display = 'none';
        document.body.appendChild(el);
        const bg = getComputedStyle(el).backgroundColor;
        el.remove();
        return bg;
      });

    expect(await readAccent()).toBe(ACCENT_CYAN);

    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    // Same accent after switching — dim only re-points black/white/zinc tokens.
    expect(await readAccent()).toBe(ACCENT_CYAN);
  });
});

test.describe('Theme toggle — blog post', () => {
  const POST = '/blog/aws-batch/cookbook';

  test('toggle is available on a reading page', async ({ page }) => {
    await page.goto(POST);
    await expect(toggle(page)).toBeVisible();
    await expect(page.locator('article .prose')).toBeVisible();
  });

  test('dim softens the reading surface (background and headings)', async ({
    page,
  }) => {
    await page.goto(POST);

    const heading = page.locator('article .prose :is(h1, h2, h3)').first();
    await expect(heading).toBeVisible();

    // Baseline: pure white heading on pure black in the default theme.
    expect(await bodyStyle(page, 'background-color')).toBe(DARK_BG);
    const darkHeading = await heading.evaluate(
      (el) => getComputedStyle(el).color,
    );
    expect(darkHeading).toBe(DARK_FG);

    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    // Reading surface softens: charcoal background, off-white headings.
    expect(await bodyStyle(page, 'background-color')).toBe(DIM_BG);
    expect(await heading.evaluate((el) => getComputedStyle(el).color)).toBe(
      DIM_HEADING,
    );
  });

  test('the chosen theme persists onto a blog post', async ({ page }) => {
    await page.goto('/');
    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    // Navigate to the post; the preference should carry over.
    await page.goto(POST);
    await expect(page.locator('html')).toHaveClass(/dim/);
    expect(await bodyStyle(page, 'background-color')).toBe(DIM_BG);
  });
});
