/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';
import { asAdmin, harness } from './test.helpers';

/**
 * ADR-0003: clear-down and auto-expiry must zero EVERY per-Session table, or
 * (possibly unmasked) audience text leaks past retention. That rule was a
 * comment nothing enforced. These tests enforce it two ways:
 *
 * 1. A behavioural test seeds every per-Session table for a room, clears it
 *    down, and asserts each is empty — while a second room's rows and the
 *    `talks` log row survive.
 * 2. A schema-drift guard asserts the set of tables in schema.ts exactly
 *    matches a classification kept here. Add a table and this test fails until
 *    you declare whether it's per-Session (→ must be in the purge test above)
 *    or not — so "someone added a table and forgot the purge list" can't ship
 *    silently.
 */

// Every table in the schema, classified. Keep in sync deliberately — the
// drift guard below fails if schema.ts and this disagree.
const PER_SESSION = [
  'reactions',
  'reactionTotals',
  'attendees',
  'presence',
  'presenters',
  'questions',
  'questionVotes',
  'polls',
  'pollWords',
  'pollSubmitters',
  'activities',
  'activitySubmissions',
] as const;

// Not per-Session: survive clear-down by design.
const NON_SESSION = [
  'talks', // the Session log row itself (kept — clear-down shows zeroes)
  'rateLimits', // machine-scoped, bounded (ADR-0001/0003 amendment)
  'users', // auth identity
] as const;

// @convex-dev/auth ships these; they aren't ours to classify per-Session.
const AUTH_TABLES = [
  'authAccounts',
  'authRefreshTokens',
  'authSessions',
  'authVerificationCodes',
  'authVerifiers',
  'authRateLimits',
] as const;

