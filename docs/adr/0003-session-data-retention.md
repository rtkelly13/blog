# Session participation data is bounded by auto-expiry, not just manual clear-down

## Context

Participation data (questions, polls + words, activities + submissions,
reaction totals, attendees) persists after a Session ends. Originally the only
way to remove it was the Presenter's manual **clear-down**. Combined with
[ADR-0002](0002-profanity-mask-retains-original.md) — which retains the *unmasked*
original of everything the audience typed — "keep it until I remember to delete
it" is a weak default: raw user text accumulates indefinitely across every run.

## Decision

Two removal paths:

- **Clear-down** (manual) — the Presenter zeroes a single Session's data now. The
  Session record (the `talks` row) is kept so the log persists, showing zeroes.
- **Auto-expiry** (scheduled) — a cron reaper purges participation data for
  *ended* Sessions past a generous retention window (~30 days). The Session
  record is kept.

Both purge paths must cover **all** per-Session tables, including the dedup
ledgers introduced by ADR-0001 (`questionVotes`, `pollSubmitters`) — a
cleared/expired Session is truly zeroed, leaving only the log entry.

**Amendment (2026-07-07):** rate-limit rows are *not* per-Session and are
deliberately outside both purge paths. The `rateLimits` table is keyed
`(machineId, kind)` — machine-scoped, bounded (one row per machine+kind, patched
in place, never grows with sessions), and contains no user text — so purging it
per-Session would be meaningless. "Truly zeroed" applies to per-Session tables
only.

## Consequences

- Bounded retention of unmasked user text (see ADR-0002) without the Presenter
  having to remember. Post-talk review still has a month-long window.
- Every *new* per-Session table added in future must be registered in both the
  clear-down and auto-expiry purge lists, or it silently leaks past retention.
