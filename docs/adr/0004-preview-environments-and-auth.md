# Preview environments: Convex data branches cleanly, first-party OAuth does not

## Context

Verifying the live-talk / audience-participation features end-to-end (see
[ADR-0001](0001-audience-participation-identity-and-abuse-controls.md)) means
driving a real deployment with a browser. The obvious target is a **Vercel
preview** per PR, but a preview needs *two* things, and only one of them is easy:

1. **A backend running the branch's current code.** Convex solves this with
   [preview deployments](https://docs.convex.dev/production/hosting/preview-deployments):
   set the Vercel build command to `npx convex deploy --cmd 'pnpm build'` with a
   *Preview* deploy key, and every branch gets a fresh, isolated backend with
   `NEXT_PUBLIC_CONVEX_URL` injected automatically. This is the direct analog of
   database branching and is a solved, standard pattern.

2. **A working auth callback.** This is the rough edge. Admin/presenter actions
   are gated behind GitHub OAuth via Convex Auth, whose callback lives on the
   Convex deployment's `*.convex.site` domain. A GitHub **OAuth App allows a
   single callback URL and no wildcards**, so a *per-branch* Convex deployment
   (a new `*.convex.site` each time) can never have its callback pre-registered.
   This is not a Convex quirk — it's the well-known Vercel-preview OAuth problem
   that NextAuth, Auth0, and Better Auth all have long threads about; hosted auth
   providers (Clerk, Auth0) largely exist to paper over it.

The two halves are independent: audience-facing mutations (ask, upvote, poll
submit — the behaviours the review fixes hardened) are **public** and testable on
any current backend. Only the presenter setup (start a talk, open a poll,
moderate) needs the admin session — and that is exactly what OAuth-on-previews
makes hard.

## Decision

**Test admin-driven flows locally for now.** Local dev runs against a dev Convex
deployment (`dev:keen-shark-231`) whose `.convex.site` callback and
`localhost:3000` are stable and registered once — GitHub OAuth "just works". The
`agent-browser` CLI attaches over CDP to the signed-in dev Chrome and drives
`localhost`, so no OAuth dance per run. This is the supported path for the
end-to-end harness today.

**Do not adopt per-branch Convex preview deployments while admin auth uses raw
GitHub OAuth** — the data half would work but the auth half would silently break
(sign-in fails on the ephemeral `*.convex.site`).

When preview-environment testing becomes worth the setup, the going-forward
options, in preference order for this repo, are:

- **Preview auth bypass** — a dev-only sign-in path gated on
  `VERCEL_ENV !== 'production'`. Lowest friction for a solo, admin-only app;
  pairs cleanly with Convex per-branch preview deployments so previews become
  fully automatic. **Recommended** if/when we automate previews.
- **Stable staging deployment** — one long-lived preview backend with its own
  GitHub OAuth App and a fixed callback. Keeps real sign-in, loses per-branch
  data isolation, and needs a deploy trigger (CI on PR, or a manual command) to
  stay current.
- **Hosted auth provider (Clerk/Auth0)** — first-class preview/wildcard support;
  the only option that gives true per-branch preview *login*, at the cost of
  replacing the auth layer.

Today's Vercel Preview `NEXT_PUBLIC_CONVEX_URL` points at the shared dev
deployment, which CI does **not** deploy to (only production, via
`convex-deploy.yml`). So a preview is only as current as the last manual
`convex dev`/`deploy` to that deployment — treat previews as best-effort until
one of the options above is adopted.

## Consequences

- The e2e harness is a **local** tool (attaches to a signed-in CDP browser); it
  is not CI-ready until a non-interactive auth path (the bypass above) lands.
  See `docs/live-e2e-harness.md`.
- Choosing an approach later is a real fork: automatic-but-bypass-auth vs
  real-auth-but-manual-staging vs swap-the-auth-provider. The blocker to weigh is
  always the **OAuth callback**, not the Convex deploy.
- If per-branch previews are wired up before an auth story exists, admin flows
  will appear broken on previews even though the backend is healthy — document
  the bypass in the same change to avoid that trap.

## Addendum (2026-09-01): most branches do not need a Convex deploy at all

The slot mechanics above (`scripts/preview-slot.sh`, `convex-deploy-preview.yml`)
route **every** preview through `convex-preview`, the schema train, because every
slot shares one preview backend. That is the right default for schema work and
pure overhead for everything else — the blog is mostly MDX, CSS, and static
pages, so the common branch touches no `convex/` file and gains nothing from a
merge onto the train or from a backend deploy.

**Rule: a preview branch needs the schema train only if it changes `convex/`.**
Concretely, take the raw head — no merge, no Convex deploy — when both hold:

1. `git diff --name-only origin/main...<ref> -- convex/` is empty (the branch
   does not touch the backend), **and**
2. `origin/convex-preview` is an ancestor of `origin/main` (the train is idle and
   carries nobody else's unmerged schema).

If (1) fails the branch owns schema work: merge onto `convex-preview`, push the
train, let `convex-deploy-preview.yml` deploy, and expect the slot to be the
merge. If (2) fails, someone else's schema is live on the shared backend, so even
a frontend-only branch must be merged onto the train to stay compatible with the
functions actually deployed. `preview-slot.sh` evaluates both and says which path
it took; `--train` forces the merge path when the check is wrong.

Why this is worth writing down:

- **Cost.** The Convex deploy is the slow, stateful, secret-requiring half of a
  preview. Skipping it for a CSS change removes the whole `CONVEX_DEPLOY_KEY_PREVIEW`
  / schema-compatibility surface from the majority of previews.
- **Blast radius.** Pushing the train redeploys the backend shared by all three
  slots. A branch with no backend changes should never be able to disturb a
  slot it does not own.
- **It makes the cheap path correct.** The bare
  `git push -f origin HEAD:slot/N` aliases (documented as "wrong the moment
  `convex-preview` diverges") are in fact exactly right under conditions 1 and 2
  — which is the usual case.

This addendum changes nothing about the auth decision above: previews still have
no admin sign-in, so slots verify public/audience surfaces and static pages only.
