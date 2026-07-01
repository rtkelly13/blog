import type { DeckProps } from 'spectacle';

// Proposal C — Editorial Three-Role typography
const DISPLAY = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';
const MONO = '"IBM Plex Mono", "Courier New", Courier, monospace';

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
    header: DISPLAY,
    text: BODY,
    monospace: MONO,
  },
  backdropStyle: {
    backgroundColor: '#000000',
  },
};
