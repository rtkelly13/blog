import type { Action } from 'kbar';
import { useKBar, useRegisterActions } from 'kbar';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Deep (full-body) search over a static, lazy-loaded index.
 *
 * On first open the command palette fetches `public/search-index.json` (built by
 * scripts/build-search-index.mjs — every post/talk with its body as plain text),
 * then ranks matches client-side and registers them as kbar actions. No backend
 * and no per-keystroke network: the index is a shared asset loaded once, on
 * demand, so it never weighs on initial page load.
 *
 * Empty query → browse all content (newest first). Non-empty → weighted match
 * across title/tags/summary/body with a contextual snippet.
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

/** Weighted score; returns 0 unless every query term hits at least one field. */
function score(doc: Doc, terms: string[]): number {
  const title = doc.title.toLowerCase();
  const tags = doc.tags.join(' ').toLowerCase();
  const summary = doc.summary.toLowerCase();
  const body = doc.body.toLowerCase();
  let total = 0;
  for (const term of terms) {
    let hit = 0;
    if (title.includes(term)) hit += title.startsWith(term) ? 12 : 8;
    if (tags.includes(term)) hit += 5;
    if (summary.includes(term)) hit += 3;
    if (body.includes(term)) hit += 1;
    if (hit === 0) return 0; // AND semantics: every term must appear somewhere
    total += hit;
  }
  return total;
}

/** A short excerpt around the first matched term, else the summary/body head. */
function snippet(doc: Doc, terms: string[]): string {
  const body = doc.body;
  const lower = body.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return doc.summary || `${body.slice(0, 140)}…`;
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

  // Debounce so ranking doesn't run on every keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(
      () => setDebounced(searchQuery.trim().toLowerCase()),
      150,
    );
    return () => clearTimeout(id);
  }, [searchQuery]);

  const actions = useMemo<Action[]>(() => {
    if (!docs) return [];
    const terms = debounced.split(/\s+/).filter(Boolean);

    const chosen =
      terms.length === 0
        ? docs
        : docs
            .map((d) => ({ d, s: score(d, terms) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 12)
            .map((x) => x.d);

    return chosen.map((d) => ({
      id: `doc-${d.type}-${d.slug}`,
      name: d.title,
      // Include the raw query so kbar's own matcher keeps every result we ranked.
      keywords: `${d.tags.join(' ')} ${d.summary} ${debounced}`,
      section: SECTION[d.type],
      subtitle: terms.length ? snippet(d, terms) : d.summary || d.date,
      perform: () => router.push(d.url),
    }));
  }, [docs, debounced, router]);

  useRegisterActions(actions, [actions]);

  return null;
}
