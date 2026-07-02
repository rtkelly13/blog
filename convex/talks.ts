import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';
import {
  DEFAULT_CONFIG,
  type TalkConfig,
  talkConfigValidator,
} from './talkConfig';

/**
 * A talk's config. Defaults fill in for talks started before configs existed,
 * and are merged *over* a partial config so a talk stored before a newer toggle
 * (qa/poll/activities) resolves that toggle to its default, not `undefined`.
 */
export function resolveConfig(talk: {
  config?: Partial<TalkConfig>;
}): TalkConfig {
  return { ...DEFAULT_CONFIG, ...talk.config };
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

/** Public: is the current viewer a signed-in admin? Drives the presenter UI. */
export const isAdmin = query({
  args: {},
  handler: async (ctx) => isAdminUser(ctx),
});

/** The signed-in user's GitHub identity (or null) — for the admin dashboard. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const githubLogin =
      'githubLogin' in user && typeof user.githubLogin === 'string'
        ? user.githubLogin
        : null;
    return { githubLogin, name: user.name ?? null };
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

/** Presenter: start a talk (ends any currently-live one first). Admin-only. */
export const start = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    config: talkConfigValidator,
  },
  handler: async (ctx, { slug, title, config }) => {
    await requireAdmin(ctx);
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

/** Presenter: end the current talk. Admin-only. */
export const end = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await endLiveTalks(ctx);
  },
});

/**
 * Presenter: broadcast the current slide index (follow-the-presenter). Admin-only
 * and guarded to a live talk with `follow` enabled — so only an allowed GitHub
 * user can move the room, and only while a follow-enabled talk is running.
 */
export const setSlide = mutation({
  args: { room: v.string(), index: v.number() },
  handler: async (ctx, { room, index }) => {
    await requireAdmin(ctx);
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || !resolveConfig(talk).follow) return;
    await ctx.db.patch(talk._id, {
      currentSlide: Math.max(0, Math.floor(index)),
    });
  },
});

// Presenter-chosen break durations, clamped server-side.
const MIN_BREAK_MS = 30_000;
const MAX_BREAK_MS = 60 * 60_000;

/**
 * Presenter: start (or restart) a break countdown for the live talk. Only the
 * target timestamps are stored — every surface (projected break slide, console,
 * /live) derives the remaining time from the same authoritative `breakEndsAt`,
 * so the whole room shares one clock (the activity `revealAt` pattern).
 */
export const startBreak = mutation({
  args: { room: v.string(), durationMs: v.number() },
  handler: async (ctx, { room, durationMs }) => {
    await requireAdmin(ctx);
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk) throw new Error('No live talk.');
    const duration = Math.min(
      MAX_BREAK_MS,
      Math.max(MIN_BREAK_MS, Math.floor(durationMs)),
    );
    const now = Date.now();
    await ctx.db.patch(talk._id, {
      breakStartedAt: now,
      breakEndsAt: now + duration,
    });
  },
});

/** Presenter: push the break's end time out (an elapsed break resumes from now). */
export const extendBreak = mutation({
  args: { room: v.string(), byMs: v.number() },
  handler: async (ctx, { room, byMs }) => {
    await requireAdmin(ctx);
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || talk.breakEndsAt == null) return;
    const now = Date.now();
    const base = Math.max(now, talk.breakEndsAt);
    await ctx.db.patch(talk._id, {
      breakEndsAt: Math.min(
        now + MAX_BREAK_MS,
        base + Math.max(0, Math.floor(byMs)),
      ),
    });
  },
});

/** Presenter: cancel/dismiss the break countdown on every surface at once. */
export const endBreak = mutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    await requireAdmin(ctx);
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk) return;
    await ctx.db.patch(talk._id, {
      breakStartedAt: undefined,
      breakEndsAt: undefined,
    });
  },
});

/**
 * Public + reactive: the live talk's break countdown timestamps, or null when no
 * break is running (or the talk isn't live). Clients tick locally against these.
 */
export const breakStatus = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || talk.breakEndsAt == null) return null;
    return {
      startedAt: talk.breakStartedAt ?? talk.breakEndsAt,
      endsAt: talk.breakEndsAt,
    };
  },
});

// A presenter session counts as "connected" only if it pinged within this window.
const PRESENTER_TTL_MS = 15_000;

/**
 * Presenter heartbeat — one row per (room, sessionId). Admin-only; a deck in
 * presenter mode calls this on a short interval. Distinct sessionIds for the
 * same room mean more than one presenter is connected (stale tab / 2nd device).
 */
export const presenterPing = mutation({
  args: { room: v.string(), sessionId: v.string() },
  handler: async (ctx, { room, sessionId }) => {
    await requireAdmin(ctx);
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk) return;
    const now = Date.now();
    const existing = await ctx.db
      .query('presenters')
      .withIndex('by_room_session', (q) =>
        q.eq('room', room).eq('sessionId', sessionId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: now });
    } else {
      await ctx.db.insert('presenters', { room, sessionId, lastSeen: now });
    }
  },
});

/** How many presenter sessions are currently connected to a talk (≥2 = clash). */
export const presenterCount = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const cutoff = Date.now() - PRESENTER_TTL_MS;
    const rows = await ctx.db
      .query('presenters')
      .withIndex('by_room_lastSeen', (q) =>
        q.eq('room', room).gt('lastSeen', cutoff),
      )
      .collect();
    return rows.length;
  },
});

/** Scheduled (crons.ts): drop stale presenter heartbeats past the TTL. */
export const reapPresenters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENTER_TTL_MS;
    const expired = await ctx.db
      .query('presenters')
      .withIndex('by_lastSeen', (q) => q.lt('lastSeen', cutoff))
      .collect();
    await Promise.all(expired.map((row) => ctx.db.delete(row._id)));
  },
});
