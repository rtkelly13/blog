# ADR-0010: A preview slot is the raw branch head unless the branch changes `convex/`

Date: 2026-09-01
Status: accepted
Revises: [ADR-0004](0004-preview-environments-and-auth.md)

## Context

The preview-slot scheme (`scripts/preview-slot.sh`, `p1..p3.ryankelly.dev` bound
to `slot/1..3`) exists so a branch can be reviewed at a stable URL instead of a
hunted-down Vercel hash URL. Because all three slots share **one** Convex preview
backend, the original design made every slot `convex-preview` + the branch,
merged — `convex-preview` being the schema train, the only branch that deploys
that backend.

That is the right shape for schema work. For most branches it is ceremony: this
repo is mostly MDX, CSS, pages and components, so the typical branch touches no
`convex/` file, and merging it onto the train produces a merge commit whose only
effect is to make the deployed slot *not* the thing CI tested.

Two things are worth being precise about, because the obvious rationale for
skipping the train is wrong:

- **Claiming a slot never deploys Convex.** `preview-slot.sh` merges in a
  throwaway worktree and force-pushes only `slot/N`; it never pushes
  `convex-preview`. Moving the train is a separate, deliberate act.
- **`convex-deploy-preview.yml` is already path-filtered** to `convex/**`, so
  even a train push carrying no backend change deploys nothing.

So the saving is not deploy time or backend blast radius. It is that the slot
becomes byte-identical to the branch head, plus one less merge that can conflict.

## Decision

**Push the raw head to the slot — no merge — when both conditions hold:**

1. `git diff --name-only origin/main...<ref> -- convex/` is empty: the branch
   does not touch the backend, so the deployed functions and schema are already
   what it expects.
2. `origin/convex-preview` is an ancestor of `origin/main`: the train is idle. If
   it is *ahead*, it holds someone else's unmerged schema that is live on the
   shared backend, and even a frontend-only branch must be merged onto it or it
   will call functions that are not deployed.

Otherwise merge onto `convex-preview` as before. `preview-slot.sh` evaluates both
and reports which path it took; `--train` forces the merge path.

Condition 2 is the non-obvious half. "The branch doesn't touch `convex/`" alone
is *not* sufficient, and treating it as sufficient is the failure mode this ADR
exists to prevent.

## Consequences

- In the common case the slot is exactly the reviewed commit, so a slot URL and
  a green `PR checks` run describe the same tree.
- The bare `git push -f origin HEAD:slot/N` aliases are correct precisely under
  conditions 1 and 2 — which is usually, but not always. Prefer the script; it
  is the thing that knows when the shortcut is unsafe.
- Schema work is unchanged and still needs the train pushed by hand for the
  backend to match; the script prints that reminder.
- This says nothing about auth. Admin surfaces **are** reachable on slots: per
  [ADR-0005](0005-e2e-auth-bypass-and-test-github-branch.md) and
  `docs/auth.md` §4, the E2E bypass button renders automatically on any Vercel
  preview build (`NEXT_PUBLIC_VERCEL_ENV === 'preview'`), with
  `NEXT_PUBLIC_E2E_BYPASS_SECRET` set in the Vercel Preview env. ADR-0004's
  "test admin flows locally" constraint was already lifted by ADR-0005.
- ADR-0004's remaining premise is stale in one respect: it argued against
  *per-branch* Convex preview deployments, and this scheme never had them — it
  uses one shared named deployment (`convex deploy --preview-name preview`),
  which is ADR-0004's own "stable staging deployment" option.
