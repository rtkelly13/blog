# Live-talk E2E harness (puppeteer)

`tests/live-e2e.mjs` drives the full audience-participation flow end-to-end
across three concurrent tabs — the **admin cockpit**, an **attendee** on `/live`,
and the **presenter deck** — against a running server, reusing an
already-signed-in Chrome so we never automate the GitHub OAuth dance.

It exercises, in one pass:

- start a fresh live **E2E Debug Deck** session (presence + reactions + follow)
- attendee joins `/live` and sees the live talk
- **Q&A**: ask a question (reaches cockpit + queue), then **reject** a spam
  question → attendee sees only a blocked count, never the text
- **Poll / word cloud**: start a poll, submit a word (reaches cockpit),
  **block** a word → attendee sees only a blocked count
- **Ordered actions**: open an activity, submit an order; the answer stays
  **hidden** until the presenter deck **reveals it via a space-press**
  (deck-native reveal), then the attendee sees the answer
- **Reactions**: attendee reacts
- **Clear down**: end the talk and wipe the session's data

## Running it

Two auth modes:

**Headless bypass (CI, or local without a signed-in profile).** With the
`e2e` bypass provider enabled on the Convex deployment (ADR-0005) and the app
built with `NEXT_PUBLIC_E2E_BYPASS=1`, the harness launches its own headless
Chromium and signs in via the bypass button — no OAuth, no profile:

```bash
E2E_BYPASS=1 BASE_URL=http://localhost:3002 pnpm test:live-e2e
```

This is what `.github/workflows/live-e2e.yml` runs on PRs. The real GitHub
sign-in flow is deliberately not covered here — exercise it against the
long-lived `test-github` branch deployment (bypass hard-disabled there) or
production.

**CDP attach (original mode).** Point it at a running server and an
already-authenticated Chrome exposed over CDP (the
[agent-browser](https://github.com/) dev profile, or any Chrome launched with
`--remote-debugging-port`):

```bash
# 1. dev server
pnpm dev -p 3002

# 2. a Chrome signed in as an allowlisted admin, exposing a CDP port
#    (agent-browser writes its port to ~/.agent-browser-profiles/dev/DevToolsActivePort)

# 3. the harness
BASE_URL=http://localhost:3002 \
CDP_URL=http://127.0.0.1:<cdp-port> \
pnpm test:live-e2e
```

Exit code `0` = every assertion passed; non-zero lists the failures. The run
leaves no residue — it clears the session down at the end.

It connects with `puppeteer.connect({ browserURL })` (via `puppeteer-core`, so
no bundled Chromium download) and reuses the browser's existing localStorage
session, so auth "just works" as long as that Chrome is signed in.

## Notes / gotchas

- **Reuses the signed-in session** — the harness never logs in. If the CDP
  browser is signed out (or its Convex session has expired), the first
  assertion fails fast with a clear message.
- **Moderation verbs**: Q&A and ordered-actions use **"reject"**; poll words use
  **"block"**. The `moderateRow()` helper finds the row by its text and clicks
  the right button.
- **CSS uppercases text**, so all text assertions are case-insensitive.
- **Fresh tabs need a beat**: `AdminGate` validates the token server-side and
  Spectacle mounts client-side, so the harness polls with generous timeouts
  rather than fixed sleeps.

## Production verification

The intended final check is to run the same scenario **against production** with
the agent-browser CLI after deploy: prod is a separate Convex deployment
(`fiery-minnow-77`) with a fresh GitHub session, so it's the authoritative
end-to-end signal. Drive the same surfaces (`/admin` cockpit, `/live`,
`/talks/<slug>/present`) and confirm the same behaviours, then clear the session
down.

Vercel **preview** environments are deliberately *not* the target for admin-driven
runs: per-branch previews can't pre-register a GitHub OAuth callback on their
ephemeral `*.convex.site`, so admin sign-in breaks even when the backend is
healthy. Local (stable `localhost` callback) and production (stable domain) are
the supported targets. See
[ADR-0004](adr/0004-preview-environments-and-auth.md) for the tradeoff and the
going-forward options.
