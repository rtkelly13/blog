# CONVEX

## OVERVIEW

The realtime backend for the live-talk / audience-participation system. Convex
functions (queries/mutations) stream reactively to every connected client, so the
presenter deck, the `/live` audience surface, and the `/admin` hub all stay in
sync with no polling. Everything is scoped to a **talk session**.

## THE MODEL

A **talk session** is a `talks` row created when the presenter hits Start. Its
`_id` is the **`room`** string that every feature scopes to (presence, reactions,
Q&A, polls, activities). The audience never types a room id — clients read
`talks.current` (the one row with `status: 'live'`) and attach to its `_id`. Each
Start ends any prior live talk and mints a fresh session, so a room id is always
a clean, single run.

The **MDX talk deck** (`data/talks/<slug>.mdx`, loaded by `lib/talks.ts`) is
content; a **talk session** is one live run of it. They share only the `slug`.

## SCHEMA (schema.ts)

| Table                 | Purpose                                                              |
| --------------------- | ------------------------------------------------------------------- |
| `talks`               | Talk sessions; `status` live/ended, `config`, `currentSlide`. `_id` = room |
| `counters`            | Hello-world demo counter (see hello.ts)                             |
| `presence`            | One row per (room, machineId) heartbeat; reaped on TTL              |
| `attendees`           | Persistent first-seen per (room, machineId); drives one-time join toasts + stats |
| `presenters`          | Presenter heartbeats per (room, sessionId); detects ≥2 presenters (clash) |
| `reactions`           | Ephemeral emoji bubbles (reaped ~6s)                               |
| `reactionTotals`      | Persistent per-(room, emoji) tally for the closing chart            |
| `questions`           | Audience Q&A queue (`votes`, `answered`, `hidden`)                  |
| `questionVotes`       | One row per (question, machineId) — dedups upvotes                  |
| `polls`               | Word-cloud poll prompts (`open`/`closed`)                           |
| `pollWords`           | Per-(poll, word) tally; `hidden` blocks a word                      |
| `pollSubmitters`      | One row per (poll, machineId) with answer `count` — caps answers per attendee |
| `rateLimits`          | Per-(machineId, kind) fixed-window counters for audience writes    |
| `activities`          | "Put the actions in order" activity (`options`, `revealAt`, `revealed`) |
| `activitySubmissions` | Audience ordered-step submissions (`hidden` when flagged)          |
| `...authTables`       | Convex Auth tables; `users` overridden to carry `githubLogin`       |

## MODULE MAP

| Module            | Contents                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `talks.ts`        | Session lifecycle (`current`, `start`, `end`, `setSlide`, `stats`), `liveTalkForRoom`/`resolveConfig` gate helpers, presenter heartbeat (`presenterPing`/`presenterCount`/`reapPresenters`), `isAdmin`/`viewer` |
| `talkConfig.ts`   | `talkConfigValidator`, `TalkConfig`, `DEFAULT_CONFIG`, `TALK_PRESETS` — per-talk feature flags |
| `presence.ts`     | `heartbeat`, `count`, `recentJoins`, `reapExpired`               |
| `reactions.ts`    | `send`, `recent`, `reapExpired`; `ALLOWED_EMOJIS` allow-list      |
| `questions.ts`    | Audience `ask`/`upvote`/`list`; presenter `feed`/`setAnswered`/`setHidden` |
| `polls.ts`        | Presenter `start`/`close`/`feed`/`hideWord`; audience `active`/`submit` |
| `activities.ts`   | Presenter `open`/`revealNow`/`close`/`feed`; audience `active`/`submit`; scheduled `reveal` |
| `sessions.ts`     | Admin hub: `list` (per-session data tallies) + `clearDown` (purge one session) |
| `hello.ts`        | Hello-world reactive counter (`get`/`bump`)                       |
| `auth.ts`         | GitHub-only Convex Auth; keeps `githubLogin` on the user row      |
| `crons.ts`        | Scheduled TTL reapers (presence, reactions, presenters), every 1 min |
| `lib/admin.ts`    | `isAdminUser` / `requireAdmin` — GitHub-login allowlist gate      |
| `lib/profanity.ts`| `cleanText` / `cleanSteps` — mask + flag profanity (`obscenity`) |
| `lib/rateLimit.ts`| Per-machine fixed-window rate limits for audience writes; structured `rate_limited` refusals |
| `_generated/`     | Convex codegen (derived from schema + functions — do not hand-edit) |

## WHERE TO LOOK

