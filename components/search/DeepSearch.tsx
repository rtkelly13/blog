import type { Action } from 'kbar';
import { useKBar, useRegisterActions } from 'kbar';
import MiniSearch, { type SearchResult } from 'minisearch';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Deep (full-body) search over a static, lazy-loaded index.
 *
 * On first open the command palette fetches `public/search-index.json` (built by
 * scripts/build-search-index.mjs — every post/talk with its body as plain text),
 * indexes it in-memory with MiniSearch, and registers ranked matches as kbar
 * actions. No backend and no per-keystroke network: the index is a shared asset
 * loaded once, on demand, so it never weighs on initial page load. MiniSearch
 * gives prefix + fuzzy (typo-tolerant) matching and BM25-ish ranking for free.
 *
 * Empty query → browse all content (newest first). Non-empty → ranked matches
 * with a contextual snippet around the hit.
 */
interface Doc {
  slug: string;
  type: 'blog' | 'talk';
  title: string;
  summary: string;
  tags: string[];
  date: string;
  url: string;
  body: string;
}

const SECTION = { blog: 'Blog Posts', talk: 'Talks' } as const;

/** A short excerpt around the first matched term, else the summary/body head. */
function snippet(body: string, terms: string[]): string {
  const lower = body.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return `${body.slice(0, 140)}…`;
  const start = Math.max(0, at - 60);
  const end = Math.min(body.length, at + 100);
  return `${start > 0 ? '…' : ''}${body.slice(start, end)}${end < body.length ? '…' : ''}`;
}

export default function DeepSearch() {
  const router = useRouter();
  const { searchQuery, visualState } = useKBar((state) => ({
    searchQuery: state.searchQuery,
    visualState: state.visualState,
  }));

  // Lazy-load the index the first time the palette starts to open.
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || visualState === 'hidden') return;
    started.current = true;
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((data: Doc[]) => setDocs(data))
      .catch(() => setDocs([]));
  }, [visualState]);

  // Build the in-memory MiniSearch index once the docs are loaded.
  const mini = useMemo(() => {
    if (!docs) return null;
    const ms = new MiniSearch({
      fields: ['title', 'tags', 'summary', 'body'],
      searchOptions: {
        boost: { title: 4, tags: 2, summary: 2 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
    ms.addAll(
      docs.map((d, id) => ({
        id,
        title: d.title,
        tags: d.tags.join(' '),
        summary: d.summary,
        body: d.body,
      })),
    );
    return ms;
  }, [docs]);

  // Debounce so search doesn't run on every keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(searchQuery.trim()), 150);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const actions = useMemo<Action[]>(() => {
    if (!docs) return [];

    const chosen: { doc: Doc; terms: string[] }[] = !debounced
      ? docs.map((doc) => ({ doc, terms: [] })) // browse: newest first
      : (mini?.search(debounced) ?? []).slice(0, 12).map((r: SearchResult) => ({
          doc: docs[r.id as number],
          terms: r.terms,
        }));

    return chosen.map(({ doc, terms }) => ({
      id: `doc-${doc.type}-${doc.slug}`,
      name: doc.title,
      // Include the raw query so kbar's own matcher keeps every result we ranked.
      keywords: `${doc.tags.join(' ')} ${doc.summary} ${debounced}`,
      section: SECTION[doc.type],
      subtitle: terms.length
        ? snippet(doc.body, terms)
        : doc.summary || doc.date,
      perform: () => router.push(doc.url),
    }));
  }, [docs, mini, debounced, router]);

  useRegisterActions(actions, [actions]);

  return null;
}
