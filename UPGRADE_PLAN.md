# Remaining Upgrade Plan

This document outlines the remaining dependency upgrades and migrations that require additional consideration or testing.

## Completed (Phase 1 & 2)

### Removed Unused Packages
- `remark-autolink-headings` - Not imported; `rehype-autolink-headings` used instead
- `remark-footnotes` - Not imported anywhere
- `remark-slug` - Not imported; `rehype-slug` used instead
- `tailwind` - Deprecated package; `tailwindcss` is the actual dependency
- `unist` - Deprecated; only `@types/unist` needed
- `@types/tailwindcss` - Deprecated; Tailwind v3+ has built-in types

### Upgraded Dependencies
| Package | From | To |
|---------|------|-----|
| `@next/bundle-analyzer` | 11.0.1 | 16.1.1 |
| `@svgr/webpack` | 5.5.0 | 8.1.0 |
| `@types/react` | 17.0.90 | 19.2.8 |
| `next-themes` | 0.0.14 | 0.4.6 |
| `sharp` | 0.28.3 | 0.34.5 |
| `image-size` | 1.0.0 | 2.0.2 |
| `reading-time` | 1.3.0 | 1.5.0 |
| `lint-staged` | 11.2.6 | 16.2.7 |
| `dedent` | 0.7.0 | 1.7.1 |
| `next-remote-watch` | 1.0.0 | 2.0.0 |
| `cross-env` | 7.0.3 | 10.1.0 |

---

## Medium Risk Upgrades (Require Testing)

### inquirer 8.2.7 -> 13.2.0
- **Used in:** Unknown (check scripts)
- **Risk:** Medium - ESM-only in v9+
- **Breaking Change:** Requires ESM imports
- **Recommendation:** Keep at 8.x unless scripts need updating
- **Command:** `pnpm add -D inquirer@13.2.0`

### globby 11.0.3 -> 16.1.0
- **Used in:** `scripts/generate-sitemap.js`
- **Risk:** High - ESM-only in v12+
- **Breaking Change:** Requires converting script to ESM or using dynamic import
- **Recommendation:** Keep at 11.x OR convert sitemap script to ESM
- **Command:** `pnpm add -D globby@16.1.0`

---

## High Risk Upgrades (Major Migrations)

### Tailwind CSS 3.4.19 -> 4.x

**Risk Level:** High  
**Effort:** Significant (4-8 hours)

Tailwind CSS v4 is a major rewrite with breaking changes:

#### Required Changes:
1. **Remove `tailwind.config.js`** - Config moves to CSS
2. **Update PostCSS config** - Add `@tailwindcss/postcss`
3. **Migrate theme to CSS** - Use CSS variables instead of JS config
4. **Update plugins:**
   - `@tailwindcss/forms` -> Check v4 compatibility
   - `@tailwindcss/typography` -> Check v4 compatibility
5. **Review all custom utilities** - Syntax may have changed

#### New Dependencies:
```bash
pnpm add @tailwindcss/postcss@4.x tailwindcss@4.x
pnpm add @tailwindcss/forms@latest @tailwindcss/typography@latest
```

#### Migration Steps:
1. Read official upgrade guide: https://tailwindcss.com/docs/upgrade-guide
2. Run the official upgrade tool if available
3. Update `postcss.config.js`:
   ```js
   module.exports = {
     plugins: {
       '@tailwindcss/postcss': {},
     },
   }
   ```
4. Convert `tailwind.config.js` to CSS-based config in `css/tailwind.css`
5. Test all pages for styling regressions

#### Reference:
- Upgrade Guide: https://tailwindcss.com/docs/upgrade-guide
- Template v2.4.0 uses Tailwind v4: https://github.com/timlrx/tailwind-nextjs-starter-blog

---

## Optional: Adopt Template v2.4.0 Architecture

The upstream template has evolved significantly. Consider these optional migrations:

### Contentlayer2 for Content Management
- **Current:** Custom MDX bundler setup in `lib/mdx.ts`
- **Template uses:** `contentlayer2` + `next-contentlayer2`
- **Benefits:** Better DX, type-safe content, faster builds
- **Effort:** High (requires restructuring content pipeline)

#### Packages:
```bash
pnpm add contentlayer2 next-contentlayer2
```

### Pliny Library
- **Template uses:** `pliny` for newsletter, comments, analytics, search
- **Benefits:** Abstracted implementations, less custom code
- **Current:** Custom implementations for these features

#### Packages:
```bash
pnpm add pliny
```

### App Router Migration
- **Current:** Pages Router (`pages/`)
- **Template uses:** App Router (`app/`)
- **Benefits:** Server Components, better layouts, streaming
- **Effort:** Very High (complete restructure)
- **Recommendation:** Only if planning major refactor

---

## Recommended Order of Execution

1. **Tailwind v4 migration** (4-8 hours) - High value, modernizes styling
2. **globby/inquirer** - Only if needed for other changes
3. **Contentlayer adoption** - Optional, only if wanting template parity

---

## Notes

- Always run `pnpm run build` and `pnpm exec playwright test` after each upgrade
- Deploy to Vercel preview before merging to production
- The template is at v2.4.0, this project forked from an earlier version
- Some template features (App Router, Contentlayer) would require significant refactoring
