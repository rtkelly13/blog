import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import type { Reference } from 'types/Reference';
import { unified } from 'unified';
import remarkReferences from './remark-references';

/**
 * Extract the bibliography from raw MDX/markdown without a full esbuild
 * compile. Used for talks: slides are compiled individually (numbering across
 * a shared exportRef would race in Promise.all), so the deck landing page
 * extracts references from the whole talk body in one deterministic pass.
 */
export function extractReferences(source: string): Reference[] {
  const references: Reference[] = [];

  const parse = (withMdx: boolean) => {
    const processor = unified()
      .use(remarkParse)
      .use(withMdx ? [remarkMdx] : [])
      .use(remarkGfm)
      .use(remarkReferences, { exportRef: references });
    processor.runSync(processor.parse(source));
  };

  try {
    parse(true);
  } catch {
    // MDX syntax the strict parser rejects (mdx-bundler may still accept it
    // slide-by-slide) — fall back to plain markdown, which still finds links.
    references.length = 0;
    parse(false);
  }

  return references;
}
