/**
 * The brutalist accent palette. These are the *dark-theme* accent values — they
 * match the fallbacks of the Tailwind `brutalist` colours, which are now
 * CSS-variable-driven (`var(--brutalist-cyan, #22d3ee)` …) so the site can
 * re-theme them. Generators receive an explicit `accent`, so they aren't bound
 * to these — see `graphicThemeDefaults` for the per-theme defaults.
 */
export const BRUTALIST_ACCENTS = {
  cyan: '#22d3ee',
  pink: '#ec4899',
  yellow: '#facc15',
  neonGreen: '#39ff14',
  neonCyan: '#00ffff',
  white: '#ffffff',
} as const;

export type AccentName = keyof typeof BRUTALIST_ACCENTS;

/**
 * Surface colours — what a graphic sits *on*, as opposed to what it draws with.
 *
 * Deliberately not part of `BRUTALIST_ACCENTS`: that object is the gallery's
 * swatch list, and a backdrop offered as an ink choice is a picker full of
 * invisible options. These exist for `occlusion`, which must be opaque and
 * must match the surface.
 */
export const SURFACES = {
  darkBg: '#0a0a1a',
  paper: '#f5f3ec',
} as const;

/**
 * The light "sketch" (paper & ink) palette — graphite ink plus the sketch
 * accents, matching the `.sketch` theme in css/tailwind.css. Feeding these to a
 * generator turns the neon-on-black look into ink-on-paper (graph paper, pencil
 * hatching, topo contours, …).
 */
export const PAPER_ACCENTS = {
  ink: '#23262e',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#15803d',
  paper: '#f5f3ec',
} as const;

/**
 * Default `accent` / `background` for a generator given the current site theme
 * (the next-themes value). The light `sketch` theme draws ink on paper; the
 * dark themes keep neon cyan. `background` stays transparent so the graphic
 * layers over whatever surface it sits on. Callers may still override `accent`.
 */
export function graphicThemeDefaults(theme?: string): {
  accent: string;
  background: string;
  occlusion: string;
  opacity: number;
} {
  // `occlusion` is the one that cannot be transparent — it is what stacked
  // geometry paints its faces with to hide what is behind them, so it has to be
  // the opaque surface the graphic is sitting on. Paper under `sketch`, the
  // brutalist near-black otherwise.
  //
  // `opacity` stays at 1 for both, and the history is worth keeping: paper
  // briefly defaulted to half weight, because the same alpha is much heavier as
  // ink on white than as an accent on black — 30% cyan over black is a hint,
  // 30% graphite over paper is a solid grey. That rescued the fill-heavy
  // lattices and quietly ruined the sparse line generators, which were already
  // faint and became ghosts.
  //
  // One number cannot serve both, because the problem is not the theme but what
  // a given generator does with area. It is per-generator now:
  // `GeneratorModule.sketchWeight`.
  return theme === 'sketch'
    ? {
        accent: PAPER_ACCENTS.ink,
        background: 'transparent',
        occlusion: SURFACES.paper,
        opacity: 1,
      }
    : {
        accent: BRUTALIST_ACCENTS.cyan,
        background: 'transparent',
        occlusion: SURFACES.darkBg,
        opacity: 1,
      };
}

/**
 * Swatches for the light `sketch` theme.
 *
 * The brutalist neons are unusable as ink: cyan and neon green on paper are
 * highlighter, not drawing. These are the `.sketch` accents — graphite plus
 * three saturated-but-dark pigments that read as pen on a page.
 */
export const PAPER_SWATCHES: {
  name: keyof typeof PAPER_ACCENTS;
  value: string;
}[] = (['ink', 'blue', 'red', 'green'] as const).map((name) => ({
  name,
  value: PAPER_ACCENTS[name],
}));

/** Ordered swatch list for the gallery's colour picker. */
export const ACCENT_SWATCHES: { name: AccentName; value: string }[] = (
  Object.keys(BRUTALIST_ACCENTS) as AccentName[]
).map((name) => ({ name, value: BRUTALIST_ACCENTS[name] }));

/**
 * Convert `#rrggbb` to an `rgba()` string at the given alpha. Generators use
 * this for the many faint background marks that sit under the bright accent.
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const r = Number.parseInt(m[1], 16);
  const g = Number.parseInt(m[2], 16);
  const b = Number.parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Blend two `#rrggbb` colours, returning an opaque `#rrggbb`.
 *
 * The opaque counterpart to {@link withAlpha}, and it exists for the same
 * reason `occlusion` does: a layer that has to *hide* what is behind it cannot
 * be expressed as an alpha over the accent, however faint. Tinting the surface
 * colour towards the accent gives the same visual weight while staying solid.
 */
export function mix(hexA: string, hexB: string, amount: number): string {
  const parse = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    return m ? [1, 2, 3].map((i) => Number.parseInt(m[i], 16)) : null;
  };
  const a = parse(hexA);
  const b = parse(hexB);
  if (!a || !b) return hexA;
  const k = Math.min(1, Math.max(0, amount));
  const to2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${a.map((v, i) => to2(v + (b[i] - v) * k)).join('')}`;
}

/* ── the ramp ─────────────────────────────────────────────────────────────── */

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m
    ? [
        Number.parseInt(m[1], 16),
        Number.parseInt(m[2], 16),
        Number.parseInt(m[3], 16),
      ]
    : null;
}

/** sRGB channel to linear light. */
const toLinear = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (v: number): number => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(c * 255)));
};

/**
 * Blend two colours through Oklab, returning `#rrggbb`.
 *
 * Not through sRGB, which is the obvious implementation and produces a muddy
 * grey halfway between any two saturated hues — cyan to pink via sRGB passes
 * through something that looks like a mistake. Oklab is perceptually uniform
 * enough that the midpoint of a ramp reads as a colour someone chose.
 */
export function blendOklab(a: string, b: string, k: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  const t = Math.min(1, Math.max(0, k));
  const lab = (c: Rgb): Rgb => {
    const [r, g, bl] = c.map(toLinear) as Rgb;
    const l = Math.cbrt(
      0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl,
    );
    const m = Math.cbrt(
      0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl,
    );
    const s = Math.cbrt(
      0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl,
    );
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const [l1, a1, b1] = lab(ca);
  const [l2, a2, b2] = lab(cb);
  const L = l1 + (l2 - l1) * t;
  const A = a1 + (a2 - a1) * t;
  const B = b1 + (b2 - b1) * t;
  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return `#${[
    fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Sample an ordered ramp at `pos` in 0..1. One entry returns that entry. */
export function sampleRamp(colours: readonly string[], pos: number): string {
  if (colours.length === 0) return '#000000';
  if (colours.length === 1) return colours[0];
  const t = Math.min(1, Math.max(0, pos)) * (colours.length - 1);
  const i = Math.min(colours.length - 2, Math.floor(t));
  return blendOklab(colours[i], colours[i + 1], t - i);
}
