/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import type { Id } from './_generated/dataModel';
import schema from './schema';

// convex-test discovers the function modules from this glob (it can't infer
// them). Shared by every convex/*.test.ts so the map stays in one place.
export const modules = import.meta.glob('./**/*.ts');

/** A fresh in-memory backend for one test. */
export function harness() {
  return convexTest(schema, modules);
}

/**
 * Sign in as an allowlisted admin. Inserts a `users` row carrying the
 * `githubLogin` the test env allowlists (ADMIN_GITHUB_LOGINS=rtkelly13, set in
 * vitest.config.ts) and returns a client scoped to that identity — the subject
 * is `<userId>|<session>`, the shape `getAuthUserId` decodes (see lib/admin.ts).
 */
export async function asAdmin(t: ReturnType<typeof harness>) {
  const userId = await t.run((ctx) =>
    ctx.db.insert('users', { githubLogin: 'rtkelly13' }),
  );
  return t.withIdentity({ subject: `${userId}|session` });
}

/** Sign in as an authenticated but NON-allowlisted user (proves the allowlist,
 * not mere authentication, is the gate). */
export async function asNonAdmin(t: ReturnType<typeof harness>) {
  const userId = await t.run((ctx) =>
    ctx.db.insert('users', { githubLogin: 'someone-else' }),
  );
  return t.withIdentity({ subject: `${userId}|session` });
}

/** Insert an ended session (a `talks` row) and return its id (= the room). */
export async function seedEndedSession(
  t: ReturnType<typeof harness>,
  slug = 'test-deck',
): Promise<Id<'talks'>> {
  return t.run((ctx) =>
    ctx.db.insert('talks', {
      slug,
      title: 'Test',
      status: 'ended',
      startedAt: 1,
      endedAt: 2,
    }),
  );
}
