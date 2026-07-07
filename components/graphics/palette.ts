/**
 * The brutalist accent palette, mirrored from tailwind.config.js so generators
 * and the gallery share one source of swatches. Keep in sync with the Tailwind
 * `brutalist` colours.
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
