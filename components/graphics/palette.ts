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
} {
  // `occlusion` is the one that cannot be transparent — it is what stacked
  // geometry paints its faces with to hide what is behind them, so it has to be
  // the opaque surface the graphic is sitting on. Paper under `sketch`, the
  // brutalist near-black otherwise.
  return theme === 'sketch'
    ? {
        accent: PAPER_ACCENTS.ink,
        background: 'transparent',
        occlusion: SURFACES.paper,
      }
    : {
        accent: BRUTALIST_ACCENTS.cyan,
        background: 'transparent',
        occlusion: SURFACES.darkBg,
      };
}

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
