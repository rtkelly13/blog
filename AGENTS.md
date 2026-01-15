# AGENTS.md

> Comprehensive guide for AI agents working on this blog project.

## Project Overview

| Property       | Value                             |
| -------------- | --------------------------------- |
| **Project**    | Personal blog for Ryan Kelly      |
| **Live URL**   | https://ryankelly.dev             |
| **Repository** | https://github.com/rtkelly13/blog |
| **Framework**  | Next.js 16.x with React 19        |
| **Language**   | TypeScript                        |
| **Styling**    | Tailwind CSS v4                   |
| **Content**    | MDX (Markdown + React components) |
| **Hosting**    | Vercel (automatic deployments)    |
| **Comments**   | Giscus (GitHub Discussions)       |

## Tech Stack

### Core Dependencies

- **Next.js** `^16.1.1` - React framework with SSG/SSR
- **React** `^19.2.3` - UI library
- **Tailwind CSS** `^4.1.18` - Utility-first CSS (v4 with new `@import` syntax)
- **MDX Bundler** `^10.1.1` - MDX processing
- **KBar** `0.1.0-beta.48` - Command palette (Cmd+K)

### Development Tools

- **Package Manager:** pnpm (v10+)
- **Linting/Formatting:** Biome
- **Testing:** Playwright (e2e + visual regression)
- **Git Hooks:** Husky + lint-staged
- **CI/CD:** GitHub Actions + Vercel

### Key Configuration Files

| File                   | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `tailwind.config.js`   | Tailwind theme and plugins                               |
| `postcss.config.js`    | PostCSS with `@tailwindcss/postcss`                      |
| `css/tailwind.css`     | Main CSS with `@import`, `@plugin`, `@config` directives |
| `data/siteMetadata.js` | Site configuration (title, socials, analytics, comments) |
| `next.config.js`       | Next.js configuration                                    |
| `biome.json`           | Linting and formatting rules                             |
| `playwright.config.ts` | E2E test configuration                                   |

## Development Commands

### Setup

```bash
pnpm install              # Install dependencies
```

### Daily Development

```bash
pnpm dev                  # Start dev server (http://localhost:3000)
pnpm build                # Production build (includes sitemap, search index, tag RSS)
pnpm serve                # Serve production build locally
```

### Testing

```bash
pnpm test:e2e             # Run all Playwright tests
pnpm test:e2e:watch       # Run tests in watch mode
pnpm test:update-snapshots # Update visual regression snapshots
```

### Code Quality

```bash
pnpm lint                 # Run Biome linter
pnpm format               # Format code with Biome
```

### Analysis

```bash
pnpm analyze              # Analyze bundle size
```

## Complete Development Workflow

The standard workflow for any feature or fix follows these steps:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Branch    │───▶│    Plan     │───▶│   Develop   │───▶│    Build    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐           ▼
│   Rebase    │◀───│   Verify    │◀───│   Deploy    │◀───┌─────────────┐
└─────────────┘    └─────────────┘    └─────────────┘    │    Test     │
       │                                                  └─────────────┘
       ▼
┌─────────────┐
│    Merge    │
└─────────────┘
```

---

### Step 1: Branch Creation

Create a feature branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b <branch-name>
```

**Branch Naming Conventions:**
| Pattern | Use Case | Example |
|---------|----------|---------|
| `feature/<name>` | New features | `feature/dark-mode-toggle` |
| `fix/<name>` | Bug fixes | `fix/mobile-nav-overflow` |
| `chore/<name>` | Maintenance tasks | `chore/update-dependencies` |
| `<type>-<description>` | General pattern | `tailwind-v4-upgrade` |

---

### Step 2: Planning

For complex tasks, break down the work before starting:

- Create a task breakdown if implementing multiple changes
- For upgrades/migrations, list all files requiring changes and note breaking changes
- Consider writing tests first (TDD approach)

---

### Step 3: Feature Development

Follow Test-Driven Development (TDD) when applicable:

1. **Write failing tests** (Red phase)
2. **Implement minimum code** to pass tests (Green phase)
3. **Refactor** while keeping tests green

**Commit frequently with conventional commits:**

```bash
git commit -m "feat: Add scroll to top button"
git commit -m "fix: Correct border color in dark mode"
git commit -m "chore: Update Tailwind to v4"
git commit -m "test: Add visual regression tests for homepage"
git commit -m "ci: Trigger tests after Vercel deployment"
```

**Commit Message Format:**

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

---

### Step 4: Local Build

Run the full production build:

```bash
pnpm run build
```

This command:

1. Runs `next build` (Turbopack)
2. Generates sitemap (`scripts/generate-sitemap.mjs`)
3. Generates search index (`scripts/generate-search.mjs`)
4. Generates per-tag RSS feeds (`scripts/generate-tag-rss.mjs`)

