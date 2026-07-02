import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';
import { cleanText } from './lib/profanity';
import { liveTalkForRoom } from './talks';

const MAX_TEXT_LEN = 280;
const MAX_NICKNAME_LEN = 24;

/** Sort a question list into the "top questions" order: votes desc, then oldest. */
function byPriority<T extends { votes: number; createdAt: number }>(
  a: T,
  b: T,
): number {
  return b.votes - a.votes || a.createdAt - b.createdAt;
}

/** Audience: ask a question. Gated on a live talk owning the room. */
export const ask = mutation({
  args: {
    room: v.string(),
    text: v.string(),
    nickname: v.optional(v.string()),
  },
  handler: async (ctx, { room, text, nickname }) => {
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk) throw new Error('No live talk.');

    const cleaned = cleanText(text.trim().slice(0, MAX_TEXT_LEN));
    if (!cleaned.text) throw new Error('Type a question before submitting.');

    const rawNickname = nickname?.trim().slice(0, MAX_NICKNAME_LEN);
    const cleanedNickname = rawNickname ? cleanText(rawNickname) : undefined;
    await ctx.db.insert('questions', {
      room,
      text: cleaned.text,
      nickname: cleanedNickname?.text,
      votes: 0,
      answered: false,
      // Auto-hide anything the profanity filter flagged; the presenter sees it
      // in the moderation feed and can restore it, but the audience never does.
      hidden: cleaned.flagged || (cleanedNickname?.flagged ?? false),
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/**
 * Public: the audience-visible queue (non-rejected), ordered by priority, plus a
 * `blocked` count of presenter-rejected questions (content withheld, count only).
 */
export const list = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const rows = await ctx.db
      .query('questions')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .collect();
    const visible = rows.filter((r) => !r.hidden);
    return {
      blocked: rows.length - visible.length,
      questions: visible
        .sort(byPriority)
        .map(({ _id, text, nickname, votes, answered }) => ({
          _id,
          text,
          nickname,
          votes,
          answered,
        })),
    };
  },
});

/**
 * Audience: upvote a question to push it up the queue. Gated on a live talk
 * owning the question's room, matching `ask`, and de-duplicated per machine so a
 * single browser can upvote a given question at most once. Returns whether the
 * vote actually counted so the client only disables the button on a real success
 * (a no-op — hidden question, no live talk, or already voted — leaves it live).
 */
export const upvote = mutation({
  args: { id: v.id('questions'), machineId: v.string() },
  handler: async (ctx, { id, machineId }) => {
    const q = await ctx.db.get(id);
    if (!q || q.hidden) return false;
    const talk = await liveTalkForRoom(ctx, q.room);
    if (!talk) return false;

    const already = await ctx.db
      .query('questionVotes')
      .withIndex('by_question_machine', (row) =>
        row.eq('questionId', id).eq('machineId', machineId),
      )
      .unique();
    if (already) return false;

    await ctx.db.insert('questionVotes', { questionId: id, machineId });
    await ctx.db.patch(id, { votes: q.votes + 1 });
    return true;
  },
});

/** Presenter: the full moderation feed (includes hidden/answered), by priority. */
export const feed = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    if (!(await isAdminUser(ctx))) return { authorized: false as const };
    const rows = await ctx.db
      .query('questions')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .collect();
    return { authorized: true as const, questions: rows.sort(byPriority) };
  },
});

export const setAnswered = mutation({
  args: { id: v.id('questions'), answered: v.boolean() },
  handler: async (ctx, { id, answered }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { answered });
  },
});

export const setHidden = mutation({
  args: { id: v.id('questions'), hidden: v.boolean() },
  handler: async (ctx, { id, hidden }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { hidden });
  },
});
