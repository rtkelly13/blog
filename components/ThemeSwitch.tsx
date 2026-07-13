import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// Three themes cycled in order. `dark` is the original high-contrast brutalist
// look (white on black); `dim` softens it toward charcoal / off-white; `sketch`
// is a light paper-and-ink theme with blue / red / green accents.
const THEMES = ['dark', 'dim', 'sketch'] as const;
const LABELS: Record<string, string> = {
  dark: 'HIGH',
  dim: 'DIM',
  sketch: 'SKETCH',
};

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Only trust the resolved theme after mount to avoid a hydration mismatch
  // (the server always renders the default). Before then, assume `dark`.
  useEffect(() => setMounted(true), []);

  const active =
    mounted && theme && THEMES.includes(theme as (typeof THEMES)[number])
      ? theme
      : 'dark';
  const next =
    THEMES[
      (THEMES.indexOf(active as (typeof THEMES)[number]) + 1) % THEMES.length
    ];

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M10 2 A8 8 0 0 1 10 18 Z" fill="currentColor" />
      </svg>
    </button>
  );
};

export default ThemeSwitch;
