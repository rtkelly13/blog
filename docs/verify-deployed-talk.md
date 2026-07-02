# Verifying the deployed talk (pre-talk smoke test)

Runbook for checking that the live-talk platform on **https://ryankelly.dev** works
end-to-end before presenting. Written to be re-runnable by an agent with the
`agent-browser` CLI (see "BROWSER CONTROL" in [AGENTS.md](../AGENTS.md)).

## 0. Prerequisites

- `agent-browser` on PATH (`which agent-browser`).
- A signed-in profile for the GitHub/Convex-gated surfaces (`?mode=presenter|console`,
  `/admin`). The canonical one is `~/.agent-browser-profiles/dev`; a clone at
  `~/.agent-browser-profiles/dev-verify` exists for isolated verification sessions
  (see "Session isolation" below). One-time sign-in:

  ```bash
  agent-browser --profile ~/.agent-browser-profiles/dev --headed open https://ryankelly.dev/admin
  # click "Sign in with GitHub", then close
  ```

### Session isolation (IMPORTANT — read before driving the browser)

Other agent sessions may be driving the same agent-browser daemon (e.g. localhost
E2E work). Sharing the default session means **their tab switches race yours** —
snapshots silently target the wrong tab and pages wedge on "Connecting…".

- Use **your own named sessions** for everything: `--session <unique-name>` on
  *every* command. Each named session is a separate browser process.
- One browser can hold a Chrome profile dir at a time (`SingletonLock`). If the
  default session already owns `dev`, use the clone:

  ```bash
  # signed-in admin/presenter browser (isolated)
  agent-browser --session talkverify --profile ~/.agent-browser-profiles/dev-verify open https://ryankelly.dev/admin
  # anonymous attendee browser (isolated, fresh cookies)
  agent-browser --session talkaud open https://ryankelly.dev/live
  ```

  Recreate the clone if the sign-in has expired:
  `rm -rf ~/.agent-browser-profiles/dev-verify && cp -R ~/.agent-browser-profiles/dev ~/.agent-browser-profiles/dev-verify && rm -f ~/.agent-browser-profiles/dev-verify/Singleton*`
- Close your sessions when done: `agent-browser --session <name> close`.

### Gotchas (each one cost real time on the first run)

- **Stale tabs wedge everything**: leftover tabs exhaust the connection pool →
  `snapshot` returns "(empty page)", screenshots hang, pages sit on "Connecting…".
  `agent-browser --session <s> tab list`, close extras; if still wedged,
  `pkill -f agent-browser` and start clean (expect one "Failed to connect" retry
  right after).
- **One daemon option-set**: `--profile` is silently ignored (warning printed) if
  the session already exists — profile binds when the session's browser launches.
- **Stale `SingletonLock`** (Chrome exit code 21): a killed Chrome leaves the lock
  symlink; kill the orphaned "Chrome for Testing" process using that profile dir.
- **Profile browsers restore old tabs** on relaunch — close restored localhost tabs
  before testing prod, or `reload`/`screenshot` act on the wrong tab.
- **Deck is client-rendered** (`ssr: false`): content appears ~2–4s after `open`;
  always `wait` before snapshotting. Activity embeds render **nothing** when no
  session is live (`if (!resolved) return null`) — an empty half-slide is normal.
- Background tabs throttle `setInterval` — timer-driven counts look stale in
  inactive tabs; WebSocket-driven Convex queries still update.

## 1. Confirm what should be deployed

Production = `main` on Vercel; Convex prod deploys on merge to main via CI.

```bash
git fetch origin main && git log origin/main --oneline -5
gh pr list --state open        # anything here is NOT on prod
gh run list --branch main --limit 3   # CI + "Deploy Convex" both green?
```

Note which talk-affecting PRs are merged vs open — don't verify features that
haven't shipped, and note open fix-PRs whose bugs are therefore still live.

## 2. Public surfaces (no auth — use an anonymous named session)

