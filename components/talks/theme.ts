import type { DeckProps } from 'spectacle';

// Proposal C — Editorial Three-Role typography
const DISPLAY =
  'var(--font-space-grotesk, "Space Grotesk"), ui-sans-serif, system-ui, sans-serif';
const BODY = 'var(--font-inter, Inter), system-ui, sans-serif';
const MONO =
  'var(--font-ibm-plex-mono, "IBM Plex Mono"), "Courier New", Courier, monospace';

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

/**
 * Light "paper" deck theme — ink on paper with blue/red/green accents, mirroring
 * the site's `sketch` theme. Opt in per talk via frontmatter `deckTheme: paper`.
 * Slide *content* re-themes automatically because the deck subtree is wrapped in
 * `.sketch` (see SpectacleDeck); this covers Spectacle's own chrome/backdrop.
 */
export const paperTheme: DeckProps['theme'] = {
  colors: {
    primary: '#23262e',
    secondary: '#2563eb',
    tertiary: '#f5f3ec',
    quaternary: '#dc2626',
    quinary: '#15803d',
  },
  fonts: {
    header: DISPLAY,
    text: BODY,
    monospace: MONO,
  },
  backdropStyle: {
    backgroundColor: '#f5f3ec',
  },
};
