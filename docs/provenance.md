# Provenance & Upstream Heritage

Architectural history, original source attribution, and decoupling record for **ryankelly.dev** (`@rtkelly13/blog`).

---

## Original Source

This project originated as a fork of:
- **Upstream Project**: [`timlrx/tailwind-nextjs-starter-blog`](https://github.com/timlrx/tailwind-nextjs-starter-blog)
- **Author**: Timothy Lin ([@timlrx](https://github.com/timlrx))
- **Base Version**: `v1.1.0` (Pages Router, React 17/18, Tailwind CSS v3, `mdx-bundler`)
- **License**: MIT License (retained in [`LICENSE`](../LICENSE))

---

## Architectural Decoupling & Evolution

Since forking from `v1.1.0`, the codebase has evolved into a bespoke personal content and interactive presentation platform:

### 1. Framework & Core Runtime
- Upgraded through successive Next.js releases to **Next.js 16 (Pages Router)** and **React 19** with Turbopack dev server.
- The package identity in `package.json` is decoupled to `@rtkelly13/blog`.

### 2. Design System & Theming
- Replaced the starter's default Tailwind Typography / light-dark styling with a **custom brutalist design system** ([`@rtkelly13/design-system`](../../design-system)).
- Implemented dual-mode styling (neon-terminal + sketch) using Tailwind CSS v4 tokens and theme ladders (see [`docs/design-system.md`](./design-system.md)).

### 3. Realtime Talk Platform
- Developed an interactive presentation platform backed by **[Convex](https://convex.dev)**:
  - Slide deck routes (`/talks/[slug]`)
  - Live participant interaction (`/live/[slug]`)
  - Presenter console & admin gate (`/admin`)
  - Real-time Q&A, polls, and audience emoji reactions

### 4. Testing & Verification Infrastructure
- Replaced standard Jest tests with **Vitest** for unit tests and **Playwright** for end-to-end testing.
- Built a Linux CI-based **visual regression test suite** with baseline diffing against production.
- Enforced strict SEO and route indexing audits (`scripts/audit-seo.mjs`, `lib/seo/routePolicy.mjs`).

### 5. Deployment Governance & Release Train
- Decoupled from default push-to-main auto-deployments to conserve Vercel Hobby tier quotas.
- Deployed via an automated release train (`release-train.yml`) gating production advancements on green CI and deployment health.

---

## Upstream Relationship & Reference

- **Reference Clone**: An upstream clone of `timlrx/tailwind-nextjs-starter-blog` is maintained in the personal code estate at [`tailwind-nextjs-starter-blog/`](../../tailwind-nextjs-starter-blog) for tracking architectural patterns.
- **Future Alignment**: Selective adoption of upstream v2 patterns (such as typed content collections and eventual App Router migration) is evaluated in [ADR 0006 (`docs/adr/0006-upstream-v2-alignment-content-layer-then-app-router.md`)](./adr/0006-upstream-v2-alignment-content-layer-then-app-router.md).

---

## Attribution Notice

```text
Portions of this software are derived from tailwind-nextjs-starter-blog
Copyright (c) 2021 Timothy Lin
Licensed under the MIT License.
```
