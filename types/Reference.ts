/**
 * One entry in a document's auto-generated bibliography. External links are
 * collected in order of first appearance and numbered LaTeX-style ([1], [2] …).
 * Every reference carries both the original URL and a Wayback Machine URL so
 * the link stays useful after the original rots.
 */
export type Reference = {
  /** Anchor id of the bibliography entry, e.g. `ref-3`. */
  id: string;
  /** 1-based citation number, in order of first appearance. */
  number: number;
  /** Link text of the first occurrence (falls back to the domain). */
  title: string;
  /** The original external URL. */
  url: string;
  /** Hostname without a `www.` prefix, e.g. `github.com`. */
  domain: string;
  /** Wayback Machine URL that resolves to the newest archived snapshot. */
  archiveUrl: string;
};