| Task                              | Location                          | Notes                                    |
| --------------------------------- | --------------------------------- | ---------------------------------------- |
| Add a table / index              | `convex/schema.ts`                | Regen `_generated/` via `convex dev`     |
| Start/end/follow a talk          | `convex/talks.ts`                 | `room` = talk `_id`                      |
| Per-talk feature flags / presets | `convex/talkConfig.ts`            | `TalkConfig`, `DEFAULT_CONFIG`, presets  |
| Live head-count / join toasts    | `convex/presence.ts`             | TTL-based, machine-deduped               |
| Emoji reactions                  | `convex/reactions.ts`            | Allow-list enforced server-side          |
| Q&A queue                        | `convex/questions.ts`           | Votes deduped per machine                |
| Word-cloud poll                  | `convex/polls.ts`               | One answer per machine per poll          |
| Ordered-actions activity         | `convex/activities.ts`          | Timed reveal via `ctx.scheduler`         |
| Admin session log / clear-down   | `convex/sessions.ts`            | Purge is admin-only, ended talks only    |
| Admin allowlist / auth gate      | `convex/lib/admin.ts`, `auth.ts` | `ADMIN_GITHUB_LOGINS` env var            |
| Profanity masking                | `convex/lib/profanity.ts`       | Pure JS (no `"use node"`)                |
| Scheduled cleanup                | `convex/crons.ts`               | 1-min reapers                            |

## CONVENTIONS

### Audience mutations are gated on a live talk

Public (audience-facing) mutations call `liveTalkForRoom(ctx, room)` (in
`talks.ts`) before writing. It normalises the `room` to a `talks` id and returns
the talk only if it is `status: 'live'` — so a stale/demo/ended room is silently
dropped. This is the server-side switch that makes a disabled or closed feature
**actually** closed, not merely hidden in the UI. Feature toggles from the talk's
`config` (`resolveConfig`) are checked the same way (e.g. presence/reactions).

### Admin identity is enforced in mutations, not the UI

Presenter/admin mutations call `requireAdmin(ctx)` (or `isAdminUser` for queries
that degrade gracefully). Audience functions are public, so identity is the real
security boundary here — the allowlist is `ADMIN_GITHUB_LOGINS` matched against
the GitHub `login` kept on the `users` row by `auth.ts`.

### Audience content is profanity-masked and auto-hidden

Free-text audience input (questions, nicknames, poll words, activity steps) is run
through `cleanText`/`cleanSteps` (`lib/profanity.ts`) on the way in. Masked text is
stored; if anything was `flagged`, the row is inserted `hidden: true` so it lands
in the presenter's moderation feed but never on the audience wall — the presenter
can restore it.

### Per-machine dedup via `machineId`

A browser identifies itself with a pseudo-anonymous `machineId` (random UUID in
localStorage — see `lib/machineId.ts`). It dedups presence (one head per browser),
question upvotes (`questionVotes`), and poll answers (`pollSubmitters`). No PII
ever leaves the client; the server only stores the opaque id.

### `_generated/` is codegen

`_generated/` (api, server, dataModel) is produced by Convex from the schema and
function signatures. Never hand-edit it — it regenerates on `convex dev` / deploy.

> Exception on the `claude/convex-deep-search` branch: `_generated/api.d.ts` was
> hand-edited to add the `documents` module so `tsc` resolves `api.documents.*`
> without a local codegen run. Running `npx convex dev`/`deploy` regenerates it
> identically — the edit is a stopgap, not a new source of truth.

## SEARCH CORPUS (`documents`)

Site-wide full-text search for the command palette. `documents` is a **derived**
table — one row per published blog post and talk — not operational data:

- **Source of truth is the MDX**, not Convex. `scripts/build-search-index.mjs`
  strips each post/talk body to plain text and writes `convex/search-docs.jsonl`.
- **Indexed at deploy**, off preview builds: `.github/workflows/index-search.yml`
  runs on push to `main`, `convex deploy`s then `convex import --replace --table
  documents`, which rebuilds the `search_text` full-text index. Needs repo secret
  `CONVEX_DEPLOY_KEY` (a Convex production deploy key).
- **Query**: `api.documents.search({ query, type?, limit? })` (`convex/documents.ts`)
  via `withSearchIndex('search_text', …)`, returning a bounded display projection.
- **Client**: `components/search/DeepSearch.tsx` registers hits as kbar actions,
  mounted only when `isConvexConfigured` so the palette degrades to the static
  `public/search.json` list when Convex is absent.

## SEE ALSO

React-side hooks and clients: `lib/usePresence.ts`, `lib/useReactions.ts`,
`lib/machineId.ts`, `lib/convexClient.ts` (see lib/AGENTS.md). UI: `components/talks/`,
`components/admin/` (see components/AGENTS.md).
