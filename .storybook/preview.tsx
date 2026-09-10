import type { Preview } from '@storybook/nextjs-vite';
import type React from 'react';
import { useEffect } from 'react';
import '../css/tailwind.css';

// Mirrors ThemeSwitch.tsx: next-themes puts one of these classes on <html>,
// and css/tailwind.css remaps the colour tokens under `.dim` / `.sketch`.
const THEMES = ['midnight', 'sketch'] as const;

const ThemeDecorator = ({
  theme,
  children,
}: {
  theme: string;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...THEMES);
    root.classList.add(theme);
    // The design system selects on `[data-theme]`, so Storybook has to set it
    // too or a story renders the root level's tokens whatever the toolbar says
    // — the same break `pages/_app.tsx` had.
    root.setAttribute('data-theme', theme);
  }, [theme]);
  // Paint the canvas with remapped tokens so the story sits on the theme's
  // surface (paper in SKETCH, black terminal in HIGH/DIM).
  return <div className="min-h-screen bg-black p-8 text-white">{children}</div>;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Site theme (token remap on <html>)',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'midnight', title: 'MIDNIGHT' },
          { value: 'sketch', title: 'SKETCH (paper & ink)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'midnight',
  },
  decorators: [
    (Story, context) => (
      <ThemeDecorator theme={context.globals.theme ?? 'midnight'}>
        <Story />
      </ThemeDecorator>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
