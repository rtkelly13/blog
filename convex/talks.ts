import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

// Presenter actions (start/end) are gated by the shared moderation secret,
// stored in the Convex deployment env (the same MODERATION_KEY used elsewhere).
function keyOk(key: string): boolean {
  const expected = process.env.MODERATION_KEY;
  return Boolean(expected) && key === expected;
}

async function endLiveTalks(ctx: MutationCtx): Promise<void> {
  const live = await ctx.db
    .query('talks')
    .withIndex('by_status', (q) => q.eq('status', 'live'))
    .collect();
  await Promise.all(
    live.map((t) =>
      ctx.db.patch(t._id, { status: 'ended', endedAt: Date.now() }),
    ),
  );
}

/**
 * The currently-live talk, or null. Public + reactive — this is the "easy to
 * join" entry point: a client just asks for the current talk and attaches
 * presence/chat to its id. The `room` is the talk's _id, so every start is a
 * clean session.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const live = await ctx.db
      .query('talks')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .order('desc')
      .first();
    if (!live) return null;
    return {
      room: live._id,
      slug: live.slug,
      title: live.title,
      startedAt: live.startedAt,
    };
  },
});

/**
 * Aggregated stats for a talk room — for the closing chart. Reactive, so the
 * chart animates as reactions land right up to the final slide.
 */
export const stats = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const tallies = await ctx.db
      .query('reactionTotals')
      .withIndex('by_room', (q) => q.eq('room', room))
      .collect();
    const reactions = tallies
      .map((t) => ({ emoji: t.emoji, total: t.total }))
      .sort((a, b) => b.total - a.total);
    const totalReactions = reactions.reduce((sum, r) => sum + r.total, 0);

    const attendeeRows = await ctx.db
      .query('attendees')
      .withIndex('by_room_firstSeen', (q) => q.eq('room', room))
      .collect();

    return { reactions, totalReactions, attendees: attendeeRows.length };
  },
});

/** Presenter: start a talk (ends any currently-live one first). */
export const start = mutation({
  args: { slug: v.string(), title: v.string(), key: v.string() },
  handler: async (ctx, { slug, title, key }) => {
    if (!keyOk(key)) throw new Error('Unauthorized: invalid moderation key.');
    await endLiveTalks(ctx);
    const id = await ctx.db.insert('talks', {
      slug,
      title,
      status: 'live',
      startedAt: Date.now(),
    });
    return { room: id };
  },
});

/** Presenter: end the current talk. */
export const end = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    if (!keyOk(key)) throw new Error('Unauthorized: invalid moderation key.');
    await endLiveTalks(ctx);
  },
});
