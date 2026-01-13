# Specification: Upgrade Project Dependencies

## Goal
Upgrade the project's core dependencies to their latest stable versions to ensure security, performance, and access to modern features.

## Current State
- **Next.js:** 11.1.0
- **React:** 17.0.2
- **Tailwind CSS:** 2.2.2
- **TypeScript:** 4.3.5

## Target State
- **Next.js:** Latest Stable (e.g., v14.x or v15.x)
- **React:** Latest Stable (e.g., v18.x or v19.x)
- **Tailwind CSS:** Latest Stable (e.g., v3.x or v4.x)
- **TypeScript:** Latest Stable

## Key Changes
1.  **Framework Upgrade:** Migrate from Next.js 11 to the latest version. This may involve changes to `next.config.js`, routing (though Pages router is likely still supported, App router is optional), and image optimization.
2.  **Library Upgrade:** Migrate React 17 to the latest version, ensuring compatibility with the new Next.js version.
3.  **Styling Upgrade:** Migrate Tailwind CSS 2 to the latest version. This will require updating `tailwind.config.js` and potentially JIT engine configuration.
4.  **Tooling:** Update TypeScript, ESLint, and Prettier to compatible versions.

## Risks & Constraints
- **Breaking Changes:** Major version bumps often introduce breaking changes.
- **MDX Compatibility:** `next-mdx-remote` or `mdx-bundler` might need updates or replacements if the API has changed significantly.
- **Styling Regressions:** Tailwind upgrades can sometimes shift specific utility behaviors.

## Success Criteria
- All dependencies are updated to their latest stable major versions.
- The project builds successfully (`npm run build`).
- The development server starts without errors (`npm run dev`).
- All existing tests pass.
- Visual inspection confirms no major layout breakages.
