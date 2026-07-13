// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

/** @type {import("tailwindcss/tailwind-config").TailwindConfig } */
module.exports = {
  content: [
    './pages/**/*.tsx',
    './components/**/*.tsx',
    './layouts/**/*.tsx',
    './lib/**/*.ts',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: {
        '9/16': '56.25%',
      },
      lineHeight: {
        11: '2.75rem',
        12: '3rem',
        13: '3.25rem',
        14: '3.5rem',
      },
      fontFamily: {
        // Proposal C — Editorial Three-Role
        // Families come from next/font/local (lib/fonts.ts) via CSS variables;
        // the var() fallbacks keep non-Next contexts (Storybook) on sane fonts.
        sans: ['var(--font-inter, Inter)', ...defaultTheme.fontFamily.sans], // body / reading
        display: [
          'var(--font-space-grotesk, "Space Grotesk")',
          ...defaultTheme.fontFamily.sans,
        ], // headings / display
        mono: [
          'var(--font-ibm-plex-mono, "IBM Plex Mono")',
          'Courier New',
          'Courier',
          'monospace',
          ...defaultTheme.fontFamily.mono,
        ], // code + UI / metadata
        pixel: ['var(--font-vt323, "VT323")', 'monospace'], // decorative accent (hero/logo)
      },
      colors: {
        primary: colors.teal,
        gray: colors.neutral,
        code: {
          green: '#b5f4a5',
          yellow: '#ffe484',
          purple: '#d9a9ff',
          red: '#ff8383',
          blue: '#93ddfd',
          white: '#fff',
        },
        // Accent colours read through CSS variables (with the original values
        // as fallbacks) so a theme can re-point them in one place — e.g. the
        // `sketch` theme swaps the neon cyan/pink/yellow for blue/red/green.
        // See the theme blocks in css/tailwind.css.
        brutalist: {
          cyan: 'var(--brutalist-cyan, #22d3ee)',
          pink: 'var(--brutalist-pink, #ec4899)',
          yellow: 'var(--brutalist-yellow, #facc15)',
          neonGreen: 'var(--brutalist-neonGreen, #39ff14)',
          neonCyan: 'var(--brutalist-neonCyan, #00ffff)',
          cyberOrange: 'var(--brutalist-cyberOrange, #ff8c00)',
          darkBg: '#0a0a1a',
        },
      },
      borderRadius: {
        none: '0px',
        md: '0.375rem',
      },
      boxShadow: {
        // White offset shadows read through a themeable color token so the
        // `dim` theme can soften them (see css/tailwind.css). Falls back to
        // pure white for the default `dark` theme and non-themed contexts.
        'hard-sm':
          '2px 2px 0px 0px var(--brutalist-shadow-color, rgba(255, 255, 255, 1))',
        'hard-md':
          '4px 4px 0px 0px var(--brutalist-shadow-color, rgba(255, 255, 255, 1))',
        'hard-lg':
          '6px 6px 0px 0px var(--brutalist-shadow-color, rgba(255, 255, 255, 1))',
        'hard-cyan': '4px 4px 0px 0px rgba(34, 211, 238, 1)',
        'hard-pink': '4px 4px 0px 0px rgba(236, 72, 153, 1)',
        'hard-yellow': '4px 4px 0px 0px rgba(250, 204, 21, 1)',
        'glow-cyan':
          '0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-orange':
          '0 0 20px rgba(255, 140, 0, 0.8), 0 0 40px rgba(255, 140, 0, 0.5)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            fontFamily: theme('fontFamily.sans'),
            color: theme('colors.gray.200'),
            a: {
              color: theme('colors.brutalist.cyan'),
              textDecoration: 'underline',
              fontWeight: '700',
              '&:hover': {
                color: theme('colors.brutalist.pink'),
              },
              code: { color: theme('colors.brutalist.cyan') },
            },
            h1: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h2: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h3: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              color: theme('colors.white'),
            },
            'h4,h5,h6': {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              color: theme('colors.white'),
            },
            code: {
              fontFamily: theme('fontFamily.mono'),
              color: theme('colors.brutalist.neonGreen'),
              backgroundColor: theme('colors.black'),
              paddingLeft: '4px',
              paddingRight: '4px',
              paddingTop: '2px',
              paddingBottom: '2px',
              border: '1px solid',
              borderColor: theme('colors.white'),
              borderRadius: '0px',
            },
            'code:before': {
              content: 'none',
            },
            'code:after': {
              content: 'none',
            },
            details: {
              backgroundColor: theme('colors.zinc.900'),
              paddingLeft: '4px',
              paddingRight: '4px',
              paddingTop: '2px',
              paddingBottom: '2px',
              borderRadius: '0px',
              border: '2px solid',
              borderColor: theme('colors.white'),
            },
            hr: {
              borderColor: theme('colors.white'),
              borderWidth: '2px',
              borderStyle: 'solid',
            },
            'ol li:before': {
              fontWeight: '700',
              color: theme('colors.brutalist.cyan'),
            },
            'ul li:before': {
              backgroundColor: theme('colors.brutalist.pink'),
            },
            strong: {
              color: theme('colors.white'),
              fontWeight: '700',
            },
            blockquote: {
              color: theme('colors.white'),
              borderLeftColor: theme('colors.brutalist.pink'),
              borderLeftWidth: '4px',
              fontStyle: 'normal',
            },
          },
        },
        dark: {
          css: {
            fontFamily: theme('fontFamily.sans'),
            color: theme('colors.gray.200'),
            a: {
              color: theme('colors.brutalist.cyan'),
              textDecoration: 'underline',
              fontWeight: '700',
              '&:hover': {
                color: theme('colors.brutalist.pink'),
              },
              code: { color: theme('colors.brutalist.cyan') },
            },
            h1: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h2: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h3: {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              color: theme('colors.white'),
            },
            'h4,h5,h6': {
              fontFamily: theme('fontFamily.display'),
              fontWeight: '700',
              textTransform: 'uppercase',
              color: theme('colors.white'),
            },
            code: {
              fontFamily: theme('fontFamily.mono'),
              color: theme('colors.brutalist.neonGreen'),
              backgroundColor: theme('colors.black'),
              border: '1px solid',
              borderColor: theme('colors.white'),
              borderRadius: '0px',
            },
            details: {
              backgroundColor: theme('colors.zinc.900'),
              borderRadius: '0px',
              border: '2px solid',
              borderColor: theme('colors.white'),
            },
            hr: {
              borderColor: theme('colors.white'),
              borderWidth: '2px',
              borderStyle: 'solid',
            },
            'ol li:before': {
              fontWeight: '700',
              color: theme('colors.brutalist.cyan'),
            },
            'ul li:before': {
              backgroundColor: theme('colors.brutalist.pink'),
            },
            strong: {
              color: theme('colors.white'),
              fontWeight: '700',
            },
            thead: {
              color: theme('colors.white'),
              fontWeight: '700',
            },
            tbody: {
              tr: {
                borderBottomColor: theme('colors.white'),
                borderBottomWidth: '2px',
              },
            },
            blockquote: {
              color: theme('colors.white'),
              borderLeftColor: theme('colors.brutalist.pink'),
              borderLeftWidth: '4px',
              fontStyle: 'normal',
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
