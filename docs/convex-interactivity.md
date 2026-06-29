# Interactivity on the blog with Convex

An evaluation of what this Convex foundation makes possible, and which ideas are
worth building first.

## The approach (what we've actually got)

- **Optional realtime backend.** `lib/convexClient.ts` returns `null` when
  `NEXT_PUBLIC_CONVEX_URL` is unset, and `_app.tsx` only mounts `ConvexProvider`
  when it's set. So every interactive feature must **degrade gracefully** to a
  static/hidden state. Nothing breaks the build or a no-Convex deploy.
- **MDX-embeddable widgets.** The blog already renders React components inside
  posts (`<Diagram>`, `<NoteBlock>`, `<ActivityQR>`). Interactivity is just more
  of these — a client component that calls Convex hooks (`useQuery`/`useMutation`)
  and is guarded by `isConvexConfigured`.
- **A moderation toolkit, already proven.** The talk activity established the
  pattern for anything user-generated: in-process profanity filter (`obscenity`),
  a buffered reveal (`ctx.scheduler.runAfter`), and a presenter/manage screen.
  Reuse this for every UGC feature.

**Reusable shape:**

```tsx
// components/<feature>.tsx  — embeddable in MDX
'use client';
import { isConvexConfigured } from '@/lib/convexClient';
export default function Feature(props) {
  if (!isConvexConfigured) return <StaticFallback {...props} />; // graceful
  return <LiveFeature {...props} />; // useQuery/useMutation
}
```

## What Convex gives us

Reactive queries (live updates, no polling), mutations/actions, **scheduled
functions** (delays, cleanup, digests), file storage, full-text + **vector
search**, HTTP actions (webhooks), and optional auth. The reactive model is the
key unlock: any number of clients see shared state update in real time, cheaply.

## Catalogue, evaluated

Axes: **Effort** (build cost), **Moderation** (abuse surface), **Value**
(engagement), all 1–5. "Auth?" = needs per-user identity.

| Idea | What | Effort | Moderation | Value | Auth? |
|---|---|---|---|---|---|
| **Reactions / claps** | Live per-post emoji counts, cookie-deduped | 2 | 1 | 4 | no |
| **Polls** | `<Poll>` in a post, live result bars | 2 | 1 | 4 | no |
| **Live talk activities** | Audience submissions → wall + moderation (toast) | — | 3 | 5 | no |
| **Live Q&A / AMA** | Submit + upvote questions, host answers live | 3 | 3 | 5 | no |
| **"N reading now" presence** | Ephemeral live reader count per post | 3 | 1 | 3 | no |
| **Guestbook** | Short signed messages on an /about or /guestbook page | 3 | 4 | 3 | no |
| **Reading progress sync** | Resume position across devices | 3 | 1 | 2 | yes |
| **Public highlights** | Readers highlight + share passages (social annotation) | 5 | 4 | 3 | yes |
| **Comments** | Threaded realtime comments per post | 5 | 5 | 4 | maybe |
| **Presenter↔audience sync** | Deck pushes current slide to audience devices | 3 | 2 | 4 | no |
| **AI "ask this post"** | Vector search + LLM answer over post content | 4 | 3 | 4 | no |
| **Semantic search** | Vector search across all posts | 3 | 1 | 4 | no |

Notes:
- **Comments** are the highest-moderation item; the existing **giscus** (GitHub)
  integration may remain the better tool, leaving Convex for lighter interactions.
- **Presenter sync** is great in general but conflicts with "no phones" in the
  school setting — better for remote/online talks.
- **AI features** would call the Claude API from a Convex action; vector search
  is built into Convex, so "ask this post" / semantic search are natural fits.
- Anything **no-auth** uses a cookie/localStorage id for dedup + per-id rate
  limiting; that's enough for reactions/polls/Q&A without a login wall.

## Recommendation

Build in order of *value ÷ (effort + moderation)*:

1. **Reactions + Polls** — cheap, near-zero abuse, high delight; validates the
   embeddable-widget + graceful-degradation pattern end to end.
2. **Live Q&A** — reuses the toast moderation toolkit; high value for talks/posts.
3. **Presence ("N reading now")** — fun, exercises ephemeral data + scheduled
   cleanup.
4. **Semantic search / "ask this post"** — once there's appetite for AI; leans on
   Convex vector search + a Claude action.

Defer **comments** (consider keeping giscus) and **per-user** features
(highlights, progress) until there's a reason to add auth.

## Constraints & cost

- **Cost/ops:** Convex's free tier is generous and the reactive model avoids
  polling; with the optional-client design, an unconfigured deploy costs nothing.
- **Privacy:** a public blog means every UGC surface needs the moderation buffer
  + profanity filter + rate limiting before it ships.
- **SSG:** widgets are client-only and hydrate after load; keep them out of the
  critical render path so posts stay fast and static-first.
