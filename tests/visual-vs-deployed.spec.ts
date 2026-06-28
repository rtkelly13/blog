import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Regression test: local build vs the version deployed on `main`.
 *
 * Unlike `visual.spec.ts` (which diffs against committed Linux baselines and
 * therefore only runs in CI), this suite renders BOTH the local build and the
 * live production site in the SAME browser on the SAME machine, then diffs the
 * two screenshots. Because both sides share a renderer, platform/font
 * differences cancel out and only genuine CSS/layout changes — e.g. a Tailwind
 * upgrade altering output — show up as pixel deltas.
 *
 * Run it with `pnpm test:regression` (see playwright.regression.config.ts),
 * which boots the local production server first.
 *
 * Override the deployed target with REGRESSION_BASE_URL (defaults to prod).
 */

const LOCAL_URL = process.env.REGRESSION_LOCAL_URL ?? 'http://localhost:3000';
const PROD_URL = process.env.REGRESSION_BASE_URL ?? 'https://ryankelly.dev';

// Include the noisier, content-dependent pages only when explicitly asked.
const INCLUDE_UNSTABLE = process.env.REGRESSION_ALL === '1';

type PageSpec = {
  name: string;
  path: string;
  /** Max share of pixels allowed to differ before the test fails. */
  tolerance: number;
  /**
   * `stable` pages have identical *content* in both environments (static page
   * or a long-published post), so a diff beyond the media-encoding tolerance is
   * a real styling regression. Non-stable pages (homepage, listings) differ by
   * which posts are published, so they are skipped unless REGRESSION_ALL=1 and
   * are given a much looser tolerance.
   */
  stable: boolean;
};

const PAGES: PageSpec[] = [
  // Content-stable pages. Tolerances are calibrated to absorb *non-deterministic
  // media encoding* (the local build and the live site re-encode images/SVGs
  // independently, and across sharp/mermaid versions) while still being far
  // tighter than any real layout/color regression, which shifts text and chrome
  // across the whole page.
  //
  //   404       — pure chrome, no media          → strict 1%
  //   about     — one sharp-encoded profile photo → 2%
  //   blog-post — prose + several SVG diagrams; a small diagram-height delta
  //               shifts everything below it (cascade), so it needs the most
  //               headroom                         → 4%
  {
    name: '404',
    path: '/this-page-does-not-exist',
    tolerance: 0.01,
    stable: true,
  },
  { name: 'about', path: '/about', tolerance: 0.02, stable: true },
  {
    name: 'blog-post',
    path: '/blog/aws-batch/cookbook',
    tolerance: 0.04,
    stable: true,
  },
  // Content-dependent — looser tolerance, opt-in via REGRESSION_ALL=1.
  { name: 'homepage', path: '/', tolerance: 0.1, stable: false },
  { name: 'blog-listing', path: '/blog', tolerance: 0.1, stable: false },
  { name: 'tags', path: '/tags', tolerance: 0.1, stable: false },
];

/** Crop both images to their shared top-left region so dimensions match. */
function cropToCommon(
  a: PNG,
  b: PNG,
): { a: PNG; b: PNG; width: number; height: number } {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const ca = new PNG({ width, height });
  const cb = new PNG({ width, height });
  PNG.bitblt(a, ca, 0, 0, width, height, 0, 0);
  PNG.bitblt(b, cb, 0, 0, width, height, 0, 0);
  return { a: ca, b: cb, width, height };
}

async function capture(
  browser: import('@playwright/test').Browser,
  url: string,
): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // Settle fonts/animations before snapping.
    await page.waitForTimeout(1000);
    return await page.screenshot({ fullPage: true });
  } finally {
    await context.close();
  }
}

for (const spec of PAGES) {
  const run = spec.stable || INCLUDE_UNSTABLE;
  test(`${spec.name} matches deployed main`, async ({ browser }, testInfo) => {
    test.skip(
      !run,
      `${spec.name} is content-dependent; run with REGRESSION_ALL=1 to include it`,
    );

    const [prodShot, localShot] = await Promise.all([
      capture(browser, PROD_URL + spec.path),
      capture(browser, LOCAL_URL + spec.path),
    ]);

    const { a, b, width, height } = cropToCommon(
      PNG.sync.read(prodShot),
      PNG.sync.read(localShot),
    );

    const diff = new PNG({ width, height });
    const mismatched = pixelmatch(a.data, b.data, diff.data, width, height, {
      threshold: 0.1,
    });
    const ratio = mismatched / (width * height);

    // Attach all three images so failures are diagnosable from the HTML report.
    await testInfo.attach('deployed-main', {
      body: prodShot,
      contentType: 'image/png',
    });
    await testInfo.attach('local-build', {
      body: localShot,
      contentType: 'image/png',
    });
    await testInfo.attach('diff', {
      body: PNG.sync.write(diff),
      contentType: 'image/png',
    });

    console.log(
      `${spec.name}: ${(ratio * 100).toFixed(3)}% of pixels differ ` +
        `(tolerance ${(spec.tolerance * 100).toFixed(1)}%)`,
    );

    expect(
      ratio,
      `${spec.name} differs from deployed main by ${(ratio * 100).toFixed(3)}% ` +
        `(allowed ${(spec.tolerance * 100).toFixed(1)}%). See attached diff.`,
    ).toBeLessThan(spec.tolerance);
  });
}
