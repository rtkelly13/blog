import { expect, type Page, test } from '@playwright/test';

/**
 * Regression tests for the three-way theme toggle (components/ThemeSwitch):
 * dark (HIGH) → dim → sketch → dark.
 *
 * These are functional (computed-style) assertions rather than pixel snapshots,
 * so they run on every platform and pin the *behaviour* of the theme system:
 *
 *  - `dark` is the default; the toggle cycles through all three themes,
 *  - each theme actually re-themes the rendered surface (body + reading copy),
 *  - the palettes match the tokens defined in css/tailwind.css,
 *  - accents stay put in dark/dim and become blue/red/green under sketch,
 *  - the choice persists across reloads (next-themes localStorage).
 *
 * The exact RGB values below are the source of truth for the palettes; if
 * css/tailwind.css changes them, update here in lockstep.
 */

// Dark (default) + dim (softened dark) tokens.
const DARK_BG = 'rgb(0, 0, 0)'; // --color-black default
const DARK_FG = 'rgb(255, 255, 255)'; // --color-white default
const DIM_BG = 'rgb(23, 23, 27)'; // #17171b
const DIM_FG = 'rgb(216, 216, 210)'; // #d8d8d2
const DIM_HEADING = 'rgb(234, 234, 228)'; // #eaeae4

// Sketch (light paper/ink) tokens.
const SKETCH_BG = 'rgb(245, 243, 236)'; // #f5f3ec paper
const SKETCH_FG = 'rgb(35, 38, 46)'; // #23262e ink
const SKETCH_HEADING = 'rgb(28, 31, 39)'; // #1c1f27

// Accents: constant cyan in dark/dim; blue under sketch.
const ACCENT_CYAN = 'rgb(34, 211, 238)'; // #22d3ee (dark/dim)
const ACCENT_BLUE = 'rgb(37, 99, 235)'; // #2563eb (sketch)

const toggle = (page: Page) => page.getByRole('button', { name: /^Theme:/ });

const bodyStyle = (page: Page, prop: string) =>
  page.evaluate(
    (p) => getComputedStyle(document.body).getPropertyValue(p),
    prop,
  );

// Read the computed colour of a throwaway element painted with an accent
// utility, so the assertion doesn't depend on incidental page content.
const readAccentBg = (page: Page, className: string) =>
  page.evaluate((cls) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.display = 'none';
    document.body.appendChild(el);
    const bg = getComputedStyle(el).backgroundColor;
    el.remove();
    return bg;
  }, className);

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
    // Label announces the current theme and the next one in the cycle.
    await expect(button).toHaveAttribute(
      'aria-label',
      'Theme: HIGH. Switch to DIM.',
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
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-black')
          .trim(),
      ),
    ).toBe('#17171b');

    await expect(toggle(page)).toHaveAttribute(
      'aria-label',
      'Theme: DIM. Switch to SKETCH.',
    );
  });

  test('switching to sketch inverts to light paper with blue accents', async ({
    page,
  }) => {
    await page.goto('/');

    // dark → dim → sketch
    await toggle(page).click();
    await toggle(page).click();

    await expect(page.locator('html')).toHaveClass(/sketch/);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('html')).not.toHaveClass(/dim/);

    // Light paper background, dark ink text.
    expect(await bodyStyle(page, 'background-color')).toBe(SKETCH_BG);
    expect(await bodyStyle(page, 'color')).toBe(SKETCH_FG);

    // The neon cyan accent becomes blue under sketch...
    expect(await readAccentBg(page, 'bg-brutalist-cyan')).toBe(ACCENT_BLUE);

    await expect(toggle(page)).toHaveAttribute(
      'aria-label',
      'Theme: SKETCH. Switch to HIGH.',
    );
  });

  test('cycles all the way back to dark', async ({ page }) => {
    await page.goto('/');

    // dark → dim → sketch → dark
    await toggle(page).click();
    await toggle(page).click();
    await toggle(page).click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).not.toHaveClass(/dim/);
    await expect(page.locator('html')).not.toHaveClass(/sketch/);
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
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
      'dim',
    );
  });

  test('accents stay constant in dark and dim', async ({ page }) => {
    await page.goto('/');

    expect(await readAccentBg(page, 'bg-brutalist-cyan')).toBe(ACCENT_CYAN);

    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    // dim only re-points the black/white/zinc tokens, not the accents.
    expect(await readAccentBg(page, 'bg-brutalist-cyan')).toBe(ACCENT_CYAN);
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
    expect(await heading.evaluate((el) => getComputedStyle(el).color)).toBe(
      DARK_FG,
    );

    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/dim/);

    // Reading surface softens: charcoal background, off-white headings.
    expect(await bodyStyle(page, 'background-color')).toBe(DIM_BG);
    expect(await heading.evaluate((el) => getComputedStyle(el).color)).toBe(
      DIM_HEADING,
    );
  });

  test('sketch turns the reading surface to ink on paper', async ({ page }) => {
    await page.goto(POST);

    const heading = page.locator('article .prose :is(h1, h2, h3)').first();
    await expect(heading).toBeVisible();

    // dark → dim → sketch
    await toggle(page).click();
    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/sketch/);

    expect(await bodyStyle(page, 'background-color')).toBe(SKETCH_BG);
    expect(await heading.evaluate((el) => getComputedStyle(el).color)).toBe(
      SKETCH_HEADING,
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
