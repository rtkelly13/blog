import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import type { ReactNode } from 'react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

// E2E bypass sign-in is offered only when the build opts in — and never on the
// test-github branch, whose whole point is exercising the real OAuth flow.
// (Hard-coded, not configurable: matching the server-side guard philosophy in
// convex/auth.ts.) The secret is public to this bundle by design: it only
// exists on dev/CI deployments, where the bypass provider is enabled anyway.
const E2E_BYPASS_AVAILABLE =
  process.env.NEXT_PUBLIC_E2E_BYPASS === '1' &&
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF !== 'test-github';

function SignIn() {
  const { signIn } = useAuthActions();
  // Return to the page the sign-in was launched from (default is SITE_URL = "/").
  const redirectTo =
    typeof window !== 'undefined' ? window.location.pathname : '/admin';
  return (
    <div className="border-2 border-white bg-zinc-900 p-6 font-mono">
      <p className="text-sm text-zinc-300">
        Admin controls are restricted. Sign in with the allowed GitHub account.
      </p>
      <button
        type="button"
        onClick={() => void signIn('github', { redirectTo })}
        className="mt-4 border-2 border-white bg-brutalist-cyan px-5 py-2 font-bold uppercase text-black shadow-hard-md"
      >
        Sign in with GitHub
      </button>
      {E2E_BYPASS_AVAILABLE && (
        <button
          type="button"
          data-testid="e2e-signin"
          onClick={() =>
            void signIn('e2e', {
              secret: process.env.NEXT_PUBLIC_E2E_BYPASS_SECRET ?? '',
            })
          }
          className="ml-3 mt-4 border-2 border-brutalist-yellow px-5 py-2 font-bold uppercase text-brutalist-yellow"
        >
          E2E dev sign-in
        </button>
      )}
    </div>
  );
}

function NotAllowed() {
  const { signOut } = useAuthActions();
  return (
    <div className="border-2 border-brutalist-pink bg-zinc-900 p-6 font-mono">
      <p className="text-sm text-brutalist-pink">
        Signed in, but this GitHub account isn't on the admin allowlist.
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 border-2 border-white bg-black px-4 py-2 text-sm font-bold uppercase text-white"
      >
        Sign out
      </button>
    </div>
  );
}

function Gated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.talks.isAdmin);

  if (isLoading) return <p className="font-mono text-zinc-400">Connecting…</p>;
  if (!isAuthenticated) return <SignIn />;
  if (isAdmin === undefined) {
    return <p className="font-mono text-zinc-400">Checking access…</p>;
  }
  if (!isAdmin) return <NotAllowed />;
  return <>{children}</>;
}

/**
 * Renders `children` only for a signed-in, allowlisted GitHub admin; otherwise
 * shows the sign-in / not-allowed states. Self-guards when Convex is unconfigured.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  if (!isConvexConfigured) {
    return (
      <p className="font-mono text-brutalist-pink">Convex not configured.</p>
    );
  }
  return <Gated>{children}</Gated>;
}
