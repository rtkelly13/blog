# Authentication — design & operations

How auth works across the live-talk platform: the real GitHub OAuth flow,
the admin boundary, the E2E bypass, session initialisation for automation,
and how each environment (prod, dev, feature-branch previews, CI) gets an
authenticated admin. Decision history: [ADR-0004](adr/0004-preview-environments-and-auth.md)
(why previews couldn't do OAuth), [ADR-0005](adr/0005-e2e-auth-bypass-and-test-github-branch.md)
(the bypass + test-github split), PR #48 (implementation).

## 1. The model in one paragraph

Convex Auth (`@convex-dev/auth`) with a single real identity provider —
GitHub OAuth — plus an opt-in, test-only `e2e` credentials provider. Every
signed-in user gets a `users` row carrying `githubLogin`; **authorization is
a separate, server-side check**: `requireAdmin` (convex/lib/admin.ts)
allowlists `githubLogin` against the deployment's `ADMIN_GITHUB_LOGINS` env
var inside each presenter/admin mutation. The UI hides admin controls, but
the mutations are the security boundary — audience functions are public by
design and identity is enforced where writes happen.

## 2. The real flow: GitHub OAuth

- Provider: `convex/auth.ts` — GitHub, with a `profile()` mapping that
  stores `githubLogin` on the user row (that's what the allowlist keys on).
- The OAuth **callback URL lives on the Convex deployment**, not the web
  app: `https://<deployment>.convex.site/api/auth/callback/github`. Each
  environment that does real OAuth needs its own GitHub OAuth app registered
  to its deployment's `.convex.site` domain.
- After the callback, Convex Auth redirects the browser to the deployment's
  `SITE_URL` + `redirectTo`. **`SITE_URL` is single-valued** — one
  deployment can serve exactly one web origin's OAuth flow. This constraint
  drives most of the environment design below.

## 3. Environments

| Environment | Backend | Real OAuth | Bypass | Notes |
|---|---|---|---|---|
| Production (ryankelly.dev) | `fiery-minnow-77` (prod) | ✅ own OAuth app | ❌ **hard-coded impossible** | Bypass provider excluded by a source constant, not config |
| Local dev (localhost:3002) | `keen-shark-231` (dev) | ✅ own OAuth app | ✅ enabled | `SITE_URL=http://localhost:3002`; dev server **must run on 3002** |
| Feature-branch previews (Vercel) | Convex **preview deployments**, one per branch | ❌ (ephemeral callback URL — ADR-0004) | ✅ via project-default env vars; **sign-in button auto-offered** (`NEXT_PUBLIC_VERCEL_ENV === 'preview'`) | The recommended way to test feature branches — admin-gated pages (/ideas, /admin) are reachable on previews; see §6 |
| CI (live-e2e workflow) | dedicated E2E deployment (or a preview) | ❌ | ✅ | Secrets in GitHub Actions; job self-activates when provisioned |
| `test-github` branch | *none yet — deliberately* | (would be ✅) | ❌ hard-coded off in the client | Stable branch URL `https://my-blog-0j5s-git-test-github-rtkelly13s-projects.vercel.app` reserved for a pre-prod OAuth rehearsal env. With the per-ship prod OAuth check (§8) it may never be needed — dormant until decided |

## 4. The `e2e` bypass provider (shipped, PR #48)

`ConvexCredentials` provider in `convex/auth.ts`: exchanges a per-deployment
shared secret for a session as a synthetic user.

Layered guards, in order:

1. **Existence**: the provider is registered only when the deployment sets
   `AUTH_E2E_BYPASS_SECRET`. No var → the provider is not part of the auth
   config at all (`signIn('e2e', …)` is "provider not found").
2. **Production immunity**: hard-coded check against the prod deployment
   name (`fiery-minnow-77`) — a constant in source, deliberately not
   configuration. Setting the env var on prod does nothing.
3. **Secret check**: `params.secret` must equal the env var. Wrong secret →
   `tokens: null`. (Plain comparison; timing attacks over the public
   internet against a Convex action are not a realistic vector.)
4. **Authorization is still separate**: the synthetic user
   (`AUTH_E2E_BYPASS_LOGIN`, default `e2e-bypass`) gets admin only if that
   login is also on the deployment's `ADMIN_GITHUB_LOGINS`. A bypass session
   without the allowlist entry can do nothing an anonymous user can't.

Blast radius of a leaked secret: admin on ephemeral test backends (previews
expire in ~5 days; dev is clear-downable). Production is unreachable with or
without it. Rotation = change one env var (+ CI secret).

Implementation note: `retrieveAccount` **throws** `InvalidAccountId` for a
not-yet-created account (the docs say it returns null — they're wrong); the
provider catches and falls through to `createAccount`.

### Current client affordance (to be removed)

The first iteration renders an "E2E dev sign-in" button on the AdminGate
wall when built with `NEXT_PUBLIC_E2E_BYPASS=1` — or **automatically on any
Vercel preview build** (`NEXT_PUBLIC_VERCEL_ENV === 'preview'`; ADR-0004's
recommended preview-bypass path), so feature-branch previews can view the
admin-gated pages (/ideas, /admin). It reads the secret from
`NEXT_PUBLIC_E2E_BYPASS_SECRET` (set in the Vercel Preview env —
`pnpm provision vercel-preview`; until per-branch preview deployments are
wired, previews point at the shared **dev** deployment, so the value must
equal dev's `AUTH_E2E_BYPASS_SECRET`) — i.e. **the secret is embedded in
those bundles**. Acceptable for dev/CI (the secret is worthless against prod) but
it's a view-source leak on any publicly reachable preview. The session-init
CLI (§5) supersedes it; once that lands, the button and both `NEXT_PUBLIC_*`
vars are deleted and test bundles become byte-identical to production's.

## 5. Session initialisation CLI (design — supersedes the button)

**Goal: the secret never enters any page context.** The insight making this
trivial: the `auth:signIn` action, invoked server-to-server, returns the
session tokens directly (`{ tokens: { token, refreshToken } }`), and the
`@convex-dev/auth` browser client keeps its session in `localStorage`. So a
Node script can do the entire authentication and hand the browser a
ready-made session.

### Mechanics

1. **Exchange** (Node → Convex, no browser):
   `new ConvexHttpClient(convexUrl)` →
   `client.action(api.auth.signIn, { provider: 'e2e', params: { secret } })`
   → JWT + refresh token. Secret comes from the caller's env, never a bundle.
2. **Seed** (before the app loads): write the tokens into the target
   origin's `localStorage` under the auth client's keys. Verified key
   format (`@convex-dev/auth` react client):

   ```
   __convexAuthJWT_<ns>          = <jwt>
   __convexAuthRefreshToken_<ns> = <refreshToken>
   ```

   where `<ns>` is the Convex deployment URL with all non-alphanumerics
   stripped (`url.replace(/[^a-zA-Z0-9]/g, '')` — e.g.
   `https://keen-shark-231.eu-west-1.convex.cloud` →
   `httpskeenshark231euwest1convexcloud`). This is the design's one coupling
   to a library internal; the script should assert sign-in actually worked
   (admin page shows "Signed in as") so a key-format change fails loudly.
3. **Load** `/admin` — the app hydrates already authenticated.

### CLI shape (`scripts/e2e-session.mjs`, `pnpm signin:e2e`)

```
pnpm signin:e2e <app-url> [--convex-url <url>] [--cdp <port>] [--print]
```

- `<app-url>`: the target (localhost:3002, or a preview's branch URL).
- `--convex-url`: the backing deployment; when omitted, **discovered by
  fetching the app and extracting the `*.convex.cloud` address from the
  served bundle** — works for any preview without dashboard access.
- Default mode: launch a headed browser (Playwright chromium), seed, open
  `/admin` signed in — the human path ("let me poke at this preview").
- `--cdp <port>`: seed an already-running browser over CDP (agent-browser /
  harness path).
- `--print`: just output the tokens as JSON (composable).
- Secret from `AUTH_E2E_BYPASS_SECRET` in the caller's env.
- If Vercel Deployment Protection is enabled (§7), the script sends the
  `x-vercel-protection-bypass` header when fetching, from
  `VERCEL_AUTOMATION_BYPASS_SECRET`.

### Consumers

- **live-e2e harness** (`E2E_BYPASS=1`): imports the same exchange+seed
  functions instead of clicking the button; works against localhost or a
  preview URL unchanged.
- **CI**: the workflow no longer needs `NEXT_PUBLIC_*` build vars — only
  `AUTH_E2E_BYPASS_SECRET` (and optionally the Vercel bypass header secret).
- **Humans**: `pnpm signin:e2e <preview-url>` replaces the button.

## 6. Feature branches (Vercel previews) — the recommended flow

Per-branch, zero-setup, isolated full-stack environments:

1. **One-time wiring**: mint a Convex *preview* deploy key → Vercel Preview
   env `CONVEX_DEPLOY_KEY`; build command `npx convex deploy --cmd 'pnpm build'`
   (injects the fresh backend's URL into the build). Set **project-default
   env vars** in Convex (`npx convex env default` / dashboard):
   `AUTH_E2E_BYPASS_SECRET`, `ADMIN_GITHUB_LOGINS=rtkelly13,e2e-bypass`.
2. **Every push**: Vercel builds the branch; Convex creates/refreshes a
   preview deployment named for the branch, inheriting the defaults — so the
   bypass is armed on every preview automatically. Previews expire after ~5
   days' inactivity (free tier).
3. **Testing**: `pnpm signin:e2e https://my-blog-0j5s-git-<branch>-….vercel.app`
   for a human; the harness/CI uses the same primitives headlessly. Branch
   URLs are deterministic aliases and stable across pushes.

Real OAuth deliberately doesn't work here (ephemeral callback); that's what
§8 covers.

## 7. Hardening ladder

In order of value:

1. **Vercel Deployment Protection on previews** (no code): the entire
   preview sits behind Vercel Authentication; automation passes the
   `x-vercel-protection-bypass` header. Neutralises "anyone with the URL".
2. **Session-init CLI** (§5): secret out of all bundles.
3. Not planned (overkill for disposable test data): one-time-code exchange
   inside the provider (`ConvexCredentials`' `crypto` hooks support hashing
   stored secrets if this is ever wanted), IP allowlists, short-TTL secrets.

## 8. Real-OAuth coverage

The bypass removes OAuth from all automated testing, so the real flow is
covered by:

- **The per-ship production check**: after every merge to main, the
  post-deploy verification includes a genuine sign-out → GitHub OAuth →
  signed-in round-trip on ryankelly.dev, plus a probe that the `e2e`
  provider is not invocable on prod.
- **`test-github` (dormant)**: if a pre-production OAuth rehearsal env is
  ever wanted, the branch + its stable URL exist; it needs a dedicated
  Convex backend (a second project — rejected for now as management
  overhead) because of the single-`SITE_URL` constraint (§2). The OAuth app
  for it already exists; its callback field needs the future deployment's
  `.convex.site` domain. Until then: prod check is the coverage.

## 9. Operational reference

Env vars by deployment:

| Var | Prod | Dev | Preview defaults | Purpose |
|---|---|---|---|---|
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | ✅ | ✅ | — | OAuth app creds (callback = that deployment's `.convex.site`) |
| `SITE_URL` | `https://www.ryankelly.dev` | `http://localhost:3002` | — (bypass doesn't redirect) | Post-OAuth redirect base |
| `ADMIN_GITHUB_LOGINS` | `rtkelly13` | `rtkelly13,e2e-bypass` | `rtkelly13,e2e-bypass` | Admin allowlist (authorization) |
| `AUTH_E2E_BYPASS_SECRET` | **never** | ✅ | ✅ | Arms the bypass provider |
| `AUTH_E2E_BYPASS_LOGIN` | — | optional | optional | Synthetic login (default `e2e-bypass`) |

### Provisioning from files

The gitignored `secrets/` directory (see `secrets/README.md`) is the local
source of truth for all of the above — one dotenv file per target, pushed
with `pnpm provision <convex-dev|convex-prod|convex-preview|ci|vercel-preview>`.
Per-target files make cross-environment mistakes structural rather than
disciplinary: `convex-prod` additionally refuses any `E2E`/`BYPASS` key
before pushing. `convex-preview` prints values for manual dashboard entry
(Convex project-default env vars have no CLI). Rotation = edit file, re-run
target.

Commands:

```bash
# Verify a deployment's bypass state
npx convex env list [--prod] | grep AUTH_E2E

# Server-side smoke of the provider (returns tokens / null / not-found)
npx convex run auth:signIn '{"provider":"e2e","params":{"secret":"…"}}'

# Harness, headless bypass mode (dev server on :3002)
E2E_BYPASS=1 BASE_URL=http://localhost:3002 pnpm test:live-e2e
```

Gotchas:

- Local dev server **must** be on port 3002 or the OAuth redirect lands on
  a dead port (`SITE_URL`).
- `retrieveAccount` throws for unknown accounts; don't trust the docs' null.
- The localStorage key namespace strips non-alphanumerics from the Convex
  URL — assert on post-seed signed-in state, not on the write succeeding.

## 10. Status

| Piece | State |
|---|---|
| GitHub OAuth (prod + dev) | ✅ live |
| `e2e` bypass provider + guards | ✅ shipped (PR #48), prod-verified inert |
| Harness headless bypass mode | ✅ shipped (button-based) |
| UI bypass button on Vercel previews | ✅ `NEXT_PUBLIC_E2E_BYPASS_SECRET` set in Vercel Preview env (2026-07-22); matches dev deployment + `secrets/` files |
| CI live-e2e workflow | ✅ merged; awaiting secrets (todo 33a) |
| Session-init CLI (§5) | 📐 designed, not built |
| Button + `NEXT_PUBLIC_*` removal | pending the CLI |
| Preview-deployments wiring (§6) | pending preview deploy key |
| Vercel Deployment Protection | pending decision |
| `test-github` backend | dormant by choice (§8) |
