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
      },
      borderRadius: {
        md: '0.375rem',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            fontFamily: theme('fontFamily.sans'),
            color: theme('colors.gray.200'),
            a: {
              color: 'var(--brutalist-cyan, #22d3ee)',
              textDecoration: 'underline',
              fontWeight: '700',
              '&:hover': {
                color: 'var(--brutalist-pink, #ec4899)',
              },
              code: { color: 'var(--brutalist-cyan, #22d3ee)' },
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
              color: 'var(--brutalist-neonGreen, #39ff14)',
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
              color: 'var(--brutalist-cyan, #22d3ee)',
            },
            'ul li:before': {
              backgroundColor: 'var(--brutalist-pink, #ec4899)',
            },
            strong: {
              color: theme('colors.white'),
              fontWeight: '700',
            },
            blockquote: {
              color: theme('colors.white'),
              borderLeftColor: 'var(--brutalist-pink, #ec4899)',
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
              color: 'var(--brutalist-cyan, #22d3ee)',
              textDecoration: 'underline',
              fontWeight: '700',
              '&:hover': {
                color: 'var(--brutalist-pink, #ec4899)',
              },
              code: { color: 'var(--brutalist-cyan, #22d3ee)' },
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
              color: 'var(--brutalist-neonGreen, #39ff14)',
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
              color: 'var(--brutalist-cyan, #22d3ee)',
            },
            'ul li:before': {
              backgroundColor: 'var(--brutalist-pink, #ec4899)',
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
              borderLeftColor: 'var(--brutalist-pink, #ec4899)',
              borderLeftWidth: '4px',
              fontStyle: 'normal',
            },
          },
        },
      }),
    },
  },
};
