import { toString } from 'mdast-util-to-string';
import type { Reference } from 'types/Reference';
import type { Parent } from 'unist';
import { SKIP, visit } from 'unist-util-visit';

export interface RemarkReferencesOptions {
  /** Collected references are pushed here, in order of first appearance. */
  exportRef: Reference[];
  /**
   * Insert a LaTeX-style `[n]` citation marker after every external link,
   * anchored to the matching bibliography entry (`#ref-n`). Blog posts turn
   * this on; talks only collect (slides stay clean, the deck landing page
   * renders the bibliography).
   */
  insertMarkers?: boolean;
  /**
   * Placement-override signal. When the author drops a `<References />`
   * component into the body, they've chosen where the bibliography renders,
   * so the layout must suppress its own auto-appended section. The plugin
   * sets `manualPlacement` here if it finds such a node; the caller reads it
   * back after compilation (see `getFileBySlug`). Adapted from
   * rehype-citation's `[^ref]` placement tag — we use an MDX component
   * instead, since `[^ref]` collides with GFM footnote syntax in our pipeline.
   */
  meta?: { manualPlacement: boolean };
}

/** External means archivable: only http(s) links get bibliography entries. */
function isExternalUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//.test(url);
}

/**
 * Wayback Machine URL for the newest snapshot of `url`. No timestamp pin —
 * `web.archive.org/web/<url>` redirects to the latest capture, so entries
 * stay useful without hardcoding snapshot ids into content.
 * `scripts/archive-links.mjs` submits every referenced URL to Save Page Now
 * so a capture actually exists.
 */
export function toArchiveUrl(url: string): string {
  return `https://web.archive.org/web/${url}`;
}

export function buildReference(
  url: string,
  linkText: string,
  number: number,
): Reference | null {
  let domain: string;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null; // malformed URL — leave the link alone
  }
  const title = linkText && linkText !== url ? linkText : domain;
  return {
    id: `ref-${number}`,
    number,
    title,
    url,
    domain,
    archiveUrl: toArchiveUrl(url),
  };
}

/**
 * Collects every external link into a numbered bibliography (deduped by URL,
 * ordered by first appearance) and optionally inserts `[n]` citation markers.
 * Same `exportRef` pattern as remark-toc-headings: the caller owns the array
 * and reads it after compilation.
 */
export default function remarkReferences(options: RemarkReferencesOptions) {
  return (tree: Parent) => {
    const byUrl = new Map<string, Reference>();

    // Placement override: a `<References />` node anywhere in the body means
    // the author is rendering the bibliography themselves, so the layout
    // shouldn't also auto-append it.
    if (options.meta) {
      visit(tree, (node: any) => {
        if (
          (node.type === 'mdxJsxFlowElement' ||
            node.type === 'mdxJsxTextElement') &&
          node.name === 'References'
        ) {
          options.meta!.manualPlacement = true;
        }
      });
    }

    visit(tree, 'link', (node: any, index, parent: any) => {
      if (!parent || index === undefined) return;
      if (!isExternalUrl(node.url)) return;
      // Headings already get autolink anchors; a citation marker there would
      // pollute slugs and the TOC.
      if (parent.type === 'heading') return;

      let ref = byUrl.get(node.url);
      const firstOccurrence = !ref;
      if (!ref) {
        const built = buildReference(node.url, toString(node), byUrl.size + 1);
        if (!built) return;
        ref = built;
        byUrl.set(node.url, ref);
        options.exportRef.push(ref);
      }

      if (!options.insertMarkers) return;

      const marker = {
        type: 'link',
        url: `#${ref.id}`,
        data: {
          hProperties: {
            className: ['citation-ref'],
            // The bibliography's ↩ backlink targets the first citation only.
            ...(firstOccurrence ? { id: `cite-${ref.number}` } : {}),
            ariaLabel: `Jump to reference ${ref.number}`,
            // Hover shows the full entry (rehype-citation's `showTooltips`).
            title: `[${ref.number}] ${ref.title} — ${ref.domain}`,
          },
        },
        children: [{ type: 'text', value: `[${ref.number}]` }],
      };
      parent.children.splice(index + 1, 0, marker);
      // Resume after the inserted marker so it is never itself visited.
      return [SKIP, index + 2];
    });
  };
}