**Expected output:**

```
✓ Compiled successfully
✓ Generating static pages
Route (pages)
├ ● /
├ ● /about
├ ● /blog
├ ● /blog/[...slug]
├ ● /tags
└ ● /tags/[tag]
Search index generated: X posts
Generated N tag RSS feeds
```

---

### Step 5: Local Testing

Run the full test suite:

```bash
pnpm test:e2e
```

**Test Structure:**

- `tests/e2e.spec.ts` - Functional tests (12 tests)
- `tests/visual.spec.ts` - Visual regression tests (12 tests)
- `tests/__snapshots__/` - Baseline screenshots

**Expected output:**

```
Running 24 tests using 4 workers
✓ [chromium] › tests/e2e.spec.ts - Homepage, Blog, Tags, etc.
✓ [chromium] › tests/visual.spec.ts - Visual snapshots (light/dark)
24 passed
```

**If visual tests fail due to intentional changes:**

```bash
pnpm test:update-snapshots
```

---

### Step 6: Push & Deploy

Push the branch to trigger Vercel preview deployment:

```bash
git push -u origin <branch-name>
```

Vercel automatically:

1. Detects the push
2. Builds the site
3. Deploys to a preview URL
4. Reports status back to GitHub

---

### Step 7: Verify Deployment

Check deployment status using GitHub CLI:

```bash
# Check commit status (includes Vercel deployment)
gh api repos/rtkelly13/blog/commits/<branch>/status \
  --jq '{state: .state, statuses: [.statuses[] | {context, state}]}'

# Expected successful response:
# {"state":"success","statuses":[{"context":"Vercel","state":"success"}]}
```

**Wait for deployment if pending:**

```bash
# Poll until success
sleep 30 && gh api repos/rtkelly13/blog/commits/<branch>/status --jq '.state'
```

---

### Step 8: CI Tests

The Playwright workflow triggers automatically after Vercel deployment succeeds.

**Monitor the CI run:**

```bash
# List recent runs
gh run list --workflow=playwright.yml --limit 5

# Watch a specific run
gh run watch <run-id> --exit-status
```

**Workflow triggers:**
| Event | Condition | Action |
|-------|-----------|--------|
| `deployment_status` | `state == 'success'` | Run tests |
| `workflow_dispatch` | Manual trigger | Run tests (optionally update snapshots) |

**If visual tests fail in CI:**

```bash
# Trigger snapshot update via workflow_dispatch
gh workflow run playwright.yml --ref <branch> -f update_snapshots=true

# Wait for completion, then download updated snapshots
gh run download <run-id> -n playwright-snapshots -D /tmp/snapshots

# Copy to project and commit
cp -r /tmp/snapshots/visual.spec.ts/* tests/__snapshots__/visual.spec.ts/
git add tests/__snapshots__/
git commit -m "test: Update visual snapshots"
git push
```

---

### Step 9: Rebase onto Main

Before merging, rebase to incorporate any changes to main:

```bash
git checkout main
git pull origin main
git checkout <branch-name>
git rebase main
```

**If conflicts occur:**

1. Resolve conflicts in each file
2. `git add <resolved-files>`
3. `git rebase --continue`
4. Re-run build and tests after rebase

---

### Step 10: Merge to Main

Once CI passes and rebase is complete:

```bash
git checkout main
git merge <branch-name>
git push origin main
```

This triggers:

1. Vercel production deployment
2. CI tests on main branch

**Verify production:**

```bash
# Check deployment status
gh api repos/rtkelly13/blog/commits/main/status --jq '.state'

# Check the live site
open https://ryankelly.dev
```

---

## CI/CD Architecture

```
Push to Branch
      │
      ▼
┌─────────────────┐
│  Vercel Build   │ (automatic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Preview Deploy  │
└────────┬────────┘
         │ deployment_status: success
         ▼
┌─────────────────┐
│ GitHub Actions  │ (playwright.yml)
│  - Build        │
│  - E2E Tests    │
│  - Visual Tests │
└────────┬────────┘
         │
         ▼
   ┌───────────┐
   │  Results  │
   └───────────┘
```

**Key File:** `.github/workflows/playwright.yml`

---

## Quality Gates

