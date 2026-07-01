# Live Talk Platform

The audience-participation layer for live talks: a presenter runs a deck, and
the audience joins from their own devices to react, ask questions, answer polls,
and take part in activities — all in real time via Convex.

## Language

### Core scoping

**Talk**:
The authored, reusable deck content — the slides and notes. Lives in
`data/talks/<slug>.mdx` and is identified by its `slug`. A Talk is *material*,
not a live event; it has no database row of its own.
_Avoid_: using "talk" for a live run (that's a Session).

**Session**:
One live *run* of a Talk — it starts, streams to an audience, and ends. Stored
as a row in the `talks` table (a legacy name; the row is a Session, not a Talk).
The user-facing noun in the admin panel for "one run."
_Avoid_: Run, Show, Broadcast, Instance.

**Room**:
The identifier every live feature scopes to. A Room *is* a Session's `_id` —
there is no separate room-code concept; joining "the live Session" is how the
audience attaches to presence, reactions, questions, polls, and activities.
_Avoid_: channel, room code.

### Participants

**Attendee**:
A member of the audience. Pseudo-anonymous — identified only by a `machineId`,
never by login. Presence, dedup, and rate-limiting all key on this.
_Avoid_: user (a "user" is the authenticated GitHub identity), viewer.

**machineId**:
A random UUID a browser persists in localStorage. The Attendee's pseudo-identity:
it de-duplicates a browser's tabs/reloads and scopes best-effort abuse controls.
It is *not* a security identity — it is resettable. See [ADR-0001](docs/adr/0001-audience-participation-identity-and-abuse-controls.md).
_Avoid_: userId, deviceId, sessionId.

**Presenter**:
The person running the Session. The only authenticated role — a GitHub login on
the `ADMIN_GITHUB_LOGINS` allowlist. The real trust boundary: all moderation and
Session-control mutations require it (`requireAdmin`).
_Avoid_: admin (that's the allowlist mechanism), host, speaker.

### Moderation

Two independent mechanisms, not to be conflated:

**Mask**:
The *automatic* mechanism. On ingest, profanity is replaced with asterisks
(`f**k`). The audience sees the masked text; the original is retained
presenter-only and the entry is marked `flagged` so the console can highlight it
(see [ADR-0002](docs/adr/0002-profanity-mask-retains-original.md)).
_Avoid_: censor, filter, block (blocking is the manual mechanism).

**Hide**:
The *manual* mechanism. The Presenter removes an entry from the audience-visible
surface (`hidden: true`). The row is kept — the console still sees it — but the
audience gets only a count, never the content.
_Avoid_: reject, delete, remove, ban.

**Blocked (count)**:
A **console-only** tally of Hidden entries the Presenter sees; the audience is
shown neither the count nor the content (the Presenter raises it verbally if it
matters). Always refers to the same rows as Hide.
_Avoid_: using "blocked" for masked entries (masked entries are shown, not hidden).

**Answered**:
A question the Presenter has marked as addressed. Distinct from Hide — an
Answered question stays visible in the queue.

### Deck surfaces & reveal

A single `SpectacleDeck` renders in one of three **modes** (from `?mode=`),
carried to embedded components via `DeckMode`:

**Presenter (mode)**:
The clean, projected deck the room sees. Drives the reveal beat via the keyboard.
_Avoid_: projector, stage.

**Attendee (mode)**:
The audience's own view (`/live` or a watch-along deck). Reveal-gated and the only
mode that shows input forms. The default when `?mode=` is absent.
_Avoid_: viewer, follower, guest.

**Console (mode)**:
The Presenter's second-screen cockpit — moderation controls, notes, preview. It
**always** shows answers and moderation output regardless of Reveal state; it is
never reveal-gated.
_Avoid_: dashboard, admin view.

**Reveal**:
Flipping an Activity's canonical answer into view for everyone. A one-way,
Session-wide flag (`revealed`) driven by any of: a scheduled timer at `revealAt`,
the Presenter's `revealNow` control, or the **reveal beat**. Console always sees
the answer; Presenter and Attendee are gated on it.
_Avoid_: show, unlock, publish.

**Reveal beat**:
The presenting keyboard interaction: while an Activity is open and unrevealed, the
next advance-key press *reveals* instead of advancing (a Spectacle-stepper-style
beat); the following press advances. Tied to *presenting the deck*, not to
follow-mode.
_Avoid_: step, click.

### Data lifecycle

**Clear-down**:
The Presenter manually purging one Session's generated data now. The Session
record (the `talks` row) is kept, so the log persists showing zeroes. See
[ADR-0003](docs/adr/0003-session-data-retention.md).
_Avoid_: reset, wipe, delete session (the record survives).

**Ephemeral / Persistent**:
*Ephemeral* data is cron-reaped on a short TTL (presence, floating reactions,
presenter heartbeats). *Persistent* data survives until Clear-down or auto-expiry
(questions, polls, activities, reaction totals, attendees). Only the Session
record outlives auto-expiry.
