# TESTS

## OVERVIEW

Playwright for E2E + visual regression, Vitest for unit tests, Storybook for component tests.

## STRUCTURE

```
tests/
├── e2e.spec.ts             # Functional E2E tests
├── visual.spec.ts          # Visual regression (snapshots)
├── visual-responsive.spec.ts # Responsive visual tests
├── responsive.spec.ts      # Responsive functional tests
├── scroll-buttons.spec.ts  # BlogActions behavior
├── feeds.spec.ts           # RSS feed validation
├── frontmatter.spec.ts     # MDX frontmatter validation
├── tag-validation.spec.ts  # Tag consistency checks
├── blog-upgrade.spec.ts    # Reading-time tests
├── experiments.spec.ts     # Experiments page tests
├── talk-deck.spec.ts       # Talk deck smoke + visual (pinned to e2e-debug-deck; Linux-only)
├── theme-engine.test.ts    # Vitest unit test
├── talk-metadata.test.ts   # Vitest unit: talk front-matter validation + loading
├── references.test.ts      # Vitest unit: bibliography extraction + citation markers
├── toast-profanity.test.ts # Vitest unit: profanity mask/flag (convex/lib/profanity)
└── __snapshots__/          # Visual baseline images
```

## TEST RUNNERS

| Runner     | Config                 | Command         | Scope           |
| ---------- | ---------------------- | --------------- | --------------- |
| Playwright | `playwright.config.ts` | `pnpm test:e2e` | E2E, visual     |
| Vitest     | `vitest.config.ts`     | `pnpm test`     | Unit, Storybook |

## VISUAL SNAPSHOTS

**Platform-specific**: Snapshots generated on Linux (CI). Tests skip on macOS/Windows.

**Update flow:**

```bash
# Option 1 (PRs): comment on the PR — CI regenerates AND commits the
# snapshots back to the branch for you (update-snapshots-command.yml).
/update-snapshots

# Option 2: trigger CI, then pull the artifact down locally
pnpm test:update-snapshots

# Option 3: manual via GitHub Actions
gh workflow run playwright.yml --ref <branch> -f update_snapshots=true

# For options 2 & 3, download and commit the regenerated files
gh run download <run-id> -n playwright-snapshots
cp -r playwright-snapshots/* tests/__snapshots__/
git add tests/__snapshots__ && git commit
```

Option 1 is human-gated on purpose: you only comment `/update-snapshots` once
you've confirmed the visual diff is intentional, so a genuine regression still
fails the gate rather than being auto-absorbed.

**Snapshot path template:**

```
tests/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}
```

## REGRESSION VS DEPLOYED MAIN

**File:** `visual-vs-deployed.spec.ts` · **Config:** `playwright.regression.config.ts` · **Command:** `pnpm test:regression`

Use this to verify a change (e.g. a dependency/Tailwind upgrade) does **not** alter
rendered output compared to what is live on `main`.

**How it differs from `visual.spec.ts`:** the snapshot suite diffs against committed
Linux baselines, so it only runs in CI. This suite renders **both** the local build and
the **live production site** in the same browser on the same machine, then pixel-diffs
the two. Because both sides share a renderer, platform/font differences cancel out — so
it runs locally on macOS and any remaining diff is a genuine styling change.

```bash
pnpm build              # build the version you want to check
pnpm test:regression    # boots `pnpm serve`, diffs local vs https://ryankelly.dev
```

**Page tiers:**

| Tier             | Pages                          | Tolerance | Runs by default            |
| ---------------- | ------------------------------ | --------- | -------------------------- |
| Content-stable   | `/about`, `/404`, a published post | 1%    | yes — any diff = regression |
| Content-dependent | `/`, `/blog`, `/tags`         | 10%       | only with `REGRESSION_ALL=1` |

Content-dependent pages differ legitimately (drafts hidden locally, fewer posts), so
they are opt-in and given a looser tolerance.

**Env overrides:** `REGRESSION_BASE_URL` (deployed target, default `https://ryankelly.dev`),
`REGRESSION_LOCAL_URL` (default `http://localhost:3000`), `REGRESSION_ALL=1` (include
content-dependent pages).

Each test attaches `deployed-main`, `local-build`, and `diff` PNGs to the HTML report
(`pnpm exec playwright show-report`) so any failure is visually diagnosable.

## KEY TEST PATTERNS

### Visual tests (visual.spec.ts)

```typescript
test("Homepage - Light", async ({ page }) => {
  test.skip(process.platform !== "linux", "Snapshots are Linux-only");
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage-light.png");
});
```

### E2E tests (e2e.spec.ts)

```typescript
test("Navigate to blog post", async ({ page }) => {
  await page.goto("/blog");
  await page.click("article a");
  await expect(page).toHaveURL(/\/blog\/.+/);
});
```

### Frontmatter validation (frontmatter.spec.ts)

Validates all MDX files have required fields: `title`, `date`, `tags`.

## CI WORKFLOW

```yaml
# .github/workflows/playwright.yml
on:
  deployment_status: # Triggered by Vercel success
  workflow_dispatch: # Manual with update_snapshots option
```

Tests run AFTER Vercel deployment completes.

**Draft visibility**: Branches matching `drafts/*` get `SHOW_DRAFTS=true`.

## CONVENTIONS

- `*.spec.ts` - Playwright tests (matched by testMatch)
- `*.test.ts` - Vitest unit tests
- Visual tests check both light and dark themes
- Tolerance: `maxDiffPixelRatio: 0.002`

## DEBUGGING

```bash
# Run single test file
pnpm exec playwright test tests/e2e.spec.ts

# Run with UI
pnpm exec playwright test --ui

# View report
pnpm exec playwright show-report
```
