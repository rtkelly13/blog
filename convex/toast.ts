import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
  internalMutation,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { cleanSteps, cleanText } from './lib/profanity';

const MAX_STEPS = 12;
const MAX_STEP_LEN = 140;
const MAX_NICKNAME_LEN = 24;
const REVEAL_DELAY_MS = 5000;

/**
 * The audience wall only shows submissions once they've cleared a 5-second
 * buffer, giving the presenter a window to pull anything inappropriate before
 * the room sees it. The moderation screen sees everything instantly.
 */
export const submit = mutation({
  args: {
    talkSlug: v.string(),
    nickname: v.optional(v.string()),
    steps: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.steps
      .map((step) => step.trim())
      .filter(Boolean)
      .slice(0, MAX_STEPS)
      .map((step) => step.slice(0, MAX_STEP_LEN));

    if (trimmed.length === 0) {
      throw new Error('Add at least one step before submitting.');
    }

    const { steps, flagged: stepsFlagged } = cleanSteps(trimmed);

    let nickname: string | undefined;
    let flagged = stepsFlagged;
    const rawNickname = args.nickname?.trim().slice(0, MAX_NICKNAME_LEN);
    if (rawNickname) {
      const cleaned = cleanText(rawNickname);
      nickname = cleaned.text;
      flagged = flagged || cleaned.flagged;
    }

    const id = await ctx.db.insert('toastSubmissions', {
      talkSlug: args.talkSlug,
      nickname,
      steps,
      flagged,
      revealed: false,
      hidden: false,
      createdAt: Date.now(),
    });

    // Flip onto the audience wall after the buffer (skipped if hidden by then).
    await ctx.scheduler.runAfter(REVEAL_DELAY_MS, internal.toast.reveal, {
      id,
    });

    return { ok: true };
  },
});

/** Scheduled ~5s after submit. Reveals to the wall unless already pulled. */
export const reveal = internalMutation({
  args: { id: v.id('toastSubmissions') },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc || doc.hidden) return;
    await ctx.db.patch(id, { revealed: true });
  },
});

/** Public, read-only: revealed + not-hidden submissions for the projected wall. */
export const wall = query({
  args: { talkSlug: v.string() },
  handler: async (ctx, { talkSlug }) => {
    const rows = await ctx.db
      .query('toastSubmissions')
      .withIndex('by_slug_created', (q) => q.eq('talkSlug', talkSlug))
      .collect();
    return rows
      .filter((row) => row.revealed && !row.hidden)
      .map(({ _id, nickname, steps }) => ({ _id, nickname, steps }));
  },
});

// Moderation is gated by a shared secret stored in the Convex environment
// (`npx convex env set MODERATION_KEY ...`). The `?key=` in the manage URL is
// only transport; the comparison happens here, server-side.
function keyMatches(key: string): boolean {
  const expected = process.env.MODERATION_KEY;
  return Boolean(expected) && key === expected;
}

async function requireKey(_ctx: QueryCtx, key: string): Promise<void> {
  if (!keyMatches(key))
    throw new Error('Unauthorized: invalid moderation key.');
}

/**
 * Moderation feed: every submission for the talk, newest first, including
 * not-yet-revealed, flagged and hidden rows. Returns an `authorized` flag
 * instead of throwing so the manage screen can show a friendly message on a
 * bad key rather than crashing into an error boundary.
 */
export const feed = query({
  args: { talkSlug: v.string(), key: v.string() },
  handler: async (ctx, { talkSlug, key }) => {
    if (!keyMatches(key)) {
      return { authorized: false as const, submissions: [] };
    }
    const submissions = await ctx.db
      .query('toastSubmissions')
      .withIndex('by_slug_created', (q) => q.eq('talkSlug', talkSlug))
      .order('desc')
      .collect();
    return { authorized: true as const, submissions };
  },
});

export const setHidden = mutation({
  args: { id: v.id('toastSubmissions'), key: v.string(), hidden: v.boolean() },
  handler: async (ctx, { id, key, hidden }) => {
    await requireKey(ctx, key);
    await ctx.db.patch(id, { hidden });
  },
});

export const remove = mutation({
  args: { id: v.id('toastSubmissions'), key: v.string() },
  handler: async (ctx, { id, key }) => {
    await requireKey(ctx, key);
    await ctx.db.delete(id);
  },
});

export const clearAll = mutation({
  args: { talkSlug: v.string(), key: v.string() },
  handler: async (ctx, { talkSlug, key }) => {
    await requireKey(ctx, key);
    const rows = await ctx.db
      .query('toastSubmissions')
      .withIndex('by_slug_created', (q) => q.eq('talkSlug', talkSlug))
      .collect();
    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
  },
});
