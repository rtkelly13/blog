import GitHub from '@auth/core/providers/github';
import { convexAuth } from '@convex-dev/auth/server';

/**
 * GitHub-only auth for the presenter/admin surfaces. The `profile` mapping keeps
 * the GitHub `login` on the user row (see the custom `users` table in schema.ts)
 * so mutations can allowlist by username against ADMIN_GITHUB_LOGINS. Requires
 * AUTH_GITHUB_ID / AUTH_GITHUB_SECRET env vars on the deployment.
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
  ],
});
