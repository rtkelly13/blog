import type { ThemeLevel } from '@rtkelly13/design-system';
import { CloudMoon, type LucideIcon, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Three of the design system's four levels, cycled in order.
 *
 * Typed as `ThemeLevel[]`, which is the point: these strings are written into
 * `data-theme`, and the design system's blocks select on exactly those values.
 * A level renamed upstream is otherwise invisible — no build error, no failing
 * test, just a theme that quietly stops applying. Typed, it is a compile error.
 *
 * `white` is the fourth and is deliberately absent: a level this blog has no
 * design for is worse offered than withheld.
 */
const THEMES = [
  'midnight',
  'dim',
  'bright',
] as const satisfies readonly ThemeLevel[];

/**
 * What the reader is told, which is *not* the level name.
 *
 * The design system names levels by luminance; this blog names them by what
 * they are for. Its light theme is paper-and-ink with pencil rules, so SKETCH
 * describes it and "bright" does not. Presentation is allowed to differ from
 * the contract — only the values above have to match.
 */
const LABELS: Record<(typeof THEMES)[number], string> = {
  midnight: 'HIGH',
  dim: 'DIM',
  bright: 'SKETCH',
};
// A distinct glyph per theme so the current mode is legible at a glance
// (moon = high contrast, cloud-moon = dim, sun = sketch) — the icon-only button
// used the same half-disc for all three.
const ICONS: Record<(typeof THEMES)[number], LucideIcon> = {
  midnight: Moon,
  dim: CloudMoon,
  bright: Sun,
};

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Only trust the resolved theme after mount to avoid a hydration mismatch
  // (the server always renders the default). Before then, assume `midnight`.
  useEffect(() => setMounted(true), []);

  const active =
    mounted && theme && THEMES.includes(theme as (typeof THEMES)[number])
      ? theme
      : 'midnight';
  const next =
    THEMES[
      (THEMES.indexOf(active as (typeof THEMES)[number]) + 1) % THEMES.length
    ];
  const Icon = ICONS[active] ?? Moon;

  return (
    <button
      type="button"
      // Icon-only: the label lives in the aria-label / tooltip so the control
      // stays compact and never widens the (already dense) header past the
      // viewport. `suppressHydrationWarning` because the label depends on the
      // resolved theme, which is only known client-side.
      aria-label={`Theme: ${LABELS[active]}. Switch to ${LABELS[next]}.`}
      title={`Theme: ${LABELS[active]} — switch to ${LABELS[next]}`}
      onClick={() => setTheme(next)}
      suppressHydrationWarning
      className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center p-1 text-white transition-colors hover:text-brutalist-cyan sm:ml-4"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
};

export default ThemeSwitch;
