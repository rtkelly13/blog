# Live-talk E2E harness — handoff

Branch: `test/live-e2e-harness` (branched off `feat/audience-participation`, PR #22).
Status: **working, 17/17 checks green** locally. This is a starting point for
another agent to harden and (optionally) move into CI.

## What this is

A single Node/Playwright script — `tests/live-e2e.mjs` (`pnpm test:live-e2e`) —
that drives **three parallel deck tabs (presenter, console, attendee) + an admin
tab** against the hidden `e2e-debug-deck` and exercises every audience-
participation behaviour end-to-end, then cleans up.

Covered (17 assertions):
- Talk start from `/admin`.
- Follow-the-presenter (presenter advances → attendee follows).
- Live Q&A: ask → appears for attendee + console → reject from `/admin` →
  attendee sees only a blocked count, content hidden.
- Live poll: launch from the presenter deck's `▶ Start poll` → attendee submits
  words → cloud + tally on presenter/attendee.
- Ordered-actions: launch `▶ Open activity` → attendee submits → wall.
- **Deck-native reveal**: presenter `→` reveals (slide counter unchanged), answer
  then visible to presenter + attendee.
- **Console-always split**: console shows the answer + "room sees it in Ns"
  countdown while the room's copy is still hidden.
- Cleanup: clear down the session + end the talk.

## How to run

Prereqs:
1. Dev server on `:3002` (`pnpm dev -p 3002`) — the OAuth `SITE_URL` is 3002.
2. Convex dev deployment up (`CONVEX_DEPLOYMENT=dev:keen-shark-231 npx convex dev --once`).
3. The dedicated dev Chrome profile signed in **once** (see AGENTS.md “Browser
   control”): `agent-browser --profile ~/.agent-browser-profiles/dev --headed open http://localhost:3002/admin`
   and click “Sign in with GitHub”. Leave that Chrome running.

Then: `pnpm test:live-e2e`

## How auth works here (and the open question)

The script **attaches over CDP** to the already-signed-in dedicated dev Chrome
(reads `~/.agent-browser-profiles/dev/DevToolsActivePort`, then
`chromium.connectOverCDP`). It reuses that browser's Convex-Auth session, so no
GitHub OAuth dance in the script. Trade-off: it needs that profile running +
signed in, so it is **not CI-ready as-is**.

Two ways to make it self-contained (the user raised both — pick one):
- **Fake/dev auth**: add a dev-only sign-in so `AdminGate` passes without GitHub.
  `AdminGate` needs BOTH `useConvexAuth().isAuthenticated` AND `api.talks.isAdmin`.
  So a bypass must create a *real* Convex-Auth session — e.g. a Convex Auth
  Anonymous/Password provider enabled only on dev, mapping `githubLogin` to an
  allowlisted value, plus a `DEV_ADMIN_BYPASS` env gate on the dev deployment and
  a `NEXT_PUBLIC_DEV_AUTH` client flag. Gate it hard so prod never bypasses.
- **Vercel preview**: feature-branch previews can get GitHub auth like prod, but
  need the OAuth callback + a Convex deployment wired for the preview origin.

## agent-browser vs Playwright (the "is it quicker?" question)

- `agent-browser` (the CLI) is excellent for **interactive/exploratory** checks —
  it's what was used to verify everything by hand, and it reuses the logged-in
  profile with zero setup. But it drives essentially one active page and isn't
  built for a repeatable, asserted, multi-tab suite.
- Playwright over CDP gives **parallel tabs + assertions + a pass/fail exit code**
  while reusing that same logged-in browser — which is why the script already
  runs green. So the Playwright route was *not* slower; it's done.
- If you'd rather keep it as an agent-browser script set, the flows in
  `tests/live-e2e.mjs` map 1:1 to `agent-browser open/eval/press` calls — but
  you'll re-implement parallel tabs + assertions yourself.

Recommendation: keep the Playwright script; convert it to a proper
`@playwright/test` spec (fixtures, retries, trace-on-failure) once a
non-interactive auth path (dev bypass) lands, then wire it into CI.

## Gotchas discovered (don't re-learn these)

- **Console & presenter are both broadcasters** — the console does NOT follow the
  presenter. Drive each to a slide independently. The script moves the console
  with its own keyboard nav *before* opening an activity.
- **The deck-native reveal intercept** (`ArrowRight`/`Space`) is armed on ANY
  broadcasting deck while an activity is open + unrevealed — so you can't use
  arrows to *navigate* the console/presenter during that window (use the sidebar
  Prev/Next, or navigate before opening the activity).
- **`innerText` is uppercased by `text-transform: uppercase`** — compare
  case-insensitively (the script's `expectText`/`expectMissing` do).
- **Answer words vs submission words** — assert on a token that only appears in
  the answer (`Third`) so a submission containing "first"/"second" can't false-match.
- Mixing `pnpm build` and `pnpm dev` pollutes `.next` (React `useInsertionEffect`
  null crash) — `rm -rf .next` and restart dev.

## The test deck

`data/talks/e2e-debug-deck.mdx` (draft, hidden in prod) wires up every component:
`<QuestionQueue>` (slide 2), `<LivePoll>` + `<EmojiTop5>` (slide 3),
`<OrderedActions>` with a declared prompt/options (slide 4). They render `null`
when no talk is live, so the visual-regression deck snapshot is unaffected.

## Suggested next steps

1. Land a dev-only auth bypass so the suite runs headless without a pre-signed-in
   profile.
2. Convert to `@playwright/test` (config, retries, trace, `webServer`).
3. Add a reactions assertion (attendee taps → EmojiTop5 leaderboard updates).
4. Add a concurrent-presenter clash assertion (two presenter tabs → clash badge).
5. Wire into CI as a separate (non-visual) job.
