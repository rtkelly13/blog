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
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: [
          'Courier New',
          'Courier',
          'monospace',
          ...defaultTheme.fontFamily.mono,
        ],
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
        brutalist: {
          cyan: '#22d3ee',
          pink: '#ec4899',
          yellow: '#facc15',
          neonGreen: '#39ff14',
          neonCyan: '#00ffff',
        },
      },
      borderRadius: {
        none: '0px',
      },
      boxShadow: {
        'hard-sm': '2px 2px 0px 0px rgba(255, 255, 255, 1)',
        'hard-md': '4px 4px 0px 0px rgba(255, 255, 255, 1)',
        'hard-lg': '6px 6px 0px 0px rgba(255, 255, 255, 1)',
        'hard-cyan': '4px 4px 0px 0px rgba(34, 211, 238, 1)',
        'hard-pink': '4px 4px 0px 0px rgba(236, 72, 153, 1)',
        'hard-yellow': '4px 4px 0px 0px rgba(250, 204, 21, 1)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            fontFamily: theme('fontFamily.mono'),
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
              fontFamily: theme('fontFamily.mono'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h2: {
              fontFamily: theme('fontFamily.mono'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h3: {
              fontFamily: theme('fontFamily.mono'),
              fontWeight: '700',
              textTransform: 'uppercase',
              color: theme('colors.white'),
            },
            'h4,h5,h6': {
              fontFamily: theme('fontFamily.mono'),
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
            fontFamily: theme('fontFamily.mono'),
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
              fontFamily: theme('fontFamily.mono'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h2: {
              fontFamily: theme('fontFamily.mono'),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: theme('letterSpacing.tight'),
              color: theme('colors.white'),
            },
            h3: {
              fontFamily: theme('fontFamily.mono'),
              fontWeight: '700',
              textTransform: 'uppercase',
              color: theme('colors.white'),
            },
            'h4,h5,h6': {
              fontFamily: theme('fontFamily.mono'),
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
