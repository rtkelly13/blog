import { expect, type Page, test } from '@playwright/test';

/**
 * Regression tests for the two-way theme toggle (components/ThemeSwitch):
 * `midnight` → `sketch` → `midnight`.
 *
 * Functional (computed-style) assertions rather than pixel snapshots, so they
 * run on every platform and pin the *behaviour* of the theme system:
 *
 *  - `midnight` is the default; the toggle cycles both themes,
 *  - each one actually re-themes the rendered surface (body + reading copy),
 *  - the values come from the design system, not from this repo,
 *  - the choice persists across reloads (next-themes localStorage).
 *
 * ## Two things this file used to assert that were wrong
 *
 * It was a **three**-way toggle — `dark (HIGH) → dim → sketch` — and design-system
 * 0.5.0 collapsed the ladder to two Levels, so `dim` is gone and `dark` is now
 * `midnight`.
 *
 * More importantly it asserted `DARK_BG = 'rgb(0, 0, 0)'` with the comment
 * *"--color-black default"*. That was pure black reaching the page because
 * `.dark` never set `--color-black` and the fallback in the `body` rule was
 * `#000000`. The test was not describing a decision; it was pinning a bug, and
 * pinning it is why it survived. `.midnight` now declares the value.
 *
 * The RGB values below are **not** the source of truth any more. The design
 * system is, and `css/tailwind.css` no longer re-declares the accents. If these
 * need changing, the change belongs in `@rtkelly13/design-system`.
 */

// midnight — the design system's dark Level.
const MIDNIGHT_BG = 'rgb(10, 10, 26)'; // #0a0a1a
const MIDNIGHT_FG = 'rgb(228, 228, 231)'; // #e4e4e7

// sketch — paper and ink.
const SKETCH_BG = 'rgb(245, 243, 236)'; // #f5f3ec paper
const SKETCH_FG = 'rgb(35, 38, 46)'; // #23262e ink

/**
 * Accents, and the reason these numbers moved.
 *
 * The sketch accents used to be pinned in `css/tailwind.css` at `#2563eb`,
 * `#dc2626` and `#15803d` — a second, ungated copy of the light palette. All
 * three failed WCAG AA against the sketch `sunken` ground (4.31:1, 4.03:1,
 * 4.18:1). The overrides are deleted and the design system's solved values come
 * through instead, each clearing 5.5:1.
 */
const ACCENT_MIDNIGHT = 'rgb(34, 211, 238)'; // #22d3ee
const ACCENT_SKETCH = 'rgb(20, 80, 215)'; // #1450d7 — was #2563eb at 4.31:1

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
  test('defaults to midnight', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/midnight/);
    await expect(page.locator('html')).not.toHaveClass(/sketch/);
    expect(await bodyStyle(page, 'background-color')).toBe(MIDNIGHT_BG);
    expect(await bodyStyle(page, 'color')).toBe(MIDNIGHT_FG);
  });

  test('the default ground is not pure black', async ({ page }) => {
    // The specific regression. `.dark` used to omit `--color-black`, so the
    // `body` rule fell through to its `#000000` fallback and the page painted
    // true black under the hero's own `#0a0a1a` — a visible seam. Asserted
    // separately from the value above so the intent survives a re-theme.
    await page.goto('/');
    expect(await bodyStyle(page, 'background-color')).not.toBe('rgb(0, 0, 0)');
  });

  test('toggle is present and labelled for assistive tech', async ({
    page,
  }) => {
    await page.goto('/');

    const button = toggle(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute(
      'aria-label',
      'Theme: MIDNIGHT. Switch to SKETCH.',
    );
  });

  test('one click reaches sketch', async ({ page }) => {
    await page.goto('/');
    await toggle(page).click();

    await expect(page.locator('html')).toHaveClass(/sketch/);
    expect(await bodyStyle(page, 'background-color')).toBe(SKETCH_BG);
    expect(await bodyStyle(page, 'color')).toBe(SKETCH_FG);
    await expect(toggle(page)).toHaveAttribute(
      'aria-label',
      'Theme: SKETCH. Switch to MIDNIGHT.',
    );
  });

  test('a second click returns to midnight', async ({ page }) => {
    await page.goto('/');
    await toggle(page).click();
    await toggle(page).click();

    await expect(page.locator('html')).toHaveClass(/midnight/);
    expect(await bodyStyle(page, 'background-color')).toBe(MIDNIGHT_BG);
  });

  test('accents come from the design system on each theme', async ({
    page,
  }) => {
    await page.goto('/');
    expect(await readAccentBg(page, 'bg-brutalist-cyan')).toBe(ACCENT_MIDNIGHT);

    await toggle(page).click();
    // Not #2563eb. That value was pinned in this repo and failed WCAG AA;
    // deleting the override lets the package's gated #1450d7 through.
    expect(await readAccentBg(page, 'bg-brutalist-cyan')).toBe(ACCENT_SKETCH);
  });

  test('the choice persists across a reload', async ({ page }) => {
    await page.goto('/');
    await toggle(page).click();
    await expect(page.locator('html')).toHaveClass(/sketch/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/sketch/);
    expect(await bodyStyle(page, 'background-color')).toBe(SKETCH_BG);
  });

  test('the reading surface re-themes, not just the page chrome', async ({
    page,
  }) => {
    await page.goto('/blog');
    const heading = page.locator('h1, h2').first();
    const dark = await heading.evaluate((el) => getComputedStyle(el).color);

    await toggle(page).click();
    const light = await heading.evaluate((el) => getComputedStyle(el).color);

    expect(light).not.toBe(dark);
  });
});
