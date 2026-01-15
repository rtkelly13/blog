# Upgrade Plan

This document outlines the dependency upgrades and migrations for this blog project, organized by phase.

---

## Phase 1: Quick Patches (Completed)

Low-risk patch/minor updates.

| Package                 | From   | To     | Date     |
| ----------------------- | ------ | ------ | -------- |
| `next`                  | 16.1.1 | 16.1.2 | Jan 2026 |
| `@next/bundle-analyzer` | 16.1.1 | 16.1.2 | Jan 2026 |
| `prettier`              | 3.7.4  | 3.8.0  | Jan 2026 |

---

## Phase 2: ESM Modernization (Completed)

Upgraded ESM-only packages and converted all build scripts from CommonJS to ES Modules.

### Package Upgrades

| Package    | From   | To     | Date     |
| ---------- | ------ | ------ | -------- |
| `globby`   | 11.0.3 | 16.1.0 | Jan 2026 |
| `inquirer` | 8.2.7  | 13.2.0 | Jan 2026 |

### Script Conversions

All scripts converted from CommonJS (`.js`) to ES Modules (`.mjs`):

| Old File                      | New File                       | Purpose               |
| ----------------------------- | ------------------------------ | --------------------- |
| `scripts/generate-sitemap.js` | `scripts/generate-sitemap.mjs` | Sitemap generation    |
| `scripts/generate-search.js`  | `scripts/generate-search.mjs`  | Search index          |
| `scripts/generate-tag-rss.js` | `scripts/generate-tag-rss.mjs` | Tag RSS feeds         |
| `scripts/compose.js`          | `scripts/compose.mjs`          | Blog post scaffolding |

### Technical Notes

- Used `createRequire()` from `node:module` to import CommonJS `siteMetadata.js` from ESM scripts
- Used `fileURLToPath()` and `path.dirname()` to replace `__dirname` in ESM context
- Updated `package.json` build script to reference `.mjs` files

---

## Historical Upgrades (Previous Sessions)

| Package                 | From    | To     |
| ----------------------- | ------- | ------ |
| `@next/bundle-analyzer` | 11.0.1  | 16.1.1 |
| `@svgr/webpack`         | 5.5.0   | 8.1.0  |
| `@types/react`          | 17.0.90 | 19.2.8 |
| `next-themes`           | 0.0.14  | 0.4.6  |
| `sharp`                 | 0.28.3  | 0.34.5 |
| `image-size`            | 1.0.0   | 2.0.2  |
| `reading-time`          | 1.3.0   | 1.5.0  |
| `lint-staged`           | 11.2.6  | 16.2.7 |
| `dedent`                | 0.7.0   | 1.7.1  |
| `next-remote-watch`     | 1.0.0   | 2.0.0  |
| `cross-env`             | 7.0.3   | 10.1.0 |
| `tailwindcss`           | 3.4.x   | 4.1.18 |

### Removed Unused Packages

- `remark-autolink-headings` - Not imported; `rehype-autolink-headings` used instead
- `remark-footnotes` - Not imported anywhere
- `remark-slug` - Not imported; `rehype-slug` used instead
- `tailwind` - Deprecated package; `tailwindcss` is the actual dependency
- `unist` - Deprecated; only `@types/unist` needed
- `@types/tailwindcss` - Deprecated; Tailwind v3+ has built-in types

---

## Phase 3: Template Alignment (Optional Future)

Major architectural changes to align with upstream [tailwind-nextjs-starter-blog v2.4.0](https://github.com/timlrx/tailwind-nextjs-starter-blog).

### Current vs Template Comparison

| Feature          | This Project            | Template v2.4.0     |
| ---------------- | ----------------------- | ------------------- |
| **Router**       | Pages Router (`pages/`) | App Router (`app/`) |
| **Content**      | Custom MDX bundler      | Contentlayer2       |
| **Abstractions** | Custom implementations  | Pliny library       |
| **Linting**      | Biome                   | ESLint              |
| **React**        | 19.2.3                  | 19.0.0              |
| **Next.js**      | 16.x                    | 15.x                |
| **Tailwind**     | 4.1.18                  | 4.0.5               |

### Option A: App Router Migration

- **Effort:** 8-16 hours
- **Value:** High
- **Benefits:**
  - React Server Components
  - Better layouts with nested routing
  - Streaming SSR
  - Improved caching strategies

**When to consider:**

- When Pages Router enters maintenance mode
- When needing React Server Components
- When planning major site refactor

### Option B: Contentlayer2 Adoption

- **Effort:** 4-8 hours
- **Value:** Medium
- **Benefits:**
  - Type-safe content schemas
  - Faster builds with caching
  - Less custom MDX code

**Packages:**

```bash
pnpm add contentlayer2 next-contentlayer2
```

### Option C: Pliny Integration

- **Effort:** 2-4 hours
- **Value:** Low-Medium
- **Benefits:**
  - Abstracted newsletter/comments/analytics
  - Less custom code to maintain
  - Easier feature additions

**Packages:**

```bash
pnpm add pliny
```

---

## Known Issues

### kbar Peer Dependency Warning

```
kbar 0.1.0-beta.48
└─┬ react-virtual 2.10.4
  └── unmet peer react@"^16.6.3 || ^17.0.0": found 19.2.3
```

- **Status:** Non-blocking (warning only)
- **Impact:** None - kbar works correctly with React 19
- **Resolution:** Wait for kbar stable release with React 19 support

---

## Verification Checklist

After any upgrade:

- [ ] `pnpm build` succeeds
- [ ] `pnpm test:e2e` passes (12 functional tests)
- [ ] `pnpm lint` reports no errors
- [ ] Visual inspection in `pnpm dev`
- [ ] Deploy to Vercel preview before merging

---

## Current Package Status

All npm packages are now up to date:

```bash
$ pnpm outdated
# No outdated packages
```

---

_Last updated: January 2026_
