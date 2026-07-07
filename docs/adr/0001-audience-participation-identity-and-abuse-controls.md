# Audience participation is machineId-identified, config-gated, and rate-limited best-effort

## Context

Audience participation (Q&A, polls/word-cloud, ordered-actions, upvotes) is
deliberately zero-friction: no login, no room code. Every participation write is
a public, unauthenticated Convex mutation. For a physically-present workshop room
(often teenagers) this is the right UX, but it leaves shared aggregates —
question upvote counts, the word cloud — trivially skewable by a held button or a
second tab, on top of the profanity concern already handled by the mask.

## Decision

Participation is controlled at three layers, keyed on the audience's `machineId`
— the random localStorage UUID already used for presence. Each *feature* is
enabled/disabled **per Session at start time** (extending `talkConfig`), but the
numeric limits themselves are **baked constants**, not presenter-facing knobs —
the presenter is mid-setup in front of a room and can't intuit "tokens per
window." A limit graduates to a real config field only once a live run proves a
default wrong.

1. **Client-side debounce / grey-out** — always on. Collapses rapid taps and
   disables an already-used control (e.g. an upvoted question). UX only.
2. **Server-side dedup** — a hand-rolled ledger table keyed `(target, machineId)`
   enforces idempotent actions (one upvote per machine per question; optionally
   one word per poll per machine). `ask` and activity `submit` stay unbounded
   (multiple entries from one person are legitimate; the presenter moderates).
3. **Server-side rate limiting** — via the official **`@convex-dev/rate-limiter`**
   component. This PR introduces the Convex *components* system to the repo
   (`convex/convex.config.ts` + `app.use`); we accept a hand-rolled limiter would
   duplicate, and subtly mis-handle, what the component already solves.
   *(Superseded — see Amendment below.)*

The per-feature enable pattern is extended to the new features too: `qa`, `poll`,
and `activities` become `talkConfig` toggles whose writes are dropped server-side
when disabled, matching the existing `presence`/`reactions`/`follow` contract.

## Consequences

- Every participation mutation (`upvote`, `ask`, poll/activity `submit`) now
  takes `machineId`; previously none did — only presence/attendees carried it.
- **This is best-effort, not a security boundary.** `machineId` is a resettable
  localStorage value; a determined user clears it or opens tabs. The real trust
  boundary remains the presenter's allowlisted-admin moderation controls
  (Hide). Do not treat these limits as anti-fraud.

## Amendment (2026-07-07): layer 3 shipped hand-rolled, not the component

What shipped is a hand-rolled fixed-window limiter (`convex/lib/rateLimit.ts` +
the `rateLimits` table), not `@convex-dev/rate-limiter`; the components system
(`convex.config.ts`) was never introduced. The reversal is accepted rather than
migrated: the fixed-window math is a small pure function with unit coverage
(`tests/rate-limit.test.ts`), the table is bounded (one row per machine+kind,
patched in place), and staying component-free keeps the backend surface smaller.
Revisit only if limits outgrow fixed windows (e.g. token buckets per feature).

Note: activity `submit` deliberately has **no per-attendee cap** (unlike polls'
`maxAnswersPerAttendee`) — multiple entries from one device are legitimate
(group exercises share a device); the rate limit is the only backstop and the
presenter moderates the rest.
