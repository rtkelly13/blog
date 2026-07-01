import { expect, type Page, test } from '@playwright/test';

/**
 * Visual-regression + smoke E2E for the talk deck, pinned to the deterministic
 * E2E debug deck (data/talks/e2e-debug-deck.mdx) so it never depends on real
 * talk content. The debug deck is draft/debug-only, so it's built only when
 * SHOW_DRAFTS=true (or dev / NODE_ENV=development) — if it isn't present the
 * test skips rather than failing.
 *
 * Snapshots are platform-specific (font rendering), so like the other visual
 * specs this only runs on Linux CI.
 *
 * These exercise the plain deck (no live talk needed): the follow/broadcast
 * layer self-guards to nothing without a live Convex talk, so the render is
 * deterministic and easy to regress.
 */

const SLUG = 'e2e-debug-deck';
const PRESENT = `/talks/${SLUG}/present`;

test.skip(process.platform !== 'linux', 'Visual tests only run on Linux CI');

async function deckReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Spectacle mounts client-side (ssr:false) + fonts settle.
  await page.waitForTimeout(1200);
}

async function next(page: Page) {
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
}

test.describe('Talk deck — E2E debug deck (visual)', () => {
  test('renders each slide deterministically', async ({ page }) => {
    const resp = await page.goto(PRESENT);
    test.skip(
      resp?.status() === 404,
      'debug deck not built (needs SHOW_DRAFTS / dev)',
    );
    await deckReady(page);

    // Title slide.
    await expect(page.getByText('E2E DEBUG DECK')).toBeVisible();
    await expect(page).toHaveScreenshot('debug-deck-1.png');

    await next(page);
    await expect(page.getByText('SLIDE TWO')).toBeVisible();
    await expect(page).toHaveScreenshot('debug-deck-2.png');

    await next(page);
    await expect(page).toHaveScreenshot('debug-deck-3.png');

    await next(page);
    await expect(page.getByText('SLIDE FOUR')).toBeVisible();
    await expect(page).toHaveScreenshot('debug-deck-4.png');
  });
});
