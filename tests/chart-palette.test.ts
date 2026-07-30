/**
 * Guards the chart palette in `css/tailwind.css`.
 *
 * The palette's colourblind-safety is a measured property, not a matter of taste,
 * so it is asserted rather than reviewed: tweak an accent and this test fails.
 * `pnpm check:palette` prints the same numbers in a readable report.
 */

import { describe, expect, it } from 'vitest';
import {
  SERIES_CAP as APP_SERIES_CAP,
  CHART_PALETTE,
  CHART_SEQUENTIAL,
} from '../lib/charts/palette';
import { readPalettes, SERIES_CAP } from '../scripts/chart-palette.mjs';
import {
  contrast,
  validate,
  validateOrdinal,
} from '../scripts/vendor/validate-palette.mjs';

interface ThemePalette {
  theme: string;
  mode: 'light' | 'dark';
  surface: string;
  categorical: string[];
  sequential: string[];
  other: string;
}

// readPalettes() comes from an untyped tooling module; the shape is asserted by
// the "declares every colour as a literal hex" and "finds all three themes" cases.
const themes = readPalettes() as ThemePalette[];

/** A validator report row: [check name, state, human-readable message]. */
type Row = readonly unknown[];

const check = (report: Row[], name: string): Row | undefined =>
  report.find((row) => row[0] === name);
const message = (entry: Row | undefined) =>
  String(entry?.[2] ?? 'check missing');
const passed = (entry: Row | undefined) =>
  entry?.[1] === true || entry?.[1] === 'pass' || entry?.[1] === 'relief';

/**
 * Dark and dim knowingly sit outside the method's lightness band: the brutalist
 * accents are high-luminance neon by design. Every other gate is enforced.
 * Sketch has no exemption.
 */
const BAND_EXEMPT = new Set(['dark', 'dim']);

const HARD_GATES = [
  'Chroma floor',
  'CVD separation',
  'Normal-vision floor',
  'Contrast vs surface',
];

it('finds all three themes', () => {
  expect(themes.map((t) => t.theme)).toEqual(['dark', 'dim', 'sketch']);
});

it('keeps the app-facing caps in step with the tooling', () => {
  expect(APP_SERIES_CAP).toEqual(SERIES_CAP);
});

it('exposes one slot reference per declared colour', () => {
  // Catches a slot added to the CSS but never wired into chart code, or vice versa.
  for (const theme of themes) {
    expect(CHART_PALETTE).toHaveLength(theme.categorical.length);
    expect(CHART_SEQUENTIAL).toHaveLength(theme.sequential.length);
  }
});

describe.each(themes)('$theme (surface $surface)', (theme: ThemePalette) => {
  const opts = { mode: theme.mode, surface: theme.surface };

  describe(`categorical, adjacent pairlist — ${SERIES_CAP.adjacent} slots`, () => {
    const { report } = validate(theme.categorical, {
      ...opts,
      pairs: 'adjacent',
    });

    it.each(HARD_GATES)('passes %s', (gate) => {
      expect(passed(check(report, gate)), message(check(report, gate))).toBe(
        true,
      );
    });

    it('sits inside the lightness band, or is a documented deviation', () => {
      const entry = check(report, 'Lightness band');
      if (BAND_EXEMPT.has(theme.theme)) return; // neon-on-black, see palette notes
      expect(passed(entry), message(entry)).toBe(true);
    });
  });

  describe(`categorical, all-pairs — first ${SERIES_CAP.allPairs} slots`, () => {
    // Scatter, bubble, choropleth and small multiples let any two marks touch, so
    // every pair must separate. This is what caps those forms well below eight.
    const { report } = validate(
      theme.categorical.slice(0, SERIES_CAP.allPairs),
      {
        ...opts,
        pairs: 'all',
      },
    );

    it.each(HARD_GATES)('passes %s', (gate) => {
      expect(passed(check(report, gate)), message(check(report, gate))).toBe(
        true,
      );
    });
  });

  it('fails all-pairs beyond the documented cap', () => {
    // Asserts the cap is real. If this ever starts passing, the cap can rise —
    // but it must be raised deliberately, here and in lib/charts/palette.ts.
    const { report } = validate(theme.categorical, { ...opts, pairs: 'all' });
    const cvd = passed(check(report, 'CVD separation'));
    const normal = passed(check(report, 'Normal-vision floor'));
    expect(cvd && normal).toBe(false);
  });

  describe('sequential ramp', () => {
    const { report } = validateOrdinal(theme.sequential, opts);

    it.each([
      'Lightness monotone',
      'Adjacent ΔL',
      'Light-end contrast',
      'Single hue',
    ])('passes %s', (gate) => {
      expect(passed(check(report, gate)), message(check(report, gate))).toBe(
        true,
      );
    });
  });

  it('keeps the "Other" bucket readable and neutral', () => {
    // Neutral on purpose — it is the absence of identity — so the chroma floor is
    // waived, but it still has to be legible against the surface.
    expect(contrast(theme.other, theme.surface)).toBeGreaterThanOrEqual(3);
  });

  it('declares every colour as a literal hex', () => {
    for (const hex of [
      ...theme.categorical,
      ...theme.sequential,
      theme.other,
    ]) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
