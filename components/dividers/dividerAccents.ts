import type { DividerAccent } from './types';

/**
 * Accent classes per divider, written out in full so Tailwind's scanner sees
 * every one of them. All four entries resolve through the `--brutalist-*`
 * tokens (or `--color-white`), so they re-point themselves under `dim` and
 * `sketch` — neon cyan/pink/yellow on the terminal, blue/red/green pen on
 * paper.
 *
 * ## The state rule (learned the hard way)
 *
 * **Selected state is carried by `fill` or `edge`. Never by a surface pair.**
 *
 * The obvious way to mark a chosen tab is to give it `bg-black` while its
 * siblings keep `bg-zinc-900`. That reads acceptably on the terminal —
 * `#000000` against `#18181b` — and is *invisible* on paper, where the same
 * two tokens remap to `#f5f3ec` and `#efeadf`: a 3% lightness difference doing
 * the entire job of telling a reader which tab they are on.
 *
 * Both devices below survive the remap at full contrast, because both are
 * built on the accents, which stay saturated in every theme:
 *
 * - `fill` — solid accent, inverted text. The loud one. Use it wherever the
 *   selection is the point of the widget.
 * - `edge` — a 4px accent rule on one side. The quiet one, for a tab strip
 *   that should not shout.
 *
 * Surface tokens are still the right tool for *layering* (a strip behind its
 * tabs, a panel over a page). They are only wrong for state. Pair either
 * device with a text-weight change and the widget reads at a glance in both
 * languages.
 */
export interface DividerAccentClasses {
  /** Label + prompt glyph when the divider is open. */
  text: string;
  /** A leading edge bar, as a background block. */
  bar: string;
  /** Border on all sides. */
  border: string;
  /** A 4px bottom rule — the quiet selected-state device. */
  edge: string;
  /** Link hover inside an open divider. */
  hover: string;
  /** Solid accent with inverted text — the loud selected-state device. */
  fill: string;
}

export const DIVIDER_ACCENTS: Record<DividerAccent, DividerAccentClasses> = {
  cyan: {
    text: 'text-brutalist-cyan',
    bar: 'bg-brutalist-cyan',
    border: 'border-brutalist-cyan',
    edge: 'border-b-brutalist-cyan',
    hover: 'hover:text-brutalist-cyan',
    fill: 'bg-brutalist-cyan text-black',
  },
  pink: {
    text: 'text-brutalist-pink',
    bar: 'bg-brutalist-pink',
    border: 'border-brutalist-pink',
    edge: 'border-b-brutalist-pink',
    hover: 'hover:text-brutalist-pink',
    fill: 'bg-brutalist-pink text-black',
  },
  yellow: {
    text: 'text-brutalist-yellow',
    bar: 'bg-brutalist-yellow',
    border: 'border-brutalist-yellow',
    edge: 'border-b-brutalist-yellow',
    hover: 'hover:text-brutalist-yellow',
    fill: 'bg-brutalist-yellow text-black',
  },
  white: {
    text: 'text-white',
    bar: 'bg-white',
    border: 'border-white',
    edge: 'border-b-white',
    hover: 'hover:text-white',
    fill: 'bg-white text-black',
  },
};

export const accentOf = (accent: DividerAccent): DividerAccentClasses =>
  DIVIDER_ACCENTS[accent];
