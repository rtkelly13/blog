# Provisioning secrets

Local-only source of truth for deployment secrets — the recovery path for
rebuilding any environment without archaeology. **Every `*.env` here is
gitignored; only this README is committed.** Full design: docs/auth.md §9.

One file per target, so pushing dev values at prod is structurally
impossible (and `pnpm provision convex-prod` refuses any `E2E`/`BYPASS` key
outright):

| File | Target | Push with |
|---|---|---|
| `convex.dev.env` | dev deployment (keen-shark-231) | `pnpm provision convex-dev` |
| `convex.prod.env` | prod (fiery-minnow-77) — **never** bypass keys | `pnpm provision convex-prod` |
| `convex.preview.env` | Convex project default env vars (previews inherit) | `pnpm provision convex-preview` (prints — dashboard-only) |
| `ci.env` | GitHub Actions repo secrets | `pnpm provision ci` |
| `vercel.preview.env` | Vercel Preview environment | `pnpm provision vercel-preview` |

Expected keys per file:

```
convex.dev.env:      AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (dev OAuth app),
                     SITE_URL=http://localhost:3002,
                     ADMIN_GITHUB_LOGINS, AUTH_E2E_BYPASS_SECRET
convex.prod.env:     AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (prod OAuth app),
                     SITE_URL=https://www.ryankelly.dev, ADMIN_GITHUB_LOGINS
convex.preview.env:  AUTH_E2E_BYPASS_SECRET, ADMIN_GITHUB_LOGINS
ci.env:              AUTH_E2E_BYPASS_SECRET, VERCEL_AUTOMATION_BYPASS_SECRET
vercel.preview.env:  CONVEX_DEPLOY_KEY (preview deploy key),
                     NEXT_PUBLIC_E2E_BYPASS_SECRET (arms the AdminGate
                     bypass button on preview builds; must equal the
                     AUTH_E2E_BYPASS_SECRET of whichever Convex deployment
                     previews point at — the shared dev deployment until
                     per-branch preview deployments are wired)
```

Deliberately excluded: `JWKS` / `JWT_PRIVATE_KEY` — per-deployment signing
keys Convex Auth generates itself; copying them between deployments is
wrong. If lost, re-run the Convex Auth setup for that deployment.

Rotation = edit the file, re-run the matching `pnpm provision` target(s).
If this directory is lost: values are recoverable from the live
deployments (`npx convex env list [--prod]`), the GitHub OAuth apps, and
the Vercel/Convex dashboards.
