import { v } from 'convex/values';
import { query } from './_generated/server';

/**
 * Site-wide full-text search over the `documents` corpus (blog posts + talks,
 * indexed at deploy time from the MDX sources). Backs the command palette's
 * "deep search" — matching titles, tags, summaries, and full body text, not
 * just the static title/summary list bundled in `public/search.json`.
 *
 * Returns a bounded, display-shaped projection (never the full `text` haystack)
 * so results are cheap to ship to the client.
 */
export const search = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(v.literal('blog'), v.literal('talk'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (q.length < 2) return [];
    const take = Math.min(args.limit ?? 8, 20);
    const { type } = args;

    const rows =
      type === undefined
        ? await ctx.db
            .query('documents')
            .withSearchIndex('search_text', (s) => s.search('text', q))
            .take(take)
        : await ctx.db
            .query('documents')
            .withSearchIndex('search_text', (s) =>
              s.search('text', q).eq('type', type),
            )
            .take(take);

    return rows.map((d) => ({
      slug: d.slug,
      type: d.type,
      title: d.title,
      summary: d.summary,
      tags: d.tags,
      date: d.date,
      url: d.url,
      snippet: d.snippet,
    }));
  },
});
