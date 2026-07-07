import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';
import { cleanText } from './lib/profanity';
import { enforceRateLimit } from './lib/rateLimit';
import { liveTalkForRoom, resolveConfig } from './talks';

const MAX_PROMPT_LEN = 160;
const MAX_WORD_LEN = 32;
/** Hard ceiling on the presenter-set answers-per-attendee cap. */
const MAX_ANSWERS_PER_ATTENDEE = 5;

/** Clamp the presenter-set per-attendee answer cap to an integer in 1–5. */
function clampAnswerCap(cap: number | undefined): number {
  if (cap === undefined || !Number.isFinite(cap)) return 1;
  return Math.min(MAX_ANSWERS_PER_ATTENDEE, Math.max(1, Math.floor(cap)));
}

/** Normalize a free-text answer into a single lowercase word for tallying. */
function normalizeWord(raw: string): string {
  return cleanText(
    raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_WORD_LEN),
  ).text;
}

/** Presenter: open a poll prompt (closes any other open poll in the room). */
export const start = mutation({
  args: {
    room: v.string(),
    prompt: v.string(),
    /** Answers each attendee may submit (default 1, server-clamped 1–5). */
    maxAnswersPerAttendee: v.optional(v.number()),
  },
  handler: async (ctx, { room, prompt, maxAnswersPerAttendee }) => {
    await requireAdmin(ctx);
    // Only for a live talk with the poll feature enabled.
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || !resolveConfig(talk).poll) {
      throw new Error('The poll feature is disabled for this session.');
    }
    const existing = await ctx.db
      .query('polls')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .collect();
    await Promise.all(
      existing
        .filter((p) => p.status === 'open')
        .map((p) => ctx.db.patch(p._id, { status: 'closed' as const })),
    );

    await ctx.db.insert('polls', {
      room,
      prompt: cleanText(prompt.trim().slice(0, MAX_PROMPT_LEN)).text,
      status: 'open',
      createdAt: Date.now(),
      maxAnswersPerAttendee: clampAnswerCap(maxAnswersPerAttendee),
    });
    return { ok: true };
  },
});

export const close = mutation({
  args: { id: v.id('polls') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status: 'closed' });
  },
});

/** Public: the open poll for a room plus its live word tally (desc). */
export const active = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    // Newest poll is the only possibly-open one: start() closes prior open
    // polls before inserting, so we read one row instead of the room's history.
    const poll = await ctx.db
      .query('polls')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .order('desc')
      .first();
    if (!poll || poll.status !== 'open') return null;

    const words = await ctx.db
      .query('pollWords')
      .withIndex('by_poll', (q) => q.eq('pollId', poll._id))
      .collect();

    const visible = words.filter((w) => !w.hidden);
    const total = visible.reduce((sum, w) => sum + w.count, 0);
    // Hidden words are withheld from the audience entirely — no count either
    // (the presenter sees them on the console feed).
    return {
      _id: poll._id,
      prompt: poll.prompt,
      maxAnswers: clampAnswerCap(poll.maxAnswersPerAttendee),
      total,
      words: visible
        .map(({ word, count }) => ({ word, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

/** Presenter: the full word tally incl. hidden words, for moderation. */
export const feed = query({
  args: { pollId: v.id('polls') },
  handler: async (ctx, { pollId }) => {
    if (!(await isAdminUser(ctx))) return { authorized: false as const };
    const words = await ctx.db
      .query('pollWords')
      .withIndex('by_poll', (q) => q.eq('pollId', pollId))
      .collect();
    return {
      authorized: true as const,
      words: words.sort((a, b) => b.count - a.count),
    };
  },
});

/** Presenter: block/unblock a specific word from the cloud. */
export const hideWord = mutation({
  args: { id: v.id('pollWords'), hidden: v.boolean() },
  handler: async (ctx, { id, hidden }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { hidden });
  },
});

/**
 * Audience: submit a one-word answer; upserts the running tally. Enforced
 * server-side per machine: each attendee gets `maxAnswersPerAttendee` answers
 * (default 1, presenter-set up to 5), so a single browser can't inflate the
 * cloud by resubmitting. Rate-limited per machine on top; refusals are
 * structured (never silent) so the UI can tell the attendee what happened.
 */
export const submit = mutation({
  args: { pollId: v.id('polls'), word: v.string(), machineId: v.string() },
  handler: async (ctx, { pollId, word, machineId }) => {
    const poll = await ctx.db.get(pollId);
    if (!poll || poll.status !== 'open') {
      throw new Error('This poll is closed.');
    }
    const talk = await liveTalkForRoom(ctx, poll.room);
    if (!talk) throw new Error('No live talk.');
    // Poll disabled for this session: drop the write (visibly to the client).
    if (!resolveConfig(talk).poll) {
      return { ok: false as const, reason: 'disabled' as const };
    }

    const normalized = normalizeWord(word);
    if (!normalized) throw new Error('Type a word before submitting.');

    const cap = clampAnswerCap(poll.maxAnswersPerAttendee);
    const submitter = await ctx.db
      .query('pollSubmitters')
      .withIndex('by_poll_machine', (row) =>
        row.eq('pollId', pollId).eq('machineId', machineId),
      )
      .unique();
    const used = submitter ? (submitter.count ?? 1) : 0;
    if (used >= cap) {
      return { ok: false as const, reason: 'limit_reached' as const };
    }

    const limited = await enforceRateLimit(ctx, machineId, 'poll:submit');
    if (limited) return limited;

    if (submitter) {
      await ctx.db.patch(submitter._id, { count: used + 1 });
    } else {
      await ctx.db.insert('pollSubmitters', { pollId, machineId, count: 1 });
    }

    const existing = await ctx.db
      .query('pollWords')
      .withIndex('by_poll_word', (q) =>
        q.eq('pollId', pollId).eq('word', normalized),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert('pollWords', { pollId, word: normalized, count: 1 });
    }
    return { ok: true as const, remaining: cap - used - 1 };
  },
});
