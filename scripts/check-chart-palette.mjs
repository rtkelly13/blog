#!/usr/bin/env node

/**
 * `pnpm check:palette` — re-run the data-viz colour checks on the palette in
 * `css/tailwind.css`, for every theme, against that theme's real chart surface.
 *
 * Prints a readable report and exits non-zero on any hard failure. The same
 * assertions run in `tests/chart-palette.test.ts`; this script exists so the
 * numbers are easy to read while editing a colour.
 *
 * The dark/dim categorical set knowingly sits outside the method's lightness
 * band — brutalist neon on black — so that one check is reported as a documented
 * deviation instead of a failure. Every other gate is enforced.
 */

import { readPalettes, SERIES_CAP } from './chart-palette.mjs';
import { validate, validateOrdinal } from './vendor/validate-palette.mjs';

const HARD = new Set([
  'Chroma floor',
  'CVD separation',
  'Normal-vision floor',
  'Contrast vs surface',
]);
/** Themes allowed to sit outside the lightness band, and why. */
const BAND_DEVIATION = {
  dark: 'brutalist neon on black — brand accents sit above the dark band',
  dim: 'shares the dark set',
};

const state = (s) =>
  s === true ? 'PASS' : s === false ? 'FAIL' : String(s).toUpperCase();
let failed = 0;

function show(title, report, { theme, allowBandDeviation = false }) {
  console.log(`\n  ${title}`);
  for (const [name, s, message] of report) {
    const isHard = HARD.has(name);
    const bandExempt = name === 'Lightness band' && allowBandDeviation;
    const bad = (s === false || s === 'fail') && (isHard || !bandExempt);
    if (bad) failed++;
    const tag = bandExempt && s !== true ? 'DEVIATES' : state(s);
    console.log(`    [${tag}] ${name.padEnd(22)} ${message}`);
    if (bandExempt && s !== true) {
      console.log(`             ↳ documented: ${BAND_DEVIATION[theme]}`);
    }
  }
}

for (const p of readPalettes()) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(
    `${p.theme.toUpperCase()}  (mode ${p.mode}, surface ${p.surface})`,
  );
  console.log('='.repeat(72));

  const allowBandDeviation = p.theme in BAND_DEVIATION;
  const opts = { mode: p.mode, surface: p.surface };

  show(
    `categorical, adjacent pairlist — all ${p.categorical.length} slots (bars, stacks, lines)`,
    validate(p.categorical, { ...opts, pairs: 'adjacent' }).report,
    { theme: p.theme, allowBandDeviation },
  );

  show(
    `categorical, all-pairs — first ${SERIES_CAP.allPairs} slots (scatter, bubble, maps, small multiples)`,
    validate(p.categorical.slice(0, SERIES_CAP.allPairs), {
      ...opts,
      pairs: 'all',
    }).report,
    { theme: p.theme, allowBandDeviation },
  );

  show(
    `sequential ramp — ${p.sequential.length} steps (magnitude, ordered buckets)`,
    validateOrdinal(p.sequential, opts).report,
    { theme: p.theme },
  );

  // The "Other" bucket is intentionally neutral — it must stay readable, but it
  // is not an identity colour, so the chroma floor does not apply to it.
  const { contrast } = await import('./vendor/validate-palette.mjs');
  const ratio = contrast(p.other, p.surface);
  const ok = ratio >= 3;
  if (!ok) failed++;
  console.log(`\n  "Other" bucket`);
  console.log(
    `    [${ok ? 'PASS' : 'FAIL'}] Contrast vs surface    ${p.other} at ${ratio.toFixed(2)}:1 (>= 3:1; chroma floor waived — neutral by design)`,
  );
}

console.log(
  failed === 0
    ? '\n✓ chart palette: all gates pass in every theme\n'
    : `\n✗ chart palette: ${failed} failing check(s)\n`,
);
process.exit(failed === 0 ? 0 : 1);
