/**
 * Dividers — the shared vocabulary.
 *
 * A **divider** is one edge-labelled panel in an ordered set: shut it costs a
 * sliver, open it holds a whole section. Every variation under
 * `components/dividers/` renders the same model with a different geometry, so
 * the site can change the navigation's shape without touching its content.
 *
 * Two families sit on top of it:
 *
 * - `tabs/` — **notebook tabs**: a column of vertical tabs pinned tight to the
 *   left edge. The proposal that replaces the header.
 * - `blades/` — the wider geometry exploration (stacks, fans, folds), kept as
 *   the record of what else was tried.
 *
 * The two design languages come out of the token remap, not out of a branch:
 * on the terminal themes a divider reads as an edge-lit rail; under `sketch`
 * the identical markup reads as an index tab in a notebook, because
 * `--color-black`, `--color-white` and the `--brutalist-*` accents have
 * already flipped to paper / graphite / pen. Build on the remapped tokens only
 * and both languages come for free.
 */

/** Accent roles a divider may carry. Maps onto the `--brutalist-*` tokens. */
export type DividerAccent = 'cyan' | 'pink' | 'yellow' | 'white';

/** One link inside an opened divider. */
export interface DividerItem {
  label: string;
  href: string;
  /** Short mono annotation shown after the label. */
  note?: string;
}

/** One divider: a tab label, a one-line hint, and the links it opens onto. */
export interface Divider {
  id: string;
  /** Tab text — short, uppercase reads best on a 3rem vertical tab. */
  label: string;
  /** One line of `>`-prompt copy shown when the divider is open. */
  hint: string;
  accent: DividerAccent;
  items: DividerItem[];
}

/** Props every variation accepts, so they are interchangeable. */
export interface DividerSetProps {
  dividers: Divider[];
  /** Index opened on first render. */
  initialIndex?: number;
  /**
   * Open on pointer-over as well as on click. Hover-to-open suits a permanent
   * navigation rail; click-only suits anything a reader has to aim at.
   */
  openOnHover?: boolean;
}
