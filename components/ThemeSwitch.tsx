import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// Two contrast levels. `dark` is the original high-contrast brutalist look
// (pure white on pure black); `dim` softens both toward charcoal / off-white
// to take the edge off. Both carry the `dark` class under the hood (see
// pages/_app.tsx), so every `dark:` style keeps working in either mode.
const LABELS: Record<string, string> = { dark: 'HIGH', dim: 'DIM' };

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Only trust the resolved theme after mount to avoid a hydration mismatch
  // (the server always renders the default). Before then, assume `dark`.
  useEffect(() => setMounted(true), []);

  const active = mounted && theme === 'dim' ? 'dim' : 'dark';
  const next = active === 'dark' ? 'dim' : 'dark';

  return (
    <button
      type="button"
      // Icon-only: the label lives in the aria-label / tooltip so the control
      // stays compact and never widens the (already dense) header past the
      // viewport. `suppressHydrationWarning` because the label depends on the
      // resolved theme, which is only known client-side.
      aria-label={`Contrast: ${LABELS[active]}. Switch to ${LABELS[next]}.`}
      title={`Contrast: ${LABELS[active]} — switch to ${LABELS[next]}`}
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
