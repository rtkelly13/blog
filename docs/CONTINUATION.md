# CONTINUATION — delete this file once actioned

> [!IMPORTANT]
> Temporary handover note, not part of the permanent docs. Written to be picked
> up cold on the laptop. **Delete it in the commit that finishes the work.**

Two threads are in flight: the **NeanderBonk** page (built, green, unverified on
real hardware) and **preview subdomains** (designed, not built).

---

## 1. State of play

**PR #99** — <https://github.com/rtkelly13/blog/pull/99>
Branch: `feat/neanderbonk`
All CI green, including the required `PR checks` gate and visual regression.

**Preview:** <https://my-blog-0j5s-git-claude-android-micr-900d7f-rtkelly13s-projects.vercel.app/experiments/neanderbonk>

What landed:

| Path | |
| --- | --- |
| `pages/experiments/neanderbonk.tsx` | Shell; `next/dynamic` + `ssr: false` |
| `components/experiments/neanderbonk/syllables.ts` | Lexicon + heuristic (pure) |
| `components/experiments/neanderbonk/rules.ts` | Verdicts (pure) |
| `components/experiments/neanderbonk/words.ts` | Original starter deck (pure) |
| `components/experiments/neanderbonk/useSpeechReferee.ts` | Web Speech API → words |
| `components/experiments/neanderbonk/bonk.ts` | Web Audio buzzer + haptics |
| `components/experiments/neanderbonk/NeanderBonk.tsx` | The app |
| `public/neanderbonk/syllables.txt` | 117,484 words, 964 KB, generated |
| `scripts/generate-neanderbonk-lexicon.mjs` | `pnpm neanderbonk:lexicon` |
| `tests/neanderbonk-{syllables,rules}.test.ts` | 38 unit tests |
| `tests/neanderbonk.spec.ts` | 10 e2e tests, stubbed recogniser |

Design notes live in `components/AGENTS.md` → **EXPERIMENTS**. Read that before
changing the ruling logic; the three-verdict asymmetry is deliberate.

### What was never verified

**The live preview was never loaded by anything.** The agent environment's proxy
denies `*.vercel.app`, so every check ran against a local production build
(`next build` + `next start`). Vercel reported the deployment Ready; nobody has
opened it.

---

## 2. Do this first — 5 minutes, on a phone

Open the preview URL in **Chrome on Android**. Type `cat` in the target field,
Start the round, hold the button, say **"big grey building"**. Expect a red BONK
dialog naming *building* at 2 syllables.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Bounces to a Vercel login | Deployment Protection | Vercel → Settings → Deployment Protection → disable Vercel Authentication for previews |
| Page loads, no mic permission prompt | `Permissions-Policy` | Check the response header in devtools; expect `microphone=(self)`. See §5 note — the rule ordering in `next.config.js` is counterintuitive and unverified on Vercel's router |
| Prompt appears, nothing transcribes | Not Chrome-family, or offline | Web Speech API needs Chrome/Edge and (probably) network |
| Bonks the wrong person | Expected — see §4 | Use hold-to-clue, not open mic |

Then **actually play a round with someone** and count false bonks. That number is
the only thing that decides whether this is fun. Everything in §4 is speculation
until it exists.

---

## 3. Merge decision

The PR is mergeable as-is (squash, per repo policy). Nothing in §4 blocks it —
the page is an `/experiments/*` route, noindexed and out of the sitemap, so
shipping it early costs nothing and makes it easier to test on real hardware.

**Recommendation:** merge, then iterate from main.

---

## 4. NeanderBonk backlog, roughly by value

1. **Whatever real play turns up.** Do this before anything below it.
2. ~~Mic check before the round starts.~~ **Done** — idle-state hold-to-test
   button; echoes heard words without judging them.
3. ~~Kill or gate open-mic mode.~~ **Done** — the microphone mode picker is
   development-only (`OPEN_MIC_AVAILABLE`); the e2e tests drive the hold button
   via its keyboard path.
4. **Stats screen — partially done.** Per-team guessed/bonked tallies and
   most-bonked word now render in the ruling log. Syllables-per-minute still
   needs timestamps on judged words, which nothing records yet.
5. ~~Persistence.~~ **Done** — scores, log, and turn survive a refresh via
   `localStorage` (`neanderbonk:game:v1`); live-round state deliberately resets;
   Reset game clears the save.
