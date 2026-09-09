import { isThemeLevel, LEVELS } from '@rtkelly13/design-system';

/**
 * Is the active level a dark one?
 *
 * Asked of the design system rather than by comparing strings. The previous
 * test here was `resolvedTheme !== 'light'` — and this blog has never had a
 * level called `light`, so it was always true and this component stayed dark
 * even on paper. A string comparison against a name that does not exist fails
 * silently and forever; `LEVELS[level].polarity` cannot.
 */
export function isDarkLevel(level: string | undefined): boolean {
  return isThemeLevel(level) ? LEVELS[level].polarity === 'dark' : true;
}
