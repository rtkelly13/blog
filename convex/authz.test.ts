/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { TALK_PRESETS } from './talkConfig';
import { asNonAdmin, harness } from './test.helpers';

/**
 * The security boundary (lib/admin.ts `requireAdmin`) is the ONLY thing standing
 * between an anonymous audience member and every Session-control + moderation
 * mutation. Nothing tested it before. This asserts every admin-gated public
 * mutation rejects an unauthenticated caller — and a representative subset also
 * rejects an authenticated but non-allowlisted user, proving the allowlist (not
 * mere sign-in) is the gate.
 *
 * If a new admin mutation is added without `requireAdmin`, add it here; the list
 * IS the manifest of the boundary.
 */

const config = TALK_PRESETS[0].config;

/**
 * Seed the rows the id-taking mutations need, then return every admin mutation
 * paired with valid args — so the only thing that can make the call reject is
 * `requireAdmin` (not an arg-validation or not-found error firing first).
 */
async function adminCalls(t: ReturnType<typeof harness>) {
  const room = (await t.run((ctx) =>
    ctx.db.insert('talks', {
      slug: 'authz-deck',
      title: 'Authz',
      status: 'live',
      startedAt: 1,
    }),
  )) as Id<'talks'>;
  const questionId = await t.run((ctx) =>
    ctx.db.insert('questions', {
      room,
      text: 'q',
      votes: 0,
      answered: false,
      hidden: false,
      createdAt: 1,
    }),
  );
  const pollId = await t.run((ctx) =>
    ctx.db.insert('polls', {
      room,
      prompt: 'p',
      status: 'open',
      createdAt: 1,
    }),
  );
  const wordId = await t.run((ctx) =>
    ctx.db.insert('pollWords', { pollId, word: 'w', count: 1 }),
  );
  const activityId = await t.run((ctx) =>
    ctx.db.insert('activities', {
      room,
      prompt: 'a',
      options: ['x'],
      revealAt: null,
      revealed: false,
      status: 'open',
      createdAt: 1,
    }),
  );
  const subId = await t.run((ctx) =>
    ctx.db.insert('activitySubmissions', {
      activityId,
      room,
      steps: ['s'],
      hidden: false,
      createdAt: 1,
    }),
  );

  return [
    ['talks.start', api.talks.start, { slug: 'x', title: 'X', config }],
    ['talks.updateConfig', api.talks.updateConfig, { room, config }],
    ['talks.end', api.talks.end, {}],
    ['talks.setSlide', api.talks.setSlide, { room, index: 1 }],
    ['talks.startBreak', api.talks.startBreak, { room, durationMs: 1000 }],
    ['talks.extendBreak', api.talks.extendBreak, { room, byMs: 1000 }],
    ['talks.endBreak', api.talks.endBreak, { room }],
    [
      'talks.presenterPing',
      api.talks.presenterPing,
      { room, sessionId: 'sess' },
    ],
    [
      'questions.setAnswered',
      api.questions.setAnswered,
      {
        id: questionId,
        answered: true,
      },
    ],
    [
      'questions.setHidden',
      api.questions.setHidden,
      {
        id: questionId,
        hidden: true,
      },
    ],
    ['polls.start', api.polls.start, { room, prompt: 'p' }],
    ['polls.close', api.polls.close, { id: pollId }],
    ['polls.hideWord', api.polls.hideWord, { id: wordId, hidden: true }],
    [
      'activities.open',
      api.activities.open,
      {
        room,
        prompt: 'a',
        options: ['x'],
      },
    ],
    ['activities.revealNow', api.activities.revealNow, { id: activityId }],
    [
      'activities.cancelReveal',
      api.activities.cancelReveal,
      { id: activityId },
    ],
    ['activities.close', api.activities.close, { id: activityId }],
    [
      'activities.setHidden',
      api.activities.setHidden,
      {
        id: subId,
        hidden: true,
      },
    ],
    [
      'activities.setMarked',
      api.activities.setMarked,
      {
        id: subId,
        marked: true,
      },
    ],
    ['sessions.clearDown', api.sessions.clearDown, { room }],
    ['sessions.deleteSession', api.sessions.deleteSession, { room }],
  ] as const;
}

describe('requireAdmin boundary', () => {
  test('every admin mutation rejects an unauthenticated caller', async () => {
    const t = harness();
    const calls = await adminCalls(t);
    for (const [name, fn, args] of calls) {
      await expect(
        t.mutation(fn, args as never),
        `${name} must reject anonymous callers`,
      ).rejects.toThrow(/unauthor/i);
    }
  }, 15000);

  test('admin mutations reject an authenticated non-allowlisted user', async () => {
    const t = harness();
    const calls = await adminCalls(t);
    const nonAdmin = await asNonAdmin(t);
    for (const [name, fn, args] of calls) {
      await expect(
        nonAdmin.mutation(fn, args as never),
        `${name} must reject non-allowlisted users`,
      ).rejects.toThrow(/unauthor/i);
    }
  });

  test('admin-only feed queries refuse a non-admin (return unauthorized, not data)', async () => {
    const t = harness();
    const room = await t.run((ctx) =>
      ctx.db.insert('talks', {
        slug: 'feed-deck',
        title: 'Feed',
        status: 'live',
        startedAt: 1,
      }),
    );
    // Anonymous
    expect(await t.query(api.questions.feed, { room })).toMatchObject({
      authorized: false,
    });
    expect(await t.query(api.sessions.list, {})).toMatchObject({
      authorized: false,
    });
    // Authenticated but not allowlisted
    const nonAdmin = await asNonAdmin(t);
    expect(await nonAdmin.query(api.activities.feed, { room })).toMatchObject({
      authorized: false,
    });
  });
});
