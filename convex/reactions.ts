import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

// Reactions only need to live long enough to animate on screen.
const FEED_MS = 6_000;

// Allow-list of basic, non-offensive emojis. Anything else is rejected so the
// stream can't be used to push arbitrary/unpleasant content.
const ALLOWED = new Set(['👍', '❤️', '😂', '🎉', '👏', '🔥']);

export const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];

/** Send a batch of one emoji (count = debounced taps). Validated against the allow-list. */
export const send = mutation({
  args: { room: v.string(), emoji: v.string(), count: v.number() },
  handler: async (ctx, { room, emoji, count }) => {
    if (!ALLOWED.has(emoji)) return; // silently drop anything off the allow-list
    const n = Math.min(Math.max(Math.floor(count), 1), 20);
    await ctx.db.insert('reactions', { room, emoji, count: n, at: Date.now() });

    // Accumulate the persistent tally for the closing stats chart.
    const tally = await ctx.db
      .query('reactionTotals')
      .withIndex('by_room_emoji', (q) => q.eq('room', room).eq('emoji', emoji))
      .unique();
    if (tally) {
      await ctx.db.patch(tally._id, { total: tally.total + n });
    } else {
      await ctx.db.insert('reactionTotals', { room, emoji, total: n });
    }
  },
});

/** Recent reactions for a room — clients animate `count` bubbles per row. */
export const recent = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const cutoff = Date.now() - FEED_MS;
    const rows = await ctx.db
      .query('reactions')
      .withIndex('by_room_at', (q) => q.eq('room', room).gt('at', cutoff))
      .collect();
    return rows.map((r) => ({ id: r._id, emoji: r.emoji, count: r.count }));
  },
});

/** Scheduled (crons.ts): drop reactions past the feed window. */
export const reapExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - FEED_MS;
    // Ephemeral + tiny (a few seconds of reactions) — a full scan is fine.
    const all = await ctx.db.query('reactions').collect();
    await Promise.all(
      all.filter((r) => r.at < cutoff).map((r) => ctx.db.delete(r._id)),
    );
  },
});