Before merging, ensure:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test:e2e` passes (24 tests: 12 functional + 12 visual)
- [ ] `pnpm lint` reports no errors
- [ ] Vercel preview deployment succeeds
- [ ] CI workflow passes after deployment
- [ ] No security vulnerabilities (avoid committing `.env`, credentials)

---

## Common Operations

### Adding a New Blog Post

1. Create MDX file in `data/blog/<slug>.mdx` or `data/blog/<folder>/index.mdx`
2. Add frontmatter:
   ```yaml
   ---
   title: "Post Title"
   date: "2026-01-15"
   tags: ["tag1", "tag2"]
   draft: false
   summary: "Brief description"
   ---
   ```
3. Write content using MDX (Markdown + React components)
4. Run `pnpm build` to generate search index and tag feeds
5. Test locally with `pnpm dev`

### Updating Site Metadata

Edit `data/siteMetadata.js`:

- `title`, `author`, `description` - Basic info
- `siteUrl` - Production URL
- `socialBanner` - OpenGraph image
- `analytics` - Google Analytics, Plausible, etc.
- `comment` - Giscus/Utterances/Disqus config
- `newsletter` - Buttondown config (disabled by default)
- `stickyNav` - Enable/disable sticky navigation

### Updating Visual Snapshots

When UI changes are intentional:

```bash
# Locally
pnpm test:update-snapshots
git add tests/__snapshots__/
git commit -m "test: Update visual snapshots for <change>"

# Or via CI
gh workflow run playwright.yml --ref <branch> -f update_snapshots=true
# Then download and commit as shown in Step 8
```

### Checking GitHub Actions Status

```bash
# List recent workflow runs
gh run list --limit 10

# View specific run
gh run view <run-id>

# View failed logs
gh run view <run-id> --log-failed

# Watch run in real-time
gh run watch <run-id>
```

### Checking Vercel Deployments

```bash
# Via commit status
gh api repos/rtkelly13/blog/commits/<ref>/status

# Via deployments API
gh api repos/rtkelly13/blog/deployments --jq '.[0:3]'
```

---

## Project Structure

```
blog/
├── .github/workflows/     # CI workflows
│   └── playwright.yml     # E2E tests (triggered by Vercel)
├── components/            # React components
├── css/
│   └── tailwind.css       # Main CSS (Tailwind v4 imports)
├── data/
│   ├── blog/              # MDX blog posts
│   ├── authors/           # Author profiles
│   ├── headerNavLinks.ts  # Navigation config
│   └── siteMetadata.js    # Site configuration
├── layouts/               # Page layouts (PostLayout, ListLayout, etc.)
├── lib/                   # Utility functions
├── pages/                 # Next.js pages
├── public/                # Static assets
├── scripts/               # Build scripts (sitemap, search, RSS)
├── tests/
│   ├── e2e.spec.ts        # Functional tests
│   ├── visual.spec.ts     # Visual regression tests
│   └── __snapshots__/     # Baseline screenshots
├── AGENTS.md              # This file
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind configuration
└── tsconfig.json          # TypeScript configuration
```

---

## Troubleshooting

### Build Fails

```bash
# Clear Next.js cache and rebuild
rm -rf .next
pnpm build
```

### Tests Fail Locally but Pass in CI (or vice versa)

- Visual tests are platform-dependent (fonts, rendering)
- Always update snapshots in CI environment for consistency
- Use `gh workflow run` with `update_snapshots=true`

### Vercel Deployment Pending Too Long

```bash
# Check Vercel status
gh api repos/rtkelly13/blog/commits/<ref>/statuses \
  --jq '.[] | select(.context == "Vercel") | {state, description}'
```

### CI Workflow Not Triggering

- Ensure `deployment_status` event is enabled in workflow
- Check that Vercel GitHub integration is connected
- Verify branch is pushed to remote

### Tailwind CSS v4 Issues

- Uses `@import "tailwindcss"` instead of `@tailwind` directives
- Plugins via `@plugin "@tailwindcss/typography"`
- Config via `@config "../tailwind.config.js"`
- PostCSS uses `@tailwindcss/postcss` instead of `tailwindcss`

---

## Example Workflow: Feature Implementation

Here's a complete example implementing a new feature:

```bash
# 1. Branch
git checkout main && git pull
git checkout -b feature/reading-progress-bar

# 2. Develop (with tests)
# ... write tests in tests/e2e.spec.ts
# ... implement in components/ReadingProgress.tsx
# ... add to layouts/PostLayout.tsx

# 3. Build & Test Locally
pnpm build
pnpm test:e2e

# 4. Commit
git add .
git commit -m "feat: Add reading progress bar to blog posts"

# 5. Push
git push -u origin feature/reading-progress-bar

# 6. Wait for Vercel
sleep 45
gh api repos/rtkelly13/blog/commits/feature/reading-progress-bar/status --jq '.state'
# → "success"

# 7. Monitor CI
gh run list --workflow=playwright.yml --limit 1
gh run watch <run-id> --exit-status
# → ✓ All tests passed

# 8. Rebase
git checkout main && git pull
git checkout feature/reading-progress-bar
git rebase main

# 9. Merge
git checkout main
git merge feature/reading-progress-bar
git push

# 10. Verify Production
gh api repos/rtkelly13/blog/commits/main/status --jq '.state'
open https://ryankelly.dev
```

---

_Last updated: January 2026_
