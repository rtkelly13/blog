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
} {
  return theme === 'sketch'
    ? { accent: PAPER_ACCENTS.ink, background: 'transparent' }
    : { accent: BRUTALIST_ACCENTS.cyan, background: 'transparent' };
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
