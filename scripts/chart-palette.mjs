/**
 * Read the chart palette out of `css/tailwind.css` and describe each theme's
 * chart surface.
 *
 * The CSS is the single source of truth, so both `pnpm check:palette` and
 * `tests/chart-palette.test.ts` parse it rather than keeping a second copy of the
 * hexes. Editing a colour in the stylesheet is therefore enough to re-validate
 * it — and enough to fail CI if it breaks a gate.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSS = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'css',
  'tailwind.css',
);

/**
 * Every `selector { … }` block's body, in source order. The stylesheet declares
 * a selector more than once (`:root` carries diagram tokens and chart tokens in
 * separate blocks), so callers must consider all of them.
 */
function blocks(css, selector) {
  const found = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(`\n${selector} {`, from);
    if (at === -1) break;
    const open = css.indexOf('{', at);
    const close = css.indexOf('\n}', open);
    if (close === -1) throw new Error(`unterminated block: ${selector}`);
    found.push(css.slice(open + 1, close));
    from = close;
  }
  if (found.length === 0) {
    throw new Error(`selector not found in tailwind.css: ${selector}`);
  }
  return found;
}

/** Chart variables declared under `selector`, later blocks winning. */
function vars(css, selector) {
  const out = {};
  for (const body of blocks(css, selector)) {
    for (const [, name, value] of body.matchAll(
      /(--ts-chart-[\w-]+)\s*:\s*([^;]+);/g,
    )) {
      out[name] = value.trim();
    }
  }
  return out;
}

function slots(map, prefix, count) {
  return Array.from({ length: count }, (_, i) => {
    const key = `${prefix}${i + 1}`;
    const value = map[key];
    if (!value) throw new Error(`missing ${key} in tailwind.css`);
    if (!/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(
        `${key} must be a literal hex so it can be validated, got "${value}"`,
      );
    }
    return value;
  });
}

/**
 * Chart surfaces per theme — the colour a chart is drawn on, which every
 * contrast check is measured against. Charts sit in a `bg-black` panel, so the
 * surface is that theme's `--color-black`.
 */
const SURFACES = {
  // dark's --color-black comes from @rtkelly13/design-system/theme.css, not from
  // this repo's stylesheet, so it is stated here rather than parsed.
  dark: '#000000',
  dim: null, // parsed from .dim
  sketch: null, // parsed from .sketch
};

function surfaceFrom(css, selector) {
  for (const body of blocks(css, selector)) {
    const m = body.match(/--color-black\s*:\s*(#[0-9a-f]{6})/i);
    if (m) return m[1];
  }
  throw new Error(`could not read --color-black from ${selector}`);
}

/**
 * One entry per theme: its categorical palette, "Other" bucket, sequential ramp,
 * surface, and which validator mode applies.
 *
 * `dim` inherits the chart palette from `:root` (only its surface differs), which
 * is why the palette must validate against both dark surfaces.
 */
export function readPalettes() {
  const css = readFileSync(CSS, 'utf8');
  const root = vars(css, ':root');
  const sketch = { ...root, ...vars(css, '.sketch') };

  const read = (map) => ({
    categorical: slots(map, '--ts-chart-', 8),
    other: map['--ts-chart-other'],
    sequential: slots(map, '--ts-chart-seq-', 7),
  });

  return [
    { theme: 'dark', mode: 'dark', surface: SURFACES.dark, ...read(root) },
    {
      theme: 'dim',
      mode: 'dark',
      surface: surfaceFrom(css, '.dim'),
      ...read(root),
    },
    {
      theme: 'sketch',
      mode: 'light',
      surface: surfaceFrom(css, '.sketch'),
      ...read(sketch),
    },
  ];
}

/**
 * Series caps. `adjacent` covers bars/stacks/lines, where only neighbouring
 * marks touch. `allPairs` covers scatter/bubble/choropleth/small multiples, where
 * any two marks can sit side by side — a much harder test and a much lower cap.
 * Mirrors `SERIES_CAP` in lib/charts/palette.ts.
 */
export const SERIES_CAP = { adjacent: 8, allPairs: 4 };