6. **Language setting.** `lang` is hardcoded `en-GB` in `NeanderBonk.tsx`.
7. **Homophones** — *read this before starting it.* Detecting "bare" for BEAR
   needs phone sequences, and **the generated lexicon stores syllable counts
   only, not ARPAbet phones.** So this is not a `rules.ts` change; it needs
   `scripts/generate-neanderbonk-lexicon.mjs` to emit phones too, which roughly
   triples the asset. Probably only worth it as a second, smaller
   phones-for-common-words file loaded lazily.
8. **Instant replay.** Keep ~3 s of audio around each bonk so the poet can hear
   their crime. Needs `getUserMedia` + `MediaRecorder` running *alongside* the
   Web Speech API — two mic consumers, which may or may not co-operate. Test
   feasibility before designing it.

Non-goals for this page: speaker separation (impossible via Web Speech — see
`useSpeechReferee.ts` header), and anything that removes the physical club.

---

## 5. Preview subdomains — partially built

Done so far: `convex-preview` and `slot/1..3` exist on origin (all = main);
PR #101 adds `convex-deploy-preview.yml` (deploys `convex-preview` to a stable
named Convex preview deployment, skips until `CONVEX_DEPLOY_KEY_PREVIEW`
exists) and `scripts/preview-slot.sh` (claim/release a slot as
convex-preview + ref). Still to do by hand: Convex preview deploy key → repo
secret, Vercel Preview-env `NEXT_PUBLIC_CONVEX_URL`, the three project domains
bound to slot branches, and the DNS CNAMEs. The original design follows.

Goal: stop hunting hash URLs; three stable subdomains testable in parallel.

### Layer 1 — `convex-preview`, the schema train

Every Vercel preview shares one Convex backend, so parallel slots would
otherwise fight over schema. So:

- **`convex-preview` always exists and always points at a specific commit.**
  Default state: identical to `main`. Never delete it.
- **It is the only branch that deploys the preview Convex backend.** A sibling of
  `.github/workflows/convex-deploy.yml` triggered on `push: [convex-preview]`,
  using a separate `CONVEX_DEPLOY_KEY_PREVIEW` secret. Copy the existing
  workflow's skip-if-secret-absent guard verbatim — it makes the whole thing
  safe to merge before the secret exists.
- Convex preview deployments are created by name with a preview deploy key
  (something like `convex deploy --preview-create preview`). **Check the current
  flag against Convex's docs** — unverified here.
- Vercel's **Preview** environment `NEXT_PUBLIC_CONVEX_URL` must point at that
  deployment.
- **Advancing it:** when main moves and `convex-preview` carries nothing extra,
  fast-forward it. Rule: fast-forward only, never force — if it is not an
  ancestor of main it is holding unmerged schema work, so leave it and warn.

### Layer 2 — `slot/1..3`, bound to subdomains

| Subdomain | Vercel "Git Branch" |
| --- | --- |
| `p1.ryankelly.dev` | `slot/1` |
| `p2.ryankelly.dev` | `slot/2` |
| `p3.ryankelly.dev` | `slot/3` |

A slot is **`convex-preview` plus the PR's commits**, not the raw PR head — that
is what keeps the frontend compatible with the deployed schema:

```bash
git fetch origin
git checkout -B slot/2 origin/convex-preview
git merge --no-edit <pr-head-sha>   # conflict → report and bail
git push -f origin slot/2
```

A merge commit is fine here: slot branches are disposable and never merged back.

**Releasing a slot resets it to `convex-preview`, not to `main`** — an idle
subdomain should still show something that matches the deployed schema.

### Setup, in order

1. DNS: CNAMEs for `p1`/`p2`/`p3` → the target Vercel shows when adding the domain.
2. Vercel → Settings → Domains: add all three, set each **Git Branch** to `slot/N`.
3. Vercel → Deployment Protection: disable Vercel Authentication for previews.
4. `git push origin main:refs/heads/convex-preview`
5. `for n in 1 2 3; do git push origin convex-preview:refs/heads/slot/$n; done`
6. **Smoke-test by hand** — `git push -f origin HEAD:slot/1`, confirm
   `p1.ryankelly.dev` updates. Do this before automating anything.

