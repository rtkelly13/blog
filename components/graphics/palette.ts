import type { Hue, ThemeLevel } from '@rtkelly13/design-system';
import {
  FIXED_COLOURS,
  isThemeLevel,
  LEVELS,
  PALETTE_HUES,
} from '@rtkelly13/design-system';

/**
 * The graphics palette, read from the design system rather than restated here.
 *
 * ## Why this file used to hold hex, and why it no longer may
 *
 * It declared two hue-keyed records of hardcoded literals —
 * `BRUTALIST_ACCENTS` and `PAPER_ACCENTS` — because the package offered no hue
 * vocabulary to read. A generated diagram needs N mutually distinguishable
 * colours, not four levels of emphasis, and `accent.primary…quiet` cannot
 * express that.
 *
 * `ADR 0002` in the design system cites this exact file as the evidence for
 * rejecting per-surface palettes: *"the two sets then drift silently, and there
 * is no arithmetic that can catch it"*. It did drift. `PAPER_ACCENTS` held
 * `#2563eb`, `#dc2626` and `#15803d` — all three of which fail WCAG AA against
 * the sketch ground, at 4.31:1, 4.03:1 and 4.18:1 — while the package's own
 * light accents had been solved to clear 5.5:1.
 *
 * The package now declares a `palette` Group of ten Hues per Level, gated once
 * per Hue. So this file is an adapter: it maps the shapes the generators
 * already take onto the package's values, and holds **no colour of its own**.
 * `graphics.test.ts` asserts that.
 *
 * ## What is still missing, named rather than worked around
 *
 * `ADR 0004` makes `graphic` a Medium and records that it "needs a Group that
 * does not exist": graphics want an *ordered sequence with a guaranteed
 * pairwise floor*, and `palette` is a named record while `accent` is four steps
 * of hierarchy. `CATEGORICAL` below is the closest thing available — the ten
 * Hues in wheel order, whose pairwise separation the package gates in OKLab ΔE
 * — but the ordering is the wheel's rather than a chosen perceptual sequence,
 * and nothing guarantees that hues *adjacent in this list* are the most
 * distinguishable pair available. A real ordered Group would.
 *
 * The `graphic` Medium's contrast floor is also 7:1, which the palette does not
 * yet clear. A generated diagram is not currently gated against it.
 */

/** The dark Level's Hues, by name. Was `BRUTALIST_ACCENTS`. */
export const BRUTALIST_ACCENTS = {
  ...LEVELS.midnight.palette,
  /** `paletteBright.cyan` — the ANSI-bright cyan, brighter than `cyan`. */
  neonCyan: LEVELS.midnight.paletteBright.cyan,
  /** Level-invariant, so it comes from `fixed` rather than a Level. */
  white: FIXED_COLOURS.white,
} as const;

export type AccentName = keyof typeof BRUTALIST_ACCENTS;

/**
 * The light Level's Hues plus its paper and ink.
 *
 * `ink` and `paper` are Roles rather than Hues — a drawing surface and the mark
 * on it are `surface.base` and `text.primary`, not entries in a hue wheel.
 */
export const PAPER_ACCENTS = {
  ...LEVELS.sketch.palette,
  ink: LEVELS.sketch.text.primary,
  paper: LEVELS.sketch.surface.base,
} as const;

/**
 * The ten Hues in wheel order, for a chart or diagram needing N distinguishable
 * colours. See the caveat in this file's header: the package gates pairwise
 * separation but not the *ordering*.
 */
export function categoricalSequence(level: ThemeLevel): readonly string[] {
  return PALETTE_HUES.map((hue: Hue) => LEVELS[level].palette[hue]);
}

/**
 * Default `accent` / `background` for a generator, given the current theme.
 *
 * Reads the Level rather than testing a theme name. The previous version
 * compared `theme === 'sketch'` and fell through to a dark default, so a theme
 * name it did not recognise silently drew neon on paper — the same class of bug
 * as the `theme !== 'light'` comparisons in `lib/themePolarity.ts`.
 *
 * `background` stays transparent so the graphic layers over whatever surface it
 * sits on.
 */
export function graphicThemeDefaults(theme?: string): {
  accent: string;
  background: string;
} {
  const level: ThemeLevel = isThemeLevel(theme) ? theme : 'midnight';
  const def = LEVELS[level];
  return {
    // On a light ground the mark is ink; on a dark one it is the brand cyan.
    accent: def.polarity === 'light' ? def.text.primary : def.palette.cyan,
    background: 'transparent',
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
