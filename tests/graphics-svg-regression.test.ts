/**
 * Structural regression over rendered SVG.
 *
 * The golden file in `graphics-generators.test.ts` pins *bytes*, via a hash.
 * That catches everything and explains nothing: a one-line change to a fill
 * produces the same red as re-writing a generator, and the diff is two hex
 * strings.
 *
 * This suite pins *structure* — element counts, viewBox, coordinate bounds,
 * distinct colours — as readable JSON. The two are complementary and neither
 * replaces the other:
 *
 *   hash changed, structure unchanged  ->  values moved, shape did not
 *   both changed                       ->  the diff here says how
 *
 * It also carries the assertions that should hold for *any* SVG we emit, so a
 * new generator inherits them: well-formed, no NaN, finite coordinates, nothing
 * absurdly far outside the frame.
 *
 * Regenerate deliberately:
 *
 *     UPDATE_GRAPHICS_STRUCTURE=1 pnpm vitest run tests/graphics-svg-regression.test.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERATOR_LIST, renderGraphic } from '../components/graphics/registry';
import type { GraphicParams } from '../components/graphics/types';

const PATH = join(__dirname, 'fixtures', 'graphics-structure.json');
const UPDATING = process.env.UPDATE_GRAPHICS_STRUCTURE === '1';

const W = 1280;
const H = 720;

function params(over: Partial<GraphicParams> = {}): GraphicParams {
  return {
    width: W,
    height: H,
    seed: 1,
    accent: '#22d3ee',
    background: 'transparent',
    density: 0.5,
    opacity: 1,
    strokeWidth: 2,
    t: 0,
    occlusion: '#0a0a1a',
    disorder: 0,
    ...over,
  };
}

interface Structure {
  elements: Record<string, number>;
  marks: number;
  viewBox: string;
  colours: number;
  bounds: [number, number, number, number];
}

/** Element counts, extent and palette size — everything but the exact numbers. */
function describeSvg(svg: string): Structure {
  const elements: Record<string, number> = {};
  for (const [, tag] of svg.matchAll(/<([a-z]+)\b/g)) {
    if (tag === 'svg') continue;
    elements[tag] = (elements[tag] ?? 0) + 1;
  }
  const coords = [...svg.matchAll(/[-\d.]+/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n));
  const xs: number[] = [];
  const ys: number[] = [];
  // Path and polygon data, where coordinates come in pairs.
  for (const [, d] of svg.matchAll(/ (?:d|points)="([^"]+)"/g)) {
    const nums = [...d.matchAll(/-?\d+\.?\d*(?:e-?\d+)?/g)].map((m) =>
      Number(m[0]),
    );
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
  }
  for (const [, x, y] of svg.matchAll(/cx="([-\d.]+)" cy="([-\d.]+)"/g)) {
    xs.push(Number(x));
    ys.push(Number(y));
  }
  const round = (n: number) => Math.round(n);
  return {
    elements,
    marks: Object.values(elements).reduce((a, b) => a + b, 0),
    viewBox: /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '',
    colours: new Set(
      [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1]),
    ).size,
    bounds: xs.length
      ? [
          round(Math.min(...xs)),
          round(Math.min(...ys)),
          round(Math.max(...xs)),
          round(Math.max(...ys)),
        ]
      : [0, 0, 0, 0],
    ...(coords.length ? {} : {}),
  };
}

const NAMES = GENERATOR_LIST.map((g) => g.name).sort();

describe('svg structure (regression)', () => {
  const actual: Record<string, Structure> = {};
  for (const name of NAMES) {
    actual[name] = describeSvg(renderGraphic(name, params()));
  }

  if (UPDATING) {
    writeFileSync(PATH, `${JSON.stringify(actual, null, 2)}\n`);
  }

  const golden: Record<string, Structure> = JSON.parse(
    readFileSync(PATH, 'utf8'),
  );

  it('covers every registered generator', () => {
    expect(Object.keys(actual).sort()).toEqual(Object.keys(golden).sort());
  });

  it.each(NAMES)('%s: structure is unchanged', (name) => {
    expect(actual[name]).toEqual(golden[name]);
  });
});

describe('svg validity (holds for every generator, present and future)', () => {
  const cases = NAMES.flatMap((name) =>
    [0, 0.5].flatMap((t) =>
      [0.2, 0.9].map(
        (density) => [`${name} t=${t} d=${density}`, name, t, density] as const,
      ),
    ),
  );

  it.each(cases)(
    '%s: is a single well-formed root',
    (_label, name, t, density) => {
      const svg = renderGraphic(name, params({ t, density }));
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg.match(/<svg/g)?.length).toBe(1);
      // Unclosed groups render as nothing in some viewers and fine in others,
      // which is the worst kind of bug to find later.
      expect((svg.match(/<g[\s>]/g) ?? []).length).toBe(
        (svg.match(/<\/g>/g) ?? []).length,
      );
    },
  );

  it.each(cases)(
    '%s: emits no NaN, Infinity or undefined',
    (_l, name, t, density) => {
      const svg = renderGraphic(name, params({ t, density }));
      expect(svg).not.toMatch(/NaN|Infinity|undefined|null/);
    },
  );

  it.each(cases)(
    '%s: keeps coordinates near the frame',
    (_l, name, t, density) => {
      // Bleed past the edges is expected and wanted; four frames out is a
      // runaway, and it silently blows up the file size.
      const svg = renderGraphic(name, params({ t, density }));
      const { bounds } = describeSvg(svg);
      expect(bounds[0]).toBeGreaterThan(-W * 2);
      expect(bounds[1]).toBeGreaterThan(-H * 2);
      expect(bounds[2]).toBeLessThan(W * 3);
      expect(bounds[3]).toBeLessThan(H * 3);
    },
  );

  it.each(NAMES)('%s: stays within a sane data-URI budget', (name) => {
    // `LayoutWrapper` and `SpectacleDeck` inline these through
    // `graphicDataUri`, and encodeURIComponent inflates by roughly a third.
    const svg = renderGraphic(name, params({ density: 1 }));
    expect(encodeURIComponent(svg).length).toBeLessThan(400_000);
  });
});
