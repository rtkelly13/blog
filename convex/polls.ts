import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';
import { cleanText } from './lib/profanity';
import { liveTalkForRoom } from './talks';

const MAX_PROMPT_LEN = 160;
const MAX_WORD_LEN = 32;

/** Normalize a free-text answer into a single lowercase word for tallying. */
function normalizeWord(raw: string): string {
  return cleanText(
    raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_WORD_LEN),
  ).text;
}

/** Presenter: open a poll prompt (closes any other open poll in the room). */
export const start = mutation({
  args: { room: v.string(), prompt: v.string() },
  handler: async (ctx, { room, prompt }) => {
    await requireAdmin(ctx);
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
    const rows = await ctx.db
      .query('polls')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .order('desc')
      .collect();
    const poll = rows.find((p) => p.status === 'open');
    if (!poll) return null;

    const words = await ctx.db
      .query('pollWords')
      .withIndex('by_poll', (q) => q.eq('pollId', poll._id))
      .collect();

    const visible = words.filter((w) => !w.hidden);
    const total = visible.reduce((sum, w) => sum + w.count, 0);
    return {
      _id: poll._id,
      prompt: poll.prompt,
      total,
      // Blocked words are counted for the presenter's awareness but withheld.
      blocked: words.length - visible.length,
      words: visible
        .map(({ word, count }) => ({ word, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

/** Presenter: the full word tally incl. blocked words, for moderation. */
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

/** Audience: submit a one-word answer; upserts the running tally. */
export const submit = mutation({
  args: { pollId: v.id('polls'), word: v.string() },
  handler: async (ctx, { pollId, word }) => {
    const poll = await ctx.db.get(pollId);
    if (!poll || poll.status !== 'open') {
      throw new Error('This poll is closed.');
    }
    const talk = await liveTalkForRoom(ctx, poll.room);
    if (!talk) throw new Error('No live talk.');

    const normalized = normalizeWord(word);
    if (!normalized) throw new Error('Type a word before submitting.');

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
    return { ok: true };
  },
});
