import { getAuthUserId } from '@convex-dev/auth/server';
import type { QueryCtx } from '../_generated/server';

// Comma-separated allowlist of GitHub logins permitted to run talks, set on the
// deployment (e.g. ADMIN_GITHUB_LOGINS="rtkelly13").
const ADMIN_GITHUB_LOGINS = (process.env.ADMIN_GITHUB_LOGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** True if the signed-in user's GitHub login is on the admin allowlist. */
export async function isAdminUser(ctx: QueryCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  return Boolean(
    user &&
      'githubLogin' in user &&
      typeof user.githubLogin === 'string' &&
      ADMIN_GITHUB_LOGINS.includes(user.githubLogin),
  );
}

/**
 * Presenter/admin actions require a signed-in GitHub user on the allowlist. This
 * is the real security boundary — audience functions are public, so identity is
 * enforced here in the mutations, not just in the UI.
 */
export async function requireAdmin(ctx: QueryCtx): Promise<void> {
  if (!(await isAdminUser(ctx))) {
    throw new Error('Unauthorized: sign in with an allowed GitHub account.');
  }
}
