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
├── blog-upgrade.spec.ts    # Migration tests
├── experiments.spec.ts     # Experiments page tests
├── theme-engine.test.ts    # Vitest unit test
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
# Option 1: Trigger CI workflow
pnpm test:update-snapshots

# Option 2: Manual via GitHub Actions
gh workflow run playwright.yml --ref <branch> -f update_snapshots=true

# Then download and commit
gh run download <run-id> -n playwright-snapshots
cp -r playwright-snapshots/* tests/__snapshots__/
git add tests/__snapshots__ && git commit
```

**Snapshot path template:**

```
tests/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}
```

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
