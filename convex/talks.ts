import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import {
  DEFAULT_CONFIG,
  type TalkConfig,
  talkConfigValidator,
} from './talkConfig';

// Presenter actions (start/end/setSlide) are gated by the shared moderation
// secret, stored in the Convex deployment env (the same MODERATION_KEY elsewhere).
function keyOk(key: string): boolean {
  const expected = process.env.MODERATION_KEY;
  return Boolean(expected) && key === expected;
}

/** A talk's config, falling back to defaults for talks started before configs. */
export function resolveConfig(talk: { config?: TalkConfig }): TalkConfig {
  return talk.config ?? DEFAULT_CONFIG;
}

/**
 * Resolve a room string to the talk it names, but only if that talk is currently
 * live. Audience functions call this to enforce "must be a live talk" — a room
 * that isn't a valid talk id (e.g. the old demo room) normalises to null and is
 * rejected, and an ended talk is rejected too. This is the server-side gate that
 * makes disabled/closed features actually closed, not merely hidden.
 */
export async function liveTalkForRoom(ctx: QueryCtx, room: string) {
  const id = ctx.db.normalizeId('talks', room);
  if (!id) return null;
  const talk = await ctx.db.get(id as Id<'talks'>);
  if (!talk || talk.status !== 'live') return null;
  return talk;
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
      config: resolveConfig(live),
      currentSlide: live.currentSlide ?? 0,
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
  args: {
    slug: v.string(),
    title: v.string(),
    key: v.string(),
    config: talkConfigValidator,
  },
  handler: async (ctx, { slug, title, key, config }) => {
    if (!keyOk(key)) throw new Error('Unauthorized: invalid moderation key.');
    await endLiveTalks(ctx);
    const id = await ctx.db.insert('talks', {
      slug,
      title,
      status: 'live',
      startedAt: Date.now(),
      config,
      currentSlide: 0,
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

/**
 * Presenter: broadcast the current slide index (follow-the-presenter). Key-gated
 * and guarded to a live talk with `follow` enabled — so only a key-holder can
 * move the room, and only while a follow-enabled talk is running.
 */
export const setSlide = mutation({
  args: { room: v.string(), index: v.number(), key: v.string() },
  handler: async (ctx, { room, index, key }) => {
    if (!keyOk(key)) throw new Error('Unauthorized: invalid moderation key.');
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || !resolveConfig(talk).follow) return;
    await ctx.db.patch(talk._id, {
      currentSlide: Math.max(0, Math.floor(index)),
    });
  },
});
