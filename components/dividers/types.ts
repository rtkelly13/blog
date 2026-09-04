import type { ReactNode } from 'react';

/**
 * Dividers — the shared vocabulary for the site rail.
 *
 * A **divider** is one section of the site: a short tab label and the pages
 * inside it. `SiteRail` renders an ordered set of them as a column of vertical
 * tabs tight to the left edge, with the open section's pages on a second rail
 * beside it — the way index tabs run down the edge of a notebook.
 *
 * The two design languages come out of the token remap, not out of a branch:
 * on the terminal themes the rail reads as an edge-lit strip; under `sketch`
 * the identical markup reads as paper index tabs, because `--color-black`,
 * `--color-white` and the `--brutalist-*` accents have already flipped to
 * paper / graphite / pen. Build on the remapped tokens only and both languages
 * come for free.
 */

/**
 * Accent roles a divider may carry. Maps onto the `--brutalist-*` tokens, and
 * deliberately the same three `PageHeader` accepts, because the rail and the
 * page header must agree on a section's colour — the per-section rule lives in
 * `components/AGENTS.md` (cyan default, pink talks, yellow ideas). When this
 * is promoted to the package's `--ds-*` roles these become `Emphasis` tokens.
 */
export type DividerAccent = 'cyan' | 'pink' | 'yellow';

/** One page inside a section. */
export interface DividerItem {
  label: string;
  href: string;
}

/** One section of the site: a tab label, an accent, and the pages inside it. */
export interface Divider {
  id: string;
  /** Tab text — short, uppercase reads best on a 3rem vertical tab. */
  label: string;
  accent: DividerAccent;
  /** The first item is the section's landing page. */
  items: DividerItem[];
}

export interface SiteRailProps {
  dividers: Divider[];
  /**
   * The path the rail marks as the reader's location. Defaults to the
   * router's current path; the sandbox passes it explicitly so two rails can
   * show two locations side by side.
   */
  currentPath?: string;
  /**
   * Controls pinned to the foot of the rail — where search and the theme
   * switch go when there is no header to hold them.
   */
  controls?: ReactNode;
  /** The page, rendered to the right of both rails. */
  children?: ReactNode;
  className?: string;
}
