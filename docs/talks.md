# Talks & the live-talk platform

Talks are slide-split MDX decks that can be **presented live** — an
audience-participation platform (presence, Q&A, polls, follow-the-presenter)
backed by Convex. The deck prose is human-authored (see
[posting.md](./posting.md#authorship-policy-read-first)).

## Deck content

One deck is one MDX file: `data/talks/<slug>.mdx`, slide-split (frontmatter:
`types/TalkFrontMatter.ts`). Decks support themeable per-slide backgrounds and
generated SVG graphics — the graphics generators, named backgrounds, and the
experiments gallery are documented in **[talks-graphics.md](./talks-graphics.md)**.

## Routes & surfaces

| Route | Surface |
| ----- | ------- |
| `pages/talks/` | Deck landing + `present` (presenter view) |
| `pages/live/` | Audience-join live surface (`live/manage` → `/admin`) |
| `pages/admin.tsx` | Presenter / admin hub (GitHub-gated) |
| deck `?mode=presenter\|console` | Presenter / moderation console overlays |

Talk + admin components live in `components/talks/` and `components/admin/` —
see [components/AGENTS.md](../components/AGENTS.md). The Spectacle deck,
follow-the-presenter driver/follower, and deck sidebars are documented there.

## Backend & auth

- **Realtime backend** — talk sessions, presence, Q&A, polls, ordered actions,
  break timer, moderation, session clear-down/retention. See
  **[convex/AGENTS.md](../convex/AGENTS.md)** and the ADRs.
- **Authentication** — Convex Auth with a single GitHub provider, the admin
  boundary, the E2E bypass, and per-environment admin setup:
  **[auth.md](./auth.md)** ([ADR-0004], [ADR-0005]).

## Testing & pre-talk verification

- **Live E2E harness** — `tests/live-e2e.mjs` drives the full
  audience-participation flow across three concurrent tabs (admin cockpit,
  attendee, presenter deck) against a running server. See
  **[live-e2e-harness.md](./live-e2e-harness.md)**.
- **Pre-talk smoke test** — runbook for verifying the deployed platform on
  ryankelly.dev before presenting, re-runnable by an agent with `agent-browser`:
  **[verify-deployed-talk.md](./verify-deployed-talk.md)**.

Browser automation for the gated surfaces (profiles, port 3002, the Chrome
hydration gotcha) is covered in
[technical-guide.md](./technical-guide.md#browser-control-agent-browser).

[ADR-0004]: adr/0004-preview-environments-and-auth.md
[ADR-0005]: adr/0005-e2e-auth-bypass-and-test-github-branch.md
