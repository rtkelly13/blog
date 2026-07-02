import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { isAdminUser, requireAdmin } from './lib/admin';
import { cleanSteps, cleanText } from './lib/profanity';
import { enforceRateLimit } from './lib/rateLimit';
import { liveTalkForRoom, resolveConfig } from './talks';

const MAX_STEPS = 12;
const MAX_STEP_LEN = 140;
const MAX_NICKNAME_LEN = 24;
const MAX_OPTIONS = 12;
const MAX_PROMPT_LEN = 200;

/**
 * The generalized "put the actions in order" activity (toast is one instance).
 * The presenter opens an activity with a prompt and a hidden set of canonical
 * options; the audience submits their own ordered steps; after `revealDelayMs`
 * a scheduled function flips `revealed` so everyone sees the canonical options.
 */
export const open = mutation({
  args: {
    room: v.string(),
    prompt: v.string(),
    options: v.array(v.string()),
    revealDelayMs: v.optional(v.number()),
  },
  handler: async (ctx, { room, prompt, options, revealDelayMs }) => {
    await requireAdmin(ctx);
    // Only for a live talk with the activities feature enabled.
    const talk = await liveTalkForRoom(ctx, room);
    if (!talk || !resolveConfig(talk).activities) {
      throw new Error('The activities feature is disabled for this session.');
    }

    // Close any activity already open in this room — one at a time.
    const existing = await ctx.db
      .query('activities')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .collect();
    await Promise.all(
      existing
        .filter((a) => a.status === 'open')
        .map((a) => ctx.db.patch(a._id, { status: 'closed' as const })),
    );

    const cleanPrompt = cleanText(prompt.trim().slice(0, MAX_PROMPT_LEN)).text;
    const cleanOptions = options
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, MAX_OPTIONS)
      .map((o) => cleanText(o.slice(0, MAX_STEP_LEN)).text);

    const delay = Math.max(0, Math.floor(revealDelayMs ?? 60_000));
    const now = Date.now();
    const id = await ctx.db.insert('activities', {
      room,
      prompt: cleanPrompt,
      options: cleanOptions,
      revealAt: delay > 0 ? now + delay : now,
      revealed: delay === 0,
      status: 'open',
      createdAt: now,
    });

    if (delay > 0) {
      await ctx.scheduler.runAfter(delay, internal.activities.reveal, { id });
    }
    return { ok: true };
  },
});

/** Scheduled at `revealAt`. Flips the canonical options into view for everyone. */
export const reveal = internalMutation({
  args: { id: v.id('activities') },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc || doc.revealed) return;
    await ctx.db.patch(id, { revealed: true });
  },
});

/** Presenter: reveal the canonical options now, without waiting for the timer. */
export const revealNow = mutation({
  args: { id: v.id('activities') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { revealed: true, revealAt: Date.now() });
  },
});

export const close = mutation({
  args: { id: v.id('activities') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status: 'closed' });
  },
});

/**
 * Public: the currently-open activity for a room, plus its submissions. Canonical
 * `options` are withheld until `revealed` so the audience can't peek at the
 * answer before the reveal.
 */
export const active = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    // The open row (if any) is always the newest: open() closes prior open
    // activities before inserting, so reading only the latest row avoids
    // collecting the room's entire activity history on every reactive poll.
    const activity = await ctx.db
      .query('activities')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .order('desc')
      .first();
    if (!activity || activity.status !== 'open') return null;

    const submissions = await ctx.db
      .query('activitySubmissions')
      .withIndex('by_activity_created', (q) => q.eq('activityId', activity._id))
      .order('desc')
      .collect();

    const visible = submissions.filter((s) => !s.hidden);
    return {
      _id: activity._id,
      prompt: activity.prompt,
      revealAt: activity.revealAt,
      revealed: activity.revealed,
      // Whether a canonical answer exists at all — exposed pre-reveal (without
      // the answer itself) so the audience only shows a countdown/reveal for
      // activities that actually have one. Answer-less activities are valid
      // (collect-only), and must not show a "reveal" that never happens.
      hasAnswer: activity.options.length > 0,
      options: activity.revealed ? activity.options : [],
      submissionCount: submissions.length,
      wall: visible.map(({ _id, nickname, steps }) => ({
        _id,
        nickname,
        steps,
      })),
    };
  },
});

/** Presenter: full submission feed for the open activity, incl. rejected rows. */
export const feed = query({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    if (!(await isAdminUser(ctx))) return { authorized: false as const };
    // Newest row is the only possibly-open one (see `active`).
    const activity = await ctx.db
      .query('activities')
      .withIndex('by_room_created', (q) => q.eq('room', room))
      .order('desc')
      .first();
    if (!activity || activity.status !== 'open') {
      return { authorized: true as const, activity: null };
    }

    const submissions = await ctx.db
      .query('activitySubmissions')
      .withIndex('by_activity_created', (q) => q.eq('activityId', activity._id))
      .order('desc')
      .collect();
    return {
      authorized: true as const,
      activity: {
        _id: activity._id,
        prompt: activity.prompt,
        options: activity.options,
        revealed: activity.revealed,
        revealAt: activity.revealAt,
      },
      submissions,
    };
  },
});

/**
 * Audience: submit an ordered list of actions for the open activity.
 * Rate-limited per machine (structured refusal, so the UI can say when to retry).
 */
export const submit = mutation({
  args: {
    activityId: v.id('activities'),
    nickname: v.optional(v.string()),
    steps: v.array(v.string()),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.status !== 'open') {
      throw new Error('This activity is closed.');
    }
    // Gate on the live talk owning this room (mirrors reactions/questions).
    const talk = await liveTalkForRoom(ctx, activity.room);
    if (!talk) throw new Error('No live talk.');
    // Activities disabled for this session: drop the write (visibly).
    if (!resolveConfig(talk).activities) {
      return { ok: false as const, reason: 'disabled' as const };
    }

    const trimmed = args.steps
      .map((step) => step.trim())
      .filter(Boolean)
      .slice(0, MAX_STEPS)
      .map((step) => step.slice(0, MAX_STEP_LEN));
    if (trimmed.length === 0) {
      throw new Error('Add at least one step before submitting.');
    }

    const limited = await enforceRateLimit(
      ctx,
      args.machineId,
      'activity:submit',
    );
    if (limited) return limited;

    const { steps, flagged: stepsFlagged } = cleanSteps(trimmed);

    let nickname: string | undefined;
    let nicknameFlagged = false;
    const rawNickname = args.nickname?.trim().slice(0, MAX_NICKNAME_LEN);
    if (rawNickname) {
      const cleaned = cleanText(rawNickname);
      nickname = cleaned.text;
      nicknameFlagged = cleaned.flagged;
    }

    await ctx.db.insert('activitySubmissions', {
      activityId: args.activityId,
      room: activity.room,
      nickname,
      steps,
      // Content that tripped the profanity filter is auto-hidden pending
      // presenter review — the masked text still reaches the console feed so it
      // can be restored, but it never lands on the audience wall.
      hidden: stepsFlagged || nicknameFlagged,
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Presenter: pull a submission from the wall. */
export const setHidden = mutation({
  args: { id: v.id('activitySubmissions'), hidden: v.boolean() },
  handler: async (ctx, { id, hidden }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { hidden });
  },
});
