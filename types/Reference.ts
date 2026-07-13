/**
 * One entry in a document's auto-generated bibliography. External links are
 * collected in order of first appearance and numbered LaTeX-style ([1], [2] …).
 * Every reference carries both the original URL and a Wayback Machine URL so
 * the link stays useful after the original rots.
 */
export type Reference = {
  /** Anchor id of the bibliography entry, e.g. `ref-3` (or `featured-1`). */
  id: string;
  /**
   * 1-based citation number, in order of first appearance. `null` for a
   * featured link that isn't cited inline (a curated highlight from
   * frontmatter `featuredLinks`) — it has no `[n]` marker to number.
   */
  number: number | null;
  /** Link text of the first occurrence (falls back to the domain). */
  title: string;
  /** The original external URL. */
  url: string;
  /** Hostname without a `www.` prefix, e.g. `github.com`. */
  domain: string;
  /** Wayback Machine URL that resolves to the newest archived snapshot. */
  archiveUrl: string;
  /**
   * Boosted via frontmatter `featuredLinks` — rendered in a pinned "Featured"
   * group at the top of the References section (see ADR-0007).
   */
  featured?: boolean;
};

/**
 * A curated highlight in a post/talk's frontmatter `featuredLinks`. Either a
 * bare URL string (title falls back to the domain) or `{ title, url }` to give
 * it a friendly label. Featured links that aren't cited inline still appear in
 * the References section's Featured group — the durable replacement for a
 * hand-maintained "Links" list (see ADR-0007).
 */
export type FeaturedLink = string | { title?: string; url: string };
