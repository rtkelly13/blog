# ADR-0005: E2E auth bypass + dedicated `test-github` branch for the real OAuth flow

Date: 2026-07-03
Status: accepted
Revises: [ADR-0004](0004-preview-environments-and-auth.md)

## Context

ADR-0004 established why per-branch Vercel previews can't run admin-driven
E2E: an ephemeral `*.convex.site` URL can't be pre-registered as a GitHub
OAuth callback. The consequence was that the live-e2e harness could only run
against a browser profile someone had interactively signed in — which also
blocked wiring it into CI.

## Decision

Split the two concerns:

1. **Headless auth for tests — the `e2e` bypass provider.** A
   `ConvexCredentials` provider (`convex/auth.ts`) exchanges a deployment's
   shared secret (`AUTH_E2E_BYPASS_SECRET`) for a session as a synthetic
   user. Layered guards:
   - the provider is registered only when the deployment sets the secret;
   - it is **hard-coded off for the production deployment**
     (`fiery-minnow-77`) — not configuration, a constant in the source;
   - signing in via the bypass grants nothing by itself: the synthetic
     user's login (`AUTH_E2E_BYPASS_LOGIN`, default `e2e-bypass`) must also
     be on that deployment's `ADMIN_GITHUB_LOGINS`;
   - the client button renders only when built with
     `NEXT_PUBLIC_E2E_BYPASS=1`, and **never on the `test-github` branch**
     (hard-coded check on `NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF`).

2. **Real OAuth stays testable — the long-lived `test-github` branch.** A
   branch has a *stable* Vercel URL (unlike per-PR previews), so it CAN be
   pre-registered as a GitHub OAuth callback. `test-github` is deployed with
   the bypass disabled and GitHub enabled: when the OAuth flow itself needs
   testing, that's the environment. Setup (one-time, manual):
   - dedicated Convex deployment with `SITE_URL=<test-github branch URL>`,
     `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` for a GitHub OAuth app registered
     to that URL, and **no** `AUTH_E2E_BYPASS_SECRET`;
   - Vercel branch env for `test-github`: `NEXT_PUBLIC_CONVEX_URL` pointing
     at that deployment, and no `NEXT_PUBLIC_E2E_BYPASS`.

3. **CI wiring** (`.github/workflows/live-e2e.yml`): with OAuth out of the
   test path, the harness (`E2E_BYPASS=1`) launches headless Chromium, signs
   in via the bypass button, and runs the full live-talk flow on PRs against
   a dedicated E2E Convex deployment. The job no-ops until its secrets are
   provisioned.

## Consequences

- CI can exercise the whole audience-participation flow without a
  pre-authenticated profile.
- The real sign-in path is no longer covered implicitly by every local
  harness run — it must be exercised deliberately against `test-github`
  (or production, post-deploy).
- The bypass secret in `NEXT_PUBLIC_*` is visible in dev/CI bundles by
  design; those deployments are disposable and the secret is worthless
  against production, where the provider cannot exist.