| Check | URL / action | Expect |
| --- | --- | --- |
| Talks index | `/talks` | Talk listed; draft decks (e2e-debug-deck) hidden |
| Talk page | `/talks/<slug>` | Frontmatter: event, location, duration |
| Deck renders | `/talks/<slug>/present` + `wait 3500` | Slide 1 heading + `1 / N` counter; N matches the MDX (slides = `---` separators − 2 frontmatter fences + 1) |
| Slide jump | `?slideIndex=<n>` (0-based Spectacle param) | Jumps directly — much faster than arrowing through |
| Keyboard nav | `press ArrowRight` | Counter advances |
| Activity slides | jump to each embed slide | Heading + static copy render (embed body needs a live session) |
| Live page idle | `/live` | "NO TALK IS LIVE RIGHT NOW" |

Find the activity-slide numbers from the deck MDX:

```bash
awk '/^---$/{n++} /LivePoll|OrderedActions|EmojiTop5|QuestionQueue/{print n-1": "$0}' data/talks/<slug>.mdx
```

## 3. Gated surfaces (signed-in session, nothing live yet)

| Check | URL | Expect |
| --- | --- | --- |
| Admin cockpit | `/admin` | "Signed in as @rtkelly13"; START/CONTROL form pre-filled with the talk; Sessions panel with clear-down |
| Presenter idle | `/talks/<slug>/present?mode=presenter` | Deck + `● ADMIN` badge + "NO LIVE FOLLOW TALK" HUD idle state |
| Console idle | `/talks/<slug>/present?mode=console` | Deck + `● ADMIN`; sidebar correctly absent until live-here |

If `/admin` shows only the bare `[ ADMIN ]` heading: wait ~5s (Convex auth
hydrates client-side); a persistent "Connecting…" means wedged tabs (see gotchas),
not necessarily a prod outage — clean up tabs before panicking.

### Clicking buttons: use `eval` JS clicks, not coordinate clicks

`agent-browser click` / `find … click` **report success but do nothing** on this
site's React buttons in several cases, with no error anywhere:

