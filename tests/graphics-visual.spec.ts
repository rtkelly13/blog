import { expect, test } from '@playwright/test';

/**
 * Visual regression for the background generators.
 *
 * ## Why these four
 *
 * Two axes that between them cover what actually breaks: **mono against multi**
 * (a single accent and a ramp exercise different paths through `ink()`), and
 * **dark against paper** (the same alpha reads very differently on each, which
 * has caused two separate regressions in this system already).
 *
 * Each uses the *weakest* accent available for its surface rather than a
 * flattering one, measured as WCAG contrast against the surface colour:
 *
 *     dark  #0a0a1a   pink 5.56  cyan 10.85  yellow 12.80  white 19.60
 *     paper #f5f3ec   red  4.35  green 4.52  blue  4.66    ink   13.63
 *
 * So pink on dark and red on paper. A change that dims the output is invisible
 * at high contrast and obvious at low, which is the whole point of picking the
 * worst case: these snapshots fail *first*.
 *
 * ## Why the URL carries everything
 *
 * `chrome=0` drops the header, controls and captions, so a diff cannot be
 * triggered by a slider moving a pixel. `playing=0` with an explicit `t` freezes
 * one frame, because screenshotting an animation is otherwise a race that
 * produces failures unrelated to what changed. See `lib/graphicsUrl.ts`.
 *
 * Snapshots are Linux-only, like the rest of `visual.spec.ts` — font and
 * antialiasing differences make them platform-specific.
 */
test.skip(process.platform !== 'linux', 'Visual tests only run on Linux CI');

const BASE = '/gallery/backgrounds';

/** A spread across the families, so one snapshot exercises several mechanisms. */
const SAMPLE = [
  'contour',
  'ridgeline',
  'dot-grid',
  'truchet-arcs',
  'radial-spokes',
  'iso-cubes',
].join(',');

/** Frozen, chrome-free, and always the same six generators at the same seed. */
function fixture(params: Record<string, string>): string {
  const q = new URLSearchParams({
    only: SAMPLE,
    seed: '7',
    density: '0.55',
    t: '0.3',
    playing: '0',
    chrome: '0',
    cols: '3',
    ...params,
  });
  return `${BASE}?${q}`;
}

async function shoot(page: import('@playwright/test').Page, name: string) {
  await page.waitForLoadState('domcontentloaded');
  // The tiles animate off a rAF loop even when paused-on-first-frame, and web
  // fonts shift the layout; a settle beat is cheaper than chasing both.
  await page.waitForTimeout(1500);
  const grid = page.locator('section').first();
  await expect(grid).toHaveScreenshot(name, { animations: 'disabled' });
}

test.describe('background generators', () => {
  test('dark, single accent at the weakest contrast', async ({ page }) => {
    await page.goto(fixture({ theme: 'dark', accent: 'ec4899' }));
    await shoot(page, 'generators-dark-mono.png');
  });

  test('dark, multi-colour ramp at the weakest contrast', async ({ page }) => {
    await page.goto(fixture({ theme: 'dark', accents: 'ec4899,facc15' }));
    await shoot(page, 'generators-dark-ramp.png');
  });

  test('paper, single accent at the weakest contrast', async ({ page }) => {
    await page.goto(fixture({ theme: 'sketch', accent: 'dc2626' }));
    await shoot(page, 'generators-paper-mono.png');
  });

  test('paper, multi-colour ramp at the weakest contrast', async ({ page }) => {
    await page.goto(fixture({ theme: 'sketch', accents: '2563eb,dc2626' }));
    await shoot(page, 'generators-paper-ramp.png');
  });
});
