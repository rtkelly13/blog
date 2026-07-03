import GitHub from '@auth/core/providers/github';
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import {
  convexAuth,
  createAccount,
  retrieveAccount,
} from '@convex-dev/auth/server';

/**
 * The production deployment, hard-coded. The E2E bypass provider below must
 * never exist there, even if someone sets the env var by mistake — this guard
 * is deliberately not configuration.
 */
const PROD_DEPLOYMENT = 'fiery-minnow-77';

/**
 * The E2E bypass is available only when the deployment opts in by setting
 * AUTH_E2E_BYPASS_SECRET — and never on production (see PROD_DEPLOYMENT).
 * The test-github branch deployment tests the real OAuth flow, so it simply
 * never sets the secret (and its client build hides the button — see
 * AdminGate). Signing in via the bypass does NOT grant admin by itself: the
 * synthetic user's login must also be on ADMIN_GITHUB_LOGINS, per deployment.
 */
function e2eBypassEnabled(): boolean {
  if (!process.env.AUTH_E2E_BYPASS_SECRET) return false;
  if ((process.env.CONVEX_CLOUD_URL ?? '').includes(PROD_DEPLOYMENT)) {
    return false;
  }
  return true;
}

/**
 * Credentials provider for headless E2E runs: exchanges the deployment's
 * shared secret for a session as a synthetic user. No OAuth hop, so the
 * live-e2e harness (and CI) can sign in without a pre-authenticated browser
 * profile. See docs/adr/0005-e2e-auth-bypass-and-test-github-branch.md.
 */
const e2eBypass = ConvexCredentials({
  id: 'e2e',
  authorize: async (credentials, ctx) => {
    const expected = process.env.AUTH_E2E_BYPASS_SECRET;
    if (!e2eBypassEnabled() || !expected) return null;
    if (
      typeof credentials.secret !== 'string' ||
      credentials.secret !== expected
    ) {
      return null;
    }

    const login = process.env.AUTH_E2E_BYPASS_LOGIN ?? 'e2e-bypass';
    // retrieveAccount throws (InvalidAccountId) when the account doesn't
    // exist yet — treat that as "create it".
    const existing = await retrieveAccount(ctx, {
      provider: 'e2e',
      account: { id: login },
    }).catch(() => null);
    if (existing) return { userId: existing.user._id };

    const created = await createAccount(ctx, {
      provider: 'e2e',
      account: { id: login },
      profile: {
        name: 'E2E Bypass',
        githubLogin: login,
      },
    });
    return { userId: created.user._id };
  },
});

/**
 * GitHub-only auth for the presenter/admin surfaces. The `profile` mapping keeps
 * the GitHub `login` on the user row (see the custom `users` table in schema.ts)
 * so mutations can allowlist by username against ADMIN_GITHUB_LOGINS. Requires
 * AUTH_GITHUB_ID / AUTH_GITHUB_SECRET env vars on the deployment.
 *
 * Dev/CI deployments may additionally opt into the `e2e` bypass provider above.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      profile(githubProfile) {
        return {
          id: String(githubProfile.id),
          name: githubProfile.name ?? githubProfile.login,
          email: githubProfile.email ?? undefined,
          image: githubProfile.avatar_url,
          githubLogin: githubProfile.login,
        };
      },
    }),
    ...(e2eBypassEnabled() ? [e2eBypass] : []),
  ],
});
