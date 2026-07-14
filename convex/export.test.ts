/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { asAdmin, asNonAdmin, harness } from './test.helpers';

/**
 * The session export is the archive-before-purge escape hatch (F4): it returns
 * the raw documents — including presenter-only pre-mask originals — so it must
 * be admin-gated, and it must actually gather every table's rows for the room.
 */

async function seedSession(
  t: ReturnType<typeof harness>,
): Promise<Id<'talks'>> {
  const room = (await t.run((ctx) =>
    ctx.db.insert('talks', {
      slug: 'export-deck',
      title: 'Export',
      status: 'ended',
      startedAt: 1,
      endedAt: 2,
    }),
  )) as Id<'talks'>;
  await t.run(async (ctx) => {
    await ctx.db.insert('attendees', { room, machineId: 'm', firstSeen: 1 });
    await ctx.db.insert('reactionTotals', { room, emoji: '🔥', total: 4 });
    const questionId = await ctx.db.insert('questions', {
      room,
      text: 'q',
      votes: 2,
      answered: false,
      hidden: false,
      createdAt: 1,
    });
    await ctx.db.insert('questionVotes', { questionId, machineId: 'm' });
    const pollId = await ctx.db.insert('polls', {
      room,
      prompt: 'p',
      status: 'closed',
      createdAt: 1,
    });
    await ctx.db.insert('pollWords', { pollId, word: 'w', count: 3 });
    await ctx.db.insert('pollSubmitters', { pollId, machineId: 'm', count: 1 });
    const activityId = await ctx.db.insert('activities', {
      room,
      prompt: 'a',
      options: ['x'],
      revealAt: null,
      revealed: true,
      status: 'closed',
      createdAt: 1,
    });
    await ctx.db.insert('activitySubmissions', {
      activityId,
      room,
      steps: ['s'],
      hidden: false,
      createdAt: 1,
    });
  });
  return room;
}

describe('sessions.exportSession', () => {
  test('refuses a non-admin (no data leaks)', async () => {
    const t = harness();
    const room = await seedSession(t);
    expect(await t.query(api.sessions.exportSession, { room })).toMatchObject({
      authorized: false,
    });
    const nonAdmin = await asNonAdmin(t);
    expect(
      await nonAdmin.query(api.sessions.exportSession, { room }),
    ).toMatchObject({ authorized: false });
  });

  test('admin gets the session row plus every table populated', async () => {
    const t = harness();
    const room = await seedSession(t);
    const admin = await asAdmin(t);
    const res = await admin.query(api.sessions.exportSession, { room });

    expect(res.authorized).toBe(true);
    if (!res.authorized || !res.session) throw new Error('expected a bundle');
    expect(res.session.slug).toBe('export-deck');
    expect(res.data.attendees).toHaveLength(1);
    expect(res.data.reactionTotals).toHaveLength(1);
    expect(res.data.questions).toHaveLength(1);
    expect(res.data.questionVotes).toHaveLength(1);
    expect(res.data.polls).toHaveLength(1);
    expect(res.data.pollWords).toHaveLength(1);
    expect(res.data.pollSubmitters).toHaveLength(1);
    expect(res.data.activities).toHaveLength(1);
    expect(res.data.activitySubmissions).toHaveLength(1);
  });

  test('a second session is not mixed into the export', async () => {
    const t = harness();
    const room = await seedSession(t);
    await seedSession(t); // a second, unrelated session
    const admin = await asAdmin(t);
    const res = await admin.query(api.sessions.exportSession, { room });
    if (!res.authorized || !res.session) throw new Error('expected a bundle');
    // Only the target room's single row per table — not the other session's.
    expect(res.data.attendees).toHaveLength(1);
    expect(res.data.questionVotes).toHaveLength(1);
    expect(res.data.pollWords).toHaveLength(1);
  });

  test('returns session: null for an unknown room', async () => {
    const t = harness();
    const admin = await asAdmin(t);
    const ghost = (await t.run((ctx) =>
      ctx.db.insert('talks', {
        slug: 'ghost',
        title: 'G',
        status: 'ended',
        startedAt: 1,
      }),
    )) as Id<'talks'>;
    await t.run((ctx) => ctx.db.delete(ghost));
    const res = await admin.query(api.sessions.exportSession, { room: ghost });
    expect(res).toMatchObject({ authorized: true, session: null });
  });
});
