/**
 * Blades — the shared vocabulary.
 *
 * A "blade" is one edge-labelled panel in an ordered set. Every variation in
 * `components/blades/` renders the *same* model with a different geometry, so
 * the site can swap the navigation's shape without touching its content.
 *
 * The two design languages come out of the token remap, not out of a branch:
 * on the terminal themes a blade reads as an edge-lit slab of a stacked
 * dashboard; under `sketch` the identical markup reads as a paper divider,
 * because `--color-black`, `--color-white` and the `--brutalist-*` accents
 * have already flipped to paper / graphite / pen. Build on the remapped
 * tokens only and both languages come for free.
 */

/** Accent roles a blade may carry. Maps onto the `--brutalist-*` tokens. */
export type BladeAccent = 'cyan' | 'pink' | 'yellow' | 'white';

/** One link inside an opened blade. */
export interface BladeItem {
  label: string;
  href: string;
  /** Short mono annotation shown after the label. */
  note?: string;
}

/** One blade: a spine label, a one-line hint, and the links it opens onto. */
export interface Blade {
  id: string;
  /** Spine text — short, uppercase reads best on a 3rem spine. */
  label: string;
  /** One line of `>`-prompt copy shown when the blade is open. */
  hint: string;
  accent: BladeAccent;
  items: BladeItem[];
}

/** Props every blade variation accepts, so they are interchangeable. */
export interface BladesProps {
  blades: Blade[];
  /** Index opened on first render. */
  initialIndex?: number;
  /**
   * Open a blade on pointer-over as well as on click. Hover-to-open suits a
   * navigation rail; click-only suits anything a reader has to aim at.
   */
  openOnHover?: boolean;
}
