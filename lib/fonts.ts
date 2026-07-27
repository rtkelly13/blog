import localFont from 'next/font/local';

/**
 * Site fonts, served through next/font/local instead of raw @fontsource CSS
 * imports. The woff2 files still come from the pinned @fontsource packages
 * (so font versions stay locked by pnpm), but next/font adds preloading,
 * size-adjusted fallback metrics (less CLS on slow connections), and hashed
 * family names scoped via CSS variables.
 *
 * This module must be imported from pages/_app.tsx — importing next/font from
 * _document.tsx silently skips CSS extraction (no @font-face is emitted).
 * _app defines the `--font-*` variables on :root via `fontRootVariables`, so
 * they reach everything including portalled UI (kbar). Consumers reference
 * them with a fallback — e.g. `var(--font-inter, Inter)` — so contexts
 * without next/font (Storybook) degrade to system fonts instead of an
 * invalid declaration.
 *
 * Latin subset only: next/font/local can't express @fontsource's per-subset
 * unicode-range splits, and the site is English-language.
 */

export const inter = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/inter/files/inter-latin-800-normal.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  display: 'swap',
});

export const spaceGrotesk = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
});

export const ibmPlexMono = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  // No synthesized Arial fallback: the latin subset lacks box-drawing glyphs
  // (U+2500–257F) used by ASCII diagrams, and the size-adjusted Arial face
  // matches every codepoint, so those glyphs rendered proportionally and the
  // diagrams collapsed. Missing glyphs must fall through to the real
  // monospace fonts later in the font-mono stack.
  adjustFontFallback: false,
});

export const vt323 = localFont({
  src: [
    {
      path: '../node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
});

/**
 * CSS that exposes the hashed next/font family names as the site's font
 * variables. Rendered as a <style> tag in _app.tsx; :root scope (rather than
 * next/font's `variable` classes on a wrapper div) keeps portalled UI covered.
 */
/**
 * Primary family name next/font generated for Space Grotesk (the real webfont,
 * without the size-adjusted `… Fallback` face it appends). Exposed so client
 * code can ask `document.fonts` whether the real display font has loaded — see
 * `components/DisplayFontFlag`. Space Grotesk's square brackets need an
 * optical-centering nudge that its fallback fonts don't, so it's gated on this.
 *
 * The `Fallback` face never reports as loaded, so `document.fonts.check` must
 * target only this primary family — hence we take the first entry of the stack.
 */
export const spaceGroteskFamily = spaceGrotesk.style.fontFamily
  .split(',')[0]
  .replace(/["']/g, '')
  .trim();

export const fontRootVariables = `:root {
  --font-inter: ${inter.style.fontFamily};
  --font-space-grotesk: ${spaceGrotesk.style.fontFamily};
  --font-ibm-plex-mono: ${ibmPlexMono.style.fontFamily};
  --font-vt323: ${vt323.style.fontFamily};
}`;
