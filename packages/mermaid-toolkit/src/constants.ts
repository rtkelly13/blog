import type { AsciiOptions, BoxChars } from './types';

export const UNICODE_CHARS: BoxChars = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  junction: '┼',
  arrowRight: '►',
  arrowLeft: '◄',
  arrowUp: '▲',
  arrowDown: '▼',
  dottedHorizontal: '┈',
  dottedVertical: '┊',
};

export const ASCII_CHARS: BoxChars = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
  junction: '+',
  arrowRight: '>',
  arrowLeft: '<',
  arrowUp: '^',
  arrowDown: 'v',
  dottedHorizontal: '.',
  dottedVertical: ':',
};

export const DEFAULT_OPTIONS: Required<AsciiOptions> = {
  paddingX: 5,
  paddingY: 5,
  borderPadding: 1,
  asciiOnly: false,
  showCoords: false,
};

export function getBoxChars(options: AsciiOptions): BoxChars {
  return options.asciiOnly ? ASCII_CHARS : UNICODE_CHARS;
}
