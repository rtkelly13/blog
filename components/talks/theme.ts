import type { DeckProps } from 'spectacle';

const MONO = '"Courier New", Courier, monospace';

/**
 * Brutalist Spectacle theme. Most slide styling comes from the MDX content's
 * own Tailwind classes; this theme controls the deck backdrop, the template
 * chrome (slide number / progress / fullscreen), and Spectacle's own
 * components. Slides set an explicit black background.
 */
export const brutalistTheme: DeckProps['theme'] = {
  colors: {
    primary: '#ffffff',
    secondary: '#22d3ee',
    tertiary: '#000000',
    quaternary: '#ec4899',
    quinary: '#facc15',
  },
  fonts: {
    header: MONO,
    text: MONO,
    monospace: MONO,
  },
  backdropStyle: {
    backgroundColor: '#000000',
  },
};
