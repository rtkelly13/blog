# Plan: Upgrade Project Dependencies

## Phase 1: Analysis & Preparation [checkpoint: e54016e]
- [x] Task: Audit current dependencies and read migration guides for Next.js (11->14+), React (17->18+), and Tailwind (2->3+).
- [x] Task: Run existing tests and build to establish a baseline. Ensure the project is stable before starting.
- [x] Task: Conductor - User Manual Verification 'Analysis & Preparation' (Protocol in workflow.md)

## Phase 2: Core Framework Upgrade (React & Next.js)
- [x] Task: Upgrade React and ReactDOM to the latest stable versions.
- [x] Task: Upgrade Next.js to the latest stable version.
- [x] Task: Update `next.config.js` and `jsconfig.json`/`tsconfig.json` as required by the new Next.js version.
- [x] Task: Verify the application boots (`npm run dev`) and basic pages render. Fix any immediate startup crashes.
- [x] Task: Run unit tests and fix any failures related to React/Next.js upgrades.
- [~] Task: Conductor - User Manual Verification 'Core Framework Upgrade (React & Next.js)' (Protocol in workflow.md)

## Phase 3: Content & MDX Compatibility
- [x] Task: Upgrade `mdx-bundler` and related remark/rehype plugins to versions compatible with the new Next.js/React stack.
- [x] Task: Verify blog post rendering. Ensure MDX content, syntax highlighting, and embedded components still work.
- [~] Task: Conductor - User Manual Verification 'Content & MDX Compatibility' (Protocol in workflow.md)

## Phase 3.5: Automated E2E Testing
- [x] Task: Install and configure Playwright for E2E testing.
- [x] Task: Create a basic E2E test to verify homepage, blog post rendering, and navigation.
- [x] Task: Execute E2E tests to validate the application runtime.
- [x] Task: Conductor - User Manual Verification 'Automated E2E Testing' (Protocol in workflow.md)

## Phase 4: Styling Upgrade (Tailwind CSS)
- [x] Task: Upgrade Tailwind CSS, PostCSS, and Autoprefixer to latest versions.
- [x] Task: Update `tailwind.config.js` to the new format (e.g., enabling JIT if not already default, updating content paths).
- [x] Task: Verify visual styles across key pages (Home, Blog Post, Tags). Fix any visual regressions.
- [x] Task: Conductor - User Manual Verification 'Styling Upgrade (Tailwind CSS)' (Protocol in workflow.md)

## Phase 5: Tooling & Finalization [checkpoint: c475833]
- [x] Task: Upgrade TypeScript, ESLint, Prettier, and Husky to latest compatible versions. (Note: Switched to Biome for better Next.js 16 compatibility)
- [x] Task: Run a full project build (`npm run build`) to ensure production readiness.
- [x] Task: Run full test suite and linting checks.
- [x] Task: Conductor - User Manual Verification 'Tooling & Finalization' (Protocol in workflow.md)
