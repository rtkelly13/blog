import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { enforceRateLimit } from './lib/rateLimit';
import { liveTalkForRoom, resolveConfig } from './talks';

// Reactions only need to live long enough to animate on screen.
const FEED_MS = 6_000;

// Allow-list of basic, non-offensive emojis. Anything else is rejected so the
// stream can't be used to push arbitrary/unpleasant content.
const ALLOWED = new Set(['👍', '❤️', '😂', '🎉', '👏', '🔥']);

export const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];

/**
 * Send a batch of one emoji (count = debounced taps, clamped 1–20 — that's
 * input clamping; the real flood control is the per-machine rate limit on
 * batches, refused with a structured `rate_limited` result the UI surfaces).
 * Validated against the allow-list.
 */
export const send = mutation({
  args: {
    room: v.string(),
    emoji: v.string(),
    count: v.number(),
    machineId: v.string(),
  },
  handler: async (ctx, { room, emoji, count, machineId }) => {
    // Drop anything off the allow-list (structured, but nothing to retry).
    if (!ALLOWED.has(emoji)) {
      return { ok: false as const, reason: 'dropped' as const };
    }
    // Server-side gate: reactions only land for a live talk with reactions on.
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || !resolveConfig(talk).reactions) {
      return { ok: false as const, reason: 'dropped' as const };
    }

    const limited = await enforceRateLimit(ctx, machineId, 'reaction:send');
    if (limited) return limited;

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
    return { ok: true as const };
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
