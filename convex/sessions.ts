import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';

/**
 * Ended sessions are auto-purged this long after they end (the `talks` row is
 * kept, only its generated data goes). Manual clear-down is available sooner.
 * See ADR-0003.
 */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

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

/**
 * Each room-scoped table paired with its room index. This single map is the
 * source of truth for `purgeByRoom`, so a table can only ever be purged through
 * its correct room-keyed index — a mismatched pairing is impossible to express
 * at the call site (the old `index as any` param let a wrong index slip through
 * and fail silently as a no-op delete at runtime).
 */
const ROOM_INDEX = {
  reactions: 'by_room_at',
  reactionTotals: 'by_room',
  attendees: 'by_room_firstSeen',
  presence: 'by_room_lastSeen',
  presenters: 'by_room_lastSeen',
  questions: 'by_room_created',
  activitySubmissions: 'by_room_created',
} as const;

type RoomTable = keyof typeof ROOM_INDEX;

/** Delete every row in `table` for `room`, via that table's room index. */
async function purgeByRoom(
  ctx: MutationCtx,
  table: RoomTable,
  room: string,
): Promise<number> {
  const rows = await ctx.db
    .query(table)
    // The (table → index) pairing is validated by ROOM_INDEX; the cast only
    // bridges the union-typed `table` to Convex's per-table index typing.
    .withIndex(ROOM_INDEX[table] as never, (q: any) => q.eq('room', room))
    .collect();
  await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  return rows.length;
}

/**
 * Delete every row every feature scoped to this room — reactions, head-count,
 * presence, questions (+ their vote ledger), polls (+ their words and submitter
 * ledger) and activities (+ submissions). The `talks` row itself is left intact,
 * so the session log persists (now showing zeroes). Shared by the manual
 * clear-down and the auto-expiry reaper. See ADR-0003.
 */
async function purgeSessionData(ctx: MutationCtx, room: string): Promise<void> {
  await purgeByRoom(ctx, 'reactions', room);
  await purgeByRoom(ctx, 'reactionTotals', room);
  await purgeByRoom(ctx, 'attendees', room);
  await purgeByRoom(ctx, 'presence', room);
  await purgeByRoom(ctx, 'presenters', room);
  await purgeByRoom(ctx, 'activitySubmissions', room);

  // Questions own child vote rows (keyed by question, not room).
  const questions = await ctx.db
    .query('questions')
    .withIndex('by_room_created', (q) => q.eq('room', room))
    .collect();
  for (const question of questions) {
    const votes = await ctx.db
      .query('questionVotes')
      .withIndex('by_question_machine', (q) => q.eq('questionId', question._id))
      .collect();
    await Promise.all(votes.map((row) => ctx.db.delete(row._id)));
    await ctx.db.delete(question._id);
  }

  // Polls own child word + submitter rows; activities are cleared by room index.
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
    const submitters = await ctx.db
      .query('pollSubmitters')
      .withIndex('by_poll_machine', (q) => q.eq('pollId', poll._id))
      .collect();
    await Promise.all(submitters.map((s) => ctx.db.delete(s._id)));
    await ctx.db.delete(poll._id);
  }

  const activities = await ctx.db
    .query('activities')
    .withIndex('by_room_created', (q) => q.eq('room', room))
    .collect();
  await Promise.all(
    activities.map((a) => ctx.db.delete(a._id as Id<'activities'>)),
  );
}

/**
 * Admin: clear down all data a session generated. The session record itself is
 * kept, so the log persists (now showing zeroes).
 */
export const clearDown = mutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    await requireAdmin(ctx);

    // A live session must be ended before its data can be cleared — otherwise
    // still-connected clients immediately repopulate presence/reactions and the
    // wipe looks like it silently failed.
    const talk = await ctx.db.get(room as Id<'talks'>);
    if (talk?.status === 'live') {
      throw new Error('End the talk before clearing its data.');
    }

    await purgeSessionData(ctx, room);
    return { ok: true };
  },
});

/**
 * Admin: permanently delete a session — purge all data it generated AND remove
 * the `talks` row itself, so it disappears from the session log. Irreversible;
 * to keep the log entry but drop the audience content, use `clearDown`. A live
 * session must be ended first (same guard, same reason).
 */
export const deleteSession = mutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    await requireAdmin(ctx);

    const talk = await ctx.db.get(room as Id<'talks'>);
    if (!talk) return { ok: true }; // already gone — deleting is idempotent
    if (talk.status === 'live') {
      throw new Error('End the talk before deleting the session.');
    }

    await purgeSessionData(ctx, room);
    await ctx.db.delete(talk._id);
    return { ok: true };
  },
});

/**
 * Scheduled (crons.ts): auto-expire ended sessions past the retention window.
 * Purges each old session's generated data while keeping its `talks` row, so the
 * session log stays but the (possibly unmasked) audience content does not.
 * See ADR-0003.
 */
export const reapEndedSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    const ended = await ctx.db
      .query('talks')
      .withIndex('by_status', (q) => q.eq('status', 'ended'))
      .collect();
    for (const talk of ended) {
      if ((talk.endedAt ?? talk.startedAt) > cutoff) continue;
      await purgeSessionData(ctx, talk._id as string);
    }
  },
});