/** Seed one row in every per-Session table for `room`. */
async function seedRoom(t: ReturnType<typeof harness>, room: Id<'talks'>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('reactions', { room, emoji: '🔥', count: 1, at: 1 });
    await ctx.db.insert('reactionTotals', { room, emoji: '🔥', total: 1 });
    await ctx.db.insert('attendees', { room, machineId: 'm', firstSeen: 1 });
    await ctx.db.insert('presence', { room, machineId: 'm', lastSeen: 1 });
    await ctx.db.insert('presenters', { room, sessionId: 's', lastSeen: 1 });
    const questionId = await ctx.db.insert('questions', {
      room,
      text: 'q',
      votes: 1,
      answered: false,
      hidden: false,
      createdAt: 1,
    });
    await ctx.db.insert('questionVotes', { questionId, machineId: 'm' });
    const pollId = await ctx.db.insert('polls', {
      room,
      prompt: 'p',
      status: 'open',
      createdAt: 1,
    });
    await ctx.db.insert('pollWords', { pollId, word: 'w', count: 1 });
    await ctx.db.insert('pollSubmitters', { pollId, machineId: 'm', count: 1 });
    const activityId = await ctx.db.insert('activities', {
      room,
      prompt: 'a',
      options: ['x'],
      revealAt: null,
      revealed: false,
      status: 'open',
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
}

/**
 * Count per-Session rows belonging to `room`. Room-scoped tables carry `room`
 * directly; the three child tables (questionVotes, pollWords, pollSubmitters)
 * are attributed via their parent's room, so a second room's surviving children
 * aren't miscounted against this one. A child whose parent is gone is counted as
 * an orphan (a leak) so purge bugs surface rather than hide.
 */
async function perSessionRowCount(
  t: ReturnType<typeof harness>,
  room: Id<'talks'>,
): Promise<number> {
  return t.run(async (ctx) => {
    let n = 0;
    for (const table of PER_SESSION) {
      for (const r of await ctx.db.query(table).collect()) {
        if ('room' in r) {
          if (r.room === room) n++;
          continue;
        }
        // Child row: resolve room via parent (orphan → count as this room's).
        let parentRoom: string | undefined;
        if ('questionId' in r) {
          parentRoom = (await ctx.db.get(r.questionId))?.room;
        } else if ('pollId' in r) {
          parentRoom = (await ctx.db.get(r.pollId))?.room;
        }
        if (parentRoom === undefined || parentRoom === room) n++;
      }
    }
    return n;
  });
}

describe('ADR-0003 purge completeness', () => {
  test('clearDown zeroes every per-Session table but keeps the talks row', async () => {
    const t = harness();
    const admin = await asAdmin(t);
    const room = (await t.run((ctx) =>
      ctx.db.insert('talks', {
        slug: 'purge-deck',
        title: 'Purge',
        status: 'ended',
        startedAt: 1,
        endedAt: 2,
      }),
    )) as Id<'talks'>;
    await seedRoom(t, room);

    expect(await perSessionRowCount(t, room)).toBeGreaterThanOrEqual(
      PER_SESSION.length,
    );

    await admin.mutation(api.sessions.clearDown, { room });

    expect(await perSessionRowCount(t, room)).toBe(0);
    // The Session log row survives (clear-down shows zeroes, not a deletion).
    expect(await t.run((ctx) => ctx.db.get(room))).not.toBeNull();
  });

  test('clearDown of one room leaves another room untouched', async () => {
    const t = harness();
    const admin = await asAdmin(t);
    const [roomA, roomB] = (await t.run(async (ctx) => [
      await ctx.db.insert('talks', {
        slug: 'a',
        title: 'A',
        status: 'ended',
        startedAt: 1,
        endedAt: 2,
      }),
      await ctx.db.insert('talks', {
        slug: 'b',
        title: 'B',
        status: 'ended',
        startedAt: 1,
        endedAt: 2,
      }),
    ])) as [Id<'talks'>, Id<'talks'>];
    await seedRoom(t, roomA);
    await seedRoom(t, roomB);

    await admin.mutation(api.sessions.clearDown, { room: roomA });

    expect(await perSessionRowCount(t, roomA)).toBe(0);
    expect(await perSessionRowCount(t, roomB)).toBeGreaterThanOrEqual(
      PER_SESSION.length,
    );
  });

  test('deleteSession purges data AND removes the talks row', async () => {
    const t = harness();
    const admin = await asAdmin(t);
    const room = (await t.run((ctx) =>
      ctx.db.insert('talks', {
        slug: 'del',
        title: 'Del',
        status: 'ended',
        startedAt: 1,
        endedAt: 2,
      }),
    )) as Id<'talks'>;
    await seedRoom(t, room);

    await admin.mutation(api.sessions.deleteSession, { room });

    expect(await perSessionRowCount(t, room)).toBe(0);
    expect(await t.run((ctx) => ctx.db.get(room))).toBeNull();
  });

  test('rateLimits are machine-scoped and survive clear-down (ADR-0003 amendment)', async () => {
    const t = harness();
    const admin = await asAdmin(t);
    const room = (await t.run((ctx) =>
      ctx.db.insert('talks', {
        slug: 'rl',
        title: 'RL',
        status: 'ended',
        startedAt: 1,
        endedAt: 2,
      }),
    )) as Id<'talks'>;
    await t.run((ctx) =>
      ctx.db.insert('rateLimits', {
        machineId: 'm',
        kind: 'question:ask',
        windowStart: 1,
        count: 3,
      }),
    );

    await admin.mutation(api.sessions.clearDown, { room });

    const rl = await t.run((ctx) => ctx.db.query('rateLimits').collect());
    expect(rl).toHaveLength(1);
  });

  test('schema drift guard — every table is classified (add a table → decide its purge fate)', () => {
    const declared = new Set<string>([
      ...PER_SESSION,
      ...NON_SESSION,
      ...AUTH_TABLES,
    ]);
    const actual = Object.keys(schema.tables);
    const unclassified = actual.filter((tbl) => !declared.has(tbl));
    const stale = [...declared].filter((tbl) => !actual.includes(tbl));

    expect(
      unclassified,
      'New table(s) in schema.ts — classify each as PER_SESSION (and add it to seedRoom + the purge list in convex/sessions.ts) or NON_SESSION',
    ).toEqual([]);
    expect(
      stale,
      'Table(s) removed from schema.ts — drop them from this classification',
    ).toEqual([]);
  });
});
