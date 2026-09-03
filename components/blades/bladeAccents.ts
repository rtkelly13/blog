import type { BladeAccent } from './types';

/**
 * Accent classes per blade, written out in full so Tailwind's scanner sees
 * every one of them. All four entries resolve through the `--brutalist-*`
 * tokens (or `--color-white`), so they re-point themselves under `dim` and
 * `sketch` — neon cyan/pink/yellow on the terminal, blue/red/green pen on
 * paper.
 */
export interface BladeAccentClasses {
  /** Spine label + prompt glyph when the blade is open. */
  text: string;
  /** The blade's leading edge bar. */
  bar: string;
  /** Border when the blade is open. */
  border: string;
  /** Link hover inside an open blade. */
  hover: string;
  /** Filled spine (used where the label sits on the accent, not beside it). */
  fill: string;
}

export const BLADE_ACCENTS: Record<BladeAccent, BladeAccentClasses> = {
  cyan: {
    text: 'text-brutalist-cyan',
    bar: 'bg-brutalist-cyan',
    border: 'border-brutalist-cyan',
    hover: 'hover:text-brutalist-cyan',
    fill: 'bg-brutalist-cyan text-black',
  },
  pink: {
    text: 'text-brutalist-pink',
    bar: 'bg-brutalist-pink',
    border: 'border-brutalist-pink',
    hover: 'hover:text-brutalist-pink',
    fill: 'bg-brutalist-pink text-black',
  },
  yellow: {
    text: 'text-brutalist-yellow',
    bar: 'bg-brutalist-yellow',
    border: 'border-brutalist-yellow',
    hover: 'hover:text-brutalist-yellow',
    fill: 'bg-brutalist-yellow text-black',
  },
  white: {
    text: 'text-white',
    bar: 'bg-white',
    border: 'border-white',
    hover: 'hover:text-white',
    fill: 'bg-white text-black',
  },
};

export const accentOf = (accent: BladeAccent): BladeAccentClasses =>
  BLADE_ACCENTS[accent];
