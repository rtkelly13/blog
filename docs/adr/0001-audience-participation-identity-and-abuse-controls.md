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

The per-feature enable pattern is extended to the new features too: `qa`, `poll`,
and `activities` become `talkConfig` toggles whose writes are dropped server-side
when disabled, matching the existing `presence`/`reactions`/`follow` contract.

## Consequences

- Every participation mutation (`upvote`, `ask`, poll/activity `submit`) now
  takes `machineId`; previously none did — only presence/attendees carried it.
- **This is best-effort, not a security boundary.** `machineId` is a resettable
  localStorage value; a determined user clears it or opens tabs. The real trust
  boundary remains the presenter's allowlisted-admin moderation controls
  (`hidden` / reject). Do not treat these limits as anti-fraud.
