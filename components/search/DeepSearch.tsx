import { useQuery } from 'convex/react';
import type { Action } from 'kbar';
import { useKBar, useRegisterActions } from 'kbar';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/convex/_generated/api';

/**
 * Convex-backed "deep search": as the user types in the command palette this
 * queries the full-text `documents` index (titles, tags, summaries, and full
 * body text) and registers the hits as kbar actions under "Deep search".
 *
 * Rendered only when a Convex deployment is configured (see SearchProvider), so
 * `useQuery` always has a provider. When Convex is absent the palette still
 * works against the static `public/search.json` list — this just adds body-text
 * matching on top. Registers nothing until there's a query, so an idle palette
 * shows the normal navigation + post list.
 */
export default function DeepSearch() {
  const router = useRouter();
  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  // Debounce the live query so we don't fire a Convex read on every keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(searchQuery.trim()), 180);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const results = useQuery(
    api.documents.search,
    debounced.length >= 2 ? { query: debounced } : 'skip',
  );

  const actions = useMemo<Action[]>(() => {
    if (!results) return [];
    return results.map((r) => ({
      id: `deep-${r.type}-${r.slug}`,
      name: r.title,
      // Include the raw query in keywords so kbar's own fuzzy matcher never
      // filters out a result the server already judged relevant.
      keywords: `${r.tags.join(' ')} ${r.summary ?? ''} ${debounced}`,
      section: 'Deep search',
      subtitle: r.snippet || r.summary || r.url,
      priority: 10,
      perform: () => router.push(r.url),
    }));
  }, [results, debounced, router]);

  useRegisterActions(actions, [actions]);

  return null;
}
