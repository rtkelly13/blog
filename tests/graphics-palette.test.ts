import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FIXED_COLOURS, LEVELS, PALETTE_HUES } from '@rtkelly13/design-system';
import { describe, expect, it } from 'vitest';

import {
  ACCENT_SWATCHES,
  BRUTALIST_ACCENTS,
  categoricalSequence,
  graphicThemeDefaults,
  PAPER_ACCENTS,
  withAlpha,
} from '../components/graphics/palette';

const SOURCE = readFileSync(
  path.join(__dirname, '..', 'components', 'graphics', 'palette.ts'),
  'utf8',
);

describe('the graphics palette holds no colour of its own', () => {
  /**
   * The arithmetic ADR 0002 says was missing.
   *
   * That ADR cites this file by name as the evidence for rejecting per-surface
   * palettes — "the two sets then drift silently, and there is no arithmetic
   * that can catch it". It drifted: `PAPER_ACCENTS` held #2563eb, #dc2626 and
   * #15803d, all three of which fail WCAG AA on the sketch ground, while the
   * package's own light accents had been solved to clear 5.5:1.
   *
   * This is the arithmetic. A hex literal reappearing in this file is the
   * failure, whatever value it holds.
   */
  it('contains no hex literal outside a comment', () => {
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(
      /\/\/[^\n]*/g,
      '',
    );
    const literals = code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(literals).toEqual([]);
  });

  it('sources every dark accent from the design system', () => {
    for (const hue of PALETTE_HUES) {
      expect(BRUTALIST_ACCENTS[hue]).toBe(LEVELS.midnight.palette[hue]);
    }
    expect(BRUTALIST_ACCENTS.neonCyan).toBe(LEVELS.midnight.paletteBright.cyan);
    expect(BRUTALIST_ACCENTS.white).toBe(FIXED_COLOURS.white);
  });

  it('sources every light accent from the design system', () => {
    for (const hue of PALETTE_HUES) {
      expect(PAPER_ACCENTS[hue]).toBe(LEVELS.sketch.palette[hue]);
    }
    expect(PAPER_ACCENTS.ink).toBe(LEVELS.sketch.text.primary);
    expect(PAPER_ACCENTS.paper).toBe(LEVELS.sketch.surface.base);
  });

  it('no longer carries the three values that failed WCAG AA', () => {
    // Named explicitly so a revert is loud. These were the sketch pen colours.
    const values = Object.values(PAPER_ACCENTS) as string[];
    for (const failed of ['#2563eb', '#dc2626', '#15803d']) {
      expect(values).not.toContain(failed);
    }
  });
});

describe('graphicThemeDefaults', () => {
  it('draws ink on a light ground and the brand cyan on a dark one', () => {
    expect(graphicThemeDefaults('sketch').accent).toBe(
      LEVELS.sketch.text.primary,
    );
    expect(graphicThemeDefaults('midnight').accent).toBe(
      LEVELS.midnight.palette.cyan,
    );
  });

  it('falls back to the dark Level for an unknown theme, and says so', () => {
    // The previous version compared `theme === 'sketch'` and fell through to a
    // dark default, so an unrecognised name silently drew neon on paper — the
    // same shape of bug as the `theme !== 'light'` comparisons this repo had.
    // The fallback is still dark, but now it is a Level lookup rather than a
    // string comparison, so a renamed Level is a type error at the call site.
    expect(graphicThemeDefaults('bright').accent).toBe(
      LEVELS.midnight.palette.cyan,
    );
    expect(graphicThemeDefaults(undefined).accent).toBe(
      LEVELS.midnight.palette.cyan,
    );
  });

  it('keeps the background transparent so a graphic layers over its surface', () => {
    for (const theme of ['midnight', 'sketch', undefined]) {
      expect(graphicThemeDefaults(theme).background).toBe('transparent');
    }
  });
});

describe('the categorical sequence', () => {
  it('offers all ten hues, per Level', () => {
    for (const level of ['midnight', 'sketch'] as const) {
      const seq = categoricalSequence(level);
      expect(seq).toHaveLength(PALETTE_HUES.length);
      expect(new Set(seq).size).toBe(PALETTE_HUES.length);
    }
  });

  it('is distinguishable pairwise, which is the property a chart needs', () => {
    // The package gates this in OKLab ΔE. Re-asserted here because a diagram
    // is the consumer that actually depends on it — `accent.primary…quiet` is
    // four steps of hierarchy and cannot serve a ten-series chart.
    const decode = (v: number) =>
      v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const oklab = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) =>
        decode(Number.parseInt(hex.slice(i, i + 2), 16) / 255),
      );
      const l = Math.cbrt(
        0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!,
      );
      const m = Math.cbrt(
        0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!,
      );
      const s = Math.cbrt(
        0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!,
      );
      return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
      ] as const;
    };
    for (const level of ['midnight', 'sketch'] as const) {
      const seq = categoricalSequence(level);
      const tight: string[] = [];
      for (let i = 0; i < seq.length; i += 1) {
        for (let j = i + 1; j < seq.length; j += 1) {
          const a = oklab(seq[i]!);
          const b = oklab(seq[j]!);
          const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          if (d < 0.04) tight.push(`${level} ${i}/${j} ΔE ${d.toFixed(3)}`);
        }
      }
      expect(tight).toEqual([]);
    }
  });
});

describe('ACCENT_SWATCHES', () => {
  it('exposes every accent, in declaration order', () => {
    expect(ACCENT_SWATCHES.map((s) => s.name)).toEqual(
      Object.keys(BRUTALIST_ACCENTS),
    );
    for (const s of ACCENT_SWATCHES) expect(s.value).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('withAlpha', () => {
  it('converts a package hex to rgba', () => {
    expect(withAlpha(LEVELS.midnight.palette.cyan, 0.5)).toMatch(
      /^rgba\(\d+, \d+, \d+, 0\.5\)$/,
    );
  });

  it('passes a non-hex through untouched', () => {
    expect(withAlpha('transparent', 0.5)).toBe('transparent');
  });
});
