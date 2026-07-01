import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { type MutationCtx, mutation, query } from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';

/**
 * Session management for the admin hub. A "session" is one live run of a talk
 * (the `talks` row — its _id is the room every feature scopes to). This module
 * lists past/live sessions with the volume of data each generated, and lets the
 * presenter "clear down" that data for a single session.
 */

/** Admin: every session (newest first) with a tally of the data it generated. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdminUser(ctx))) return { authorized: false as const };

    const talks = await ctx.db.query('talks').order('desc').collect();

    const sessions = await Promise.all(
      talks.map(async (talk) => {
        const room = talk._id as string;
        const [attendees, totals, questions, polls, activitySubs] =
          await Promise.all([
            ctx.db
              .query('attendees')
              .withIndex('by_room_firstSeen', (q) => q.eq('room', room))
              .collect(),
            ctx.db
              .query('reactionTotals')
              .withIndex('by_room', (q) => q.eq('room', room))
              .collect(),
            ctx.db
              .query('questions')
              .withIndex('by_room_created', (q) => q.eq('room', room))
              .collect(),
            ctx.db
              .query('polls')
              .withIndex('by_room_created', (q) => q.eq('room', room))
              .collect(),
            ctx.db
              .query('activitySubmissions')
              .withIndex('by_room_created', (q) => q.eq('room', room))
              .collect(),
          ]);

        const reactions = totals.reduce((sum, t) => sum + t.total, 0);
        const hasData =
          attendees.length > 0 ||
          reactions > 0 ||
          questions.length > 0 ||
          polls.length > 0 ||
          activitySubs.length > 0;

        return {
          room,
          slug: talk.slug,
          title: talk.title,
          status: talk.status,
          startedAt: talk.startedAt,
          endedAt: talk.endedAt ?? null,
          counts: {
            attendees: attendees.length,
            reactions,
            questions: questions.length,
            polls: polls.length,
            activitySubmissions: activitySubs.length,
          },
          hasData,
        };
      }),
    );

    return { authorized: true as const, sessions };
  },
});

/** Delete every row in `table` matching (index, room) — small helper for clearDown. */
async function purgeByRoom(
  ctx: MutationCtx,
  table:
    | 'reactions'
    | 'reactionTotals'
    | 'attendees'
    | 'presence'
    | 'presenters'
    | 'questions'
    | 'activitySubmissions',
  index: string,
  room: string,
): Promise<number> {
  const rows = await ctx.db
    .query(table)
    .withIndex(index as any, (q: any) => q.eq('room', room))
    .collect();
  await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  return rows.length;
}

/**
 * Admin: clear down all data a session generated — reactions, head-count,
 * presence, questions, polls (+ their words) and activities (+ submissions).
 * The session record itself is kept, so the log persists (now showing zeroes).
 */
export const clearDown = mutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    await requireAdmin(ctx);

    await purgeByRoom(ctx, 'reactions', 'by_room_at', room);
    await purgeByRoom(ctx, 'reactionTotals', 'by_room', room);
    await purgeByRoom(ctx, 'attendees', 'by_room_firstSeen', room);
    await purgeByRoom(ctx, 'presence', 'by_room_lastSeen', room);
    await purgeByRoom(ctx, 'presenters', 'by_room_lastSeen', room);
    await purgeByRoom(ctx, 'questions', 'by_room_created', room);
    await purgeByRoom(ctx, 'activitySubmissions', 'by_room_created', room);

    // Polls own child word rows; activities are cleared by their own room index.
    const polls = await ctx.db
      .query('polls')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .collect();
    for (const poll of polls) {
      const words = await ctx.db
        .query('pollWords')
        .withIndex('by_poll', (q) => q.eq('pollId', poll._id))
        .collect();
      await Promise.all(words.map((w) => ctx.db.delete(w._id)));
      await ctx.db.delete(poll._id);
    }

    const activities = await ctx.db
      .query('activities')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .collect();
    await Promise.all(
      activities.map((a) => ctx.db.delete(a._id as Id<'activities'>)),
    );

    return { ok: true };
  },
});
