# Plan: Upgrade Project Dependencies

## Phase 1: Analysis & Preparation
- [ ] Task: Audit current dependencies and read migration guides for Next.js (11->14+), React (17->18+), and Tailwind (2->3+).
- [ ] Task: Run existing tests and build to establish a baseline. Ensure the project is stable before starting.
- [ ] Task: Conductor - User Manual Verification 'Analysis & Preparation' (Protocol in workflow.md)

## Phase 2: Core Framework Upgrade (React & Next.js)
- [ ] Task: Upgrade React and ReactDOM to the latest stable versions.
- [ ] Task: Upgrade Next.js to the latest stable version.
- [ ] Task: Update `next.config.js` and `jsconfig.json`/`tsconfig.json` as required by the new Next.js version.
- [ ] Task: Verify the application boots (`npm run dev`) and basic pages render. Fix any immediate startup crashes.
- [ ] Task: Run unit tests and fix any failures related to React/Next.js upgrades.
- [ ] Task: Conductor - User Manual Verification 'Core Framework Upgrade (React & Next.js)' (Protocol in workflow.md)

## Phase 3: Content & MDX Compatibility
- [ ] Task: Upgrade `mdx-bundler` and related remark/rehype plugins to versions compatible with the new Next.js/React stack.
- [ ] Task: Verify blog post rendering. Ensure MDX content, syntax highlighting, and embedded components still work.
- [ ] Task: Conductor - User Manual Verification 'Content & MDX Compatibility' (Protocol in workflow.md)

## Phase 4: Styling Upgrade (Tailwind CSS)
- [ ] Task: Upgrade Tailwind CSS, PostCSS, and Autoprefixer to latest versions.
- [ ] Task: Update `tailwind.config.js` to the new format (e.g., enabling JIT if not already default, updating content paths).
- [ ] Task: Verify visual styles across key pages (Home, Blog Post, Tags). Fix any visual regressions.
- [ ] Task: Conductor - User Manual Verification 'Styling Upgrade (Tailwind CSS)' (Protocol in workflow.md)

## Phase 5: Tooling & Finalization
- [ ] Task: Upgrade TypeScript, ESLint, Prettier, and Husky to latest compatible versions.
- [ ] Task: Run a full project build (`npm run build`) to ensure production readiness.
- [ ] Task: Run full test suite and linting checks.
- [ ] Task: Conductor - User Manual Verification 'Tooling & Finalization' (Protocol in workflow.md)