### The load-bearing assumption

**That Vercel's GitHub App deploys a branch push made with `GITHUB_TOKEN`.**
Expected to work — the "GITHUB_TOKEN pushes don't trigger workflows" rule is an
Actions recursion guard, not webhook suppression — but the entire scheme rests on
it and it is untested. Step 6 above tests the manual half; test the automated
half with a throwaway label before relying on it.

### Automation status

A label-driven allocator was drafted (label a PR `preview` → lowest free slot →
relabel `preview:N` → comment the URL; release on close or unlabel; serialise
claims with `concurrency`). **It predates the `convex-preview` layer and needs
reworking to branch slots off `convex-preview` and merge rather than force-push
the raw head.** The draft is in the session transcript for PR #99; it is short
enough to rewrite from this spec.

Manual version, which is most of the value and has no failure modes:

```bash
alias p1='git push -f origin HEAD:slot/1 && echo https://p1.ryankelly.dev'
alias p2='git push -f origin HEAD:slot/2 && echo https://p2.ryankelly.dev'
alias p3='git push -f origin HEAD:slot/3 && echo https://p3.ryankelly.dev'
```

Note these push the raw head, skipping the `convex-preview` merge. Fine while
`convex-preview == main`; wrong the moment it diverges.

### Costs

- Pushing to `slot/*` triggers **no GitHub Actions workflow** — `pr-checks.yml`
  is `pull_request`-only, `ci.yml` and `convex-deploy.yml` are `push: [main]`.
  Slots cost Vercel build minutes only.
- Hobby allows one concurrent build, so three slots plus a PR preview queue
  rather than fail.
- `REGRESSION_BASE_URL` (in `tests/visual-vs-deployed.spec.ts`) can point at a
  slot, so `pnpm test:regression` can diff a local build against a preview
  instead of production.

---

## 6. Cold start on the laptop

```bash
git fetch origin && git checkout claude/android-microphone-isolation-poetry-89qin2
pnpm install --frozen-lockfile
pnpm vitest run --project unit tests/neanderbonk-syllables.test.ts --reporter=verbose  # prints the heuristic metrics
pnpm test:e2e tests/neanderbonk.spec.ts
pnpm dev   # http://localhost:3000/experiments/neanderbonk
```

**Use pnpm 10.** pnpm 11 no longer reads `pnpm.overrides` from `package.json`
and fails `--frozen-lockfile` with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. CI pins
`version: 10` in `.github/actions/setup-blog`; corepack will otherwise pull 11.

**Mic testing needs a secure context.** `localhost` qualifies;
`http://192.168.x.x:3000` does not, so a phone cannot test this page against
`pnpm dev` over the LAN. Use `cloudflared tunnel --url http://localhost:3000`
for an HTTPS URL onto local dev with hot reload intact.

---

## 7. Facts not worth re-deriving

- **Heuristic accuracy:** 87.9% within range across 117,484 words; over-counts
  0.33% of the 14,965 genuine monosyllables. Pinned by a test that fails on
  regression. Handling `-lle`/`-gue`/`-que` took the over-count from 1.10%.
- **Bundle:** the whole app is one 28 KB chunk that no page entry in
  `.next/build-manifest.json` references — verified, not assumed. Zero new npm
  dependencies.
- **Header rule ordering is the opposite of intuition.** Where two `headers()`
  rules set the same key, Next.js emits one header and the **later** rule wins.
  The narrow `/experiments/neanderbonk` grant must therefore come *after* the
  `/(.*)` denial in `next.config.js`. Confirmed against `next start`; the first
  attempt had it backwards and silently kept the mic blocked.
- **Playwright `toContainText` reads DOM text, not rendered text.** The dialog
  says `Bonk`; the shouting is `text-transform: uppercase`.
- **A fake `SpeechRecognition` must advance `resultIndex` per utterance.**
  Reusing index 0 makes the hook's de-duplication silently swallow every
  utterance after the first — which is the de-dup working correctly, and cost
  half an hour of confusion.
- **CMUdict is BSD-2-Clause**; attribution is in the generated file's header and
  in the page's caveats panel. Keep both if the generator changes.
- **The starter deck is original content.** Poetry for Neanderthals is
  Exploding Kittens'; do not add their card words.
