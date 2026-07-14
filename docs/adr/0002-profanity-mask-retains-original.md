# The profanity mask retains the original text for presenter review

## Context

Every audience submission is run through the profanity Mask on ingest. The
original implementation was destructive: only the masked text was stored, and the
`flagged` boolean the mask returns was computed then discarded. The matcher
(obscenity + aggressive transformers) intentionally over-matches to defeat
obfuscation, so false positives (the "Scunthorpe problem") are expected — and
under the destructive design they were both unrecoverable and invisible, even to
the Presenter. `profanity.ts` already *documented* `flagged` as existing "so the
moderation screen can highlight the whole entry," but no code honoured that.

## Decision

The audience only ever sees masked text — that is unchanged. But we now:

- **Persist `flagged`** on the row so the console can highlight masked entries.
- **Retain the pre-mask original** in a presenter-only field, so a false-positive
  mask is visible and judgeable by the Presenter (an allowlisted admin), never by
  the audience.

## Consequences

- We deliberately store **unmasked, user-generated text** server-side. Access is
  presenter-only (`requireAdmin`) and it is purged by the Session clear-down like
  all other participation data. This is an accepted, scoped data-retention choice,
  not an oversight.

## Amendment (2026-07-07): flagged entries are auto-Hidden, and what shipped

Implemented as: `flagged` + presenter-only `original`/`originalNickname` on
`questions`, and `flagged` + `originalSteps`/`originalNickname` on
`activitySubmissions` — set on ingest only for the parts the Mask actually
matched, surfaced exclusively through the admin `feed` queries, purged with the
row.

One deliberate divergence from the original text above: a flagged entry is
**auto-Hidden pending presenter review**, not shown-masked to the audience.
Masked profanity on a projected wall is still disruptive for the workshop
audiences this runs in front of; the console tags flagged rows "⚠ masked"
(distinguishing them from presenter-Hidden rows) and shows the original, so
restoring a false positive is one click. If a future audience warrants the
more permissive shown-masked behaviour, flip the `hidden:` ingest default —
`flagged` and the originals already carry everything needed.