- **On the deck**, Spectacle keeps *every* slide mounted in the DOM. A coordinate
  click at a HUD button's position can hit another slide's element instead —
  `document.elementFromPoint` at the "Live — resume" button's centre returned a
  different slide's `<h1>`. HUD buttons also sit at `opacity: 0;
  pointer-events: none` in their idle state, so they're invisible to hit-testing.
- **On `/admin`**, `find role button click "START TALK"` and ref clicks (`@e22`)
  returned ✓ but never fired the mutation (a human click on the same button
  worked immediately).

The reliable pattern is a **direct JS click** — it bypasses hit-testing:

```bash
agent-browser --session <s> eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>/end talk/i.test(x.textContent)); if(!b) return 'not found'; b.click(); return 'clicked';})()"
```

(Wrap in an IIFE — bare `const` in `eval` collides on re-run. `fill` + `click`
on plain form inputs, e.g. the /live poll/question boxes, work fine.)

Diagnostic when a click "succeeds" but nothing happens:

```bash
agent-browser --session <s> eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>/TEXT/i.test(x.textContent)); const r=b.getBoundingClientRect(); const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return JSON.stringify({hit:el.tagName+':'+(el.textContent||'').slice(0,20), isButton:el===b||b.contains(el)});})()"
```

### Sharing a headed window with the user

If the user signs in / tests in your headed browser window, **the active tab
moves under you** — presses and snapshots silently target whatever tab they
focused (this masqueraded as "follow is broken": an ArrowRight went to a
`?mode=attendee` tab, which broadcasts nothing). Before every deck action:
`tab list`, then `tab <n>` the exact tab you mean. Better: keep the headed
window for the user's sign-in only, and do your driving in headless sessions.

## 4. Live realtime drill (REQUIRES USER GO-AHEAD — changes prod state)

Flipping a talk live is visible to anyone on `/live`. Ask the user first; the
permission classifier blocks it autonomously. Data is cleanable afterwards via
the admin Sessions panel ("Clear down").

1. Admin: tick **Follow-the-presenter** (off by default on the Interactive
   profile — worth double-checking for the real talk too), click **START TALK**;
   STATUS flips to live.
2. Presenter session: open the deck via "OPEN DECK TO BROADCAST →", flip the
   Broadcast toggle (top-right).
3. Attendee session: `/live` should auto-join — head-count, emoji reactions,
   question box.
4. Advance a slide as presenter → attendee's followed deck moves.
5. Activity round-trips: jump to the poll slide, "▶ Start poll" (one-click,
   slide-declared prompt), attendee submits a word → cloud grows. Same idea for
   ordered-actions (submit steps → wall → timed reveal; on-deck next-key reveals
   before advancing), Q&A (ask + upvote → reorder; reject → `🚫 N blocked`),
   emoji Top-5 slide.
6. Console mode now shows the sidebar: pacing timer, always-revealed answers,
   moderation incl. blocked rows.
7. **Cleanup**: END TALK in admin, then Sessions → **CLEAR DOWN** on the drill's
   session (two-step confirm). Close your named browser sessions.

## 5. Results log

### Run: 2026-07-02, pre-talk check for `so-you-want-to-build-software` (2026-07-03)

Deployed: `origin/main` @ `3ba5a78` (#22 audience participation). CI + Deploy
Convex green. Open PRs #24 (E2E harness), #26 (**fixes for #22 review findings —
those bugs are live on prod**).

- ✅ `/talks` — deck listed; draft e2e-debug-deck hidden
- ✅ `/talks/so-you-want-to-build-software` — detail page correct
- ✅ Deck renders `1 / 23` (23 slides = #22 build; was 22 before)
- ✅ Slide jump + arrow nav; activity slides 3 (LivePoll), 8 (OrderedActions),
  16 (EmojiTop5), 23 (QuestionQueue) all render their static parts
- ✅ Toast slide screenshot — typography/layout correct
- ✅ `/admin` — signed in, cockpit + Sessions panel render (1 ended session from
  1 Jul listed)
- ✅ `?mode=presenter` — ADMIN badge + HUD idle state
- ✅ `?mode=console` — loads, sidebar correctly gated on live-here
- ✅ `/live` anonymous — correct idle state
- ⏸ Live drill (section 4) — **not run**: needs user authorization to flip prod
  live state

### Run: 2026-07-02 (second pass, after PR #30 deployed) — live drill

Deployed: `main` @ PR #30 (follow default on). CI + Deploy Convex green.

- ✅ `/admin` Interactive preset shows **Follow-the-presenter pre-ticked** (#30 live)
- ✅ START TALK (user-clicked) → `/live` flips to LIVE NOW, presence `👥 2 PEOPLE HERE`
- ✅ Emoji reaction from anonymous attendee registers
- ✅ **Follow-the-presenter**: presenter ArrowRight 3→4 mirrored on the attendee
  deck within ~2s (once the *actual* `?mode=presenter` tab was driven — see
  active-tab gotcha). Broadcasting is **automatic** for an admin in
  presenter/console mode with follow on; the `/admin` copy about a manual
  "Broadcast (top-right)" toggle is stale.
- ✅ Poll round-trip: slide-declared prompt opened; attendee word `excited`
  appears in the cloud
- ✅ Q&A: attendee question submitted and queued (self-upvote doesn't increment —
  appears intentional)
- ✅ END TALK, then Sessions **CLEAR DOWN** wiped the drill session to zeroes
- 🐛 **Bug found — mid-talk join misalignment**: an attendee who opens the deck
  while a talk is live stays on slide 1 until the presenter *next* changes
  slide. `Follower`'s initial reconcile `skipTo` is dropped by Spectacle before
  nav is ready and never retried — `DeckDriver` has a retry loop for exactly
  this (`components/talks/DeckLive.tsx`); `Follower` needs the same. Not
  covered by PR #26. Workaround live: presenter taps forward/back once after
  people join.
