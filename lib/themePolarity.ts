import { isThemeLevel, LEVELS } from '@rtkelly13/design-system';

/**
 * Is the active theme a dark one?
 *
 * Derived from the design system's declared `polarity`, never from the theme's
 * name. That distinction is the whole point of this module.
 *
 * Three components used to answer this with `theme !== 'light'`. `'light'` has
 * never been in this site's theme set — it was `['dark', 'dim', 'sketch']` and
 * is now `['midnight', 'sketch']` — so the expression was **always true**, and
 * the dark comment widget and dark SVG variants were served on paper. Silent,
 * because nothing renders an error when a diagram is the wrong colour.
 *
 * Naming the light level `sketch` rather than `light` does not fix that by
 * itself, and swapping the literal for `!== 'sketch'` would only move the same
 * fragility one rename along. `polarity` is a declared field on every Level and
 * is what the package itself uses to drive `color-scheme` and the
 * `dark:`/`light:` variants, so asking it is asking the source.
 *
 * `next-themes` gives `theme` (which may be `'system'`) and `resolvedTheme`
 * (which is always a concrete choice), so prefer the resolved one and fall back
 * to dark — the site's default is `midnight`.
 */
export function isDarkTheme(theme?: string, resolvedTheme?: string): boolean {
  const active = resolvedTheme ?? theme;
  if (!isThemeLevel(active)) return true;
  return LEVELS[active].polarity === 'dark';
}
