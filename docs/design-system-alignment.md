# Keeping the blog and the design system in step

Two repositories, developed in parallel, by the same person, at different times.
They drift by construction. This is the loop that catches it, and the reasoning
behind each part — because the parts only make sense once you know what each one
*cannot* see.

## The contract between them is bigger than the API

`@rtkelly13/design-system` gives this blog three separate things, and they fail
in three different ways:

| What | Example | What catches a break |
| --- | --- | --- |
| **Components and types** | `Button`, `PageTitle`, `TagAccent` | `tsc` — loudly, with a filename |
| **Design tokens** | `text-brutalist-cyan`, `var(--brutalist-pink)` | nothing, until `check:ds` |
| **Theme selectors** | `[data-theme="midnight"]` vs `.dark` | nothing, until `check:ds` |

Only the first row is covered by ordinary tooling. That is the whole reason the
rest of this document exists.

A dropped token does not fail a build. Tailwind simply does not generate the
utility, the `var()` falls through to its fallback or to nothing, and the page
renders in the wrong colour. It looks like a design decision.

A changed *selector* is worse, because every token still exists. Between 0.1.3
and 0.3.0 the design system moved its theme blocks from `.dark` / `.dim` /
`.sketch` to `[data-theme="midnight"|"dim"|"bright"|"white"]`. Nothing was
removed. `tsc` was clean. A token-existence check passed. And the entire theme
layer would have collapsed to `:root` — every level rendering identically — with
no error anywhere.

**That is the failure mode this loop is designed around: silent, total, and
invisible to every gate that existed.**

## The four parts

### 1. `pnpm check:ds` — on every PR, against the pinned version

Blocking, and it asks two questions:

- Does the installed package define every design-system-owned token this blog
  references, as a Tailwind utility or a custom property?
- Do the theme selectors it ships match the mechanism `pages/_app.tsx` actually
  uses? It reads `attribute=` and `themes={[…]}` from the source rather than
  duplicating them, so changing the app changes what is checked.

It deliberately ignores Tailwind's own scale. `text-zinc-400` is not our
business, and treating it as ours would bury the signal in false positives.

### 2. `pnpm ds:try <version>` — before you upgrade, locally

Installs a version, runs `check:ds`, `typecheck`, `test:unit` and `build`
against it, prints a verdict, and **restores your dependency** — on failure, and
on Ctrl-C. The restore is the point: a half-swapped dependency is a worse state
than never having tried, because the next thing that breaks looks like it broke
for its own reasons.

```
pnpm ds:try 0.4.0        # a published release
pnpm ds:try dev          # whatever /publish-dev last wrote
```

### 3. The canary — weekly, against `latest`

`design-system-drift.yml` runs the same four gates on a schedule and keeps **one
issue** up to date with the answer. It never commits a bump.

This is the part a PR gate structurally cannot do. The gate only ever sees the
*pinned* version, which is precisely the version that is not moving. Nothing
otherwise tries the new one, so "can we upgrade" stays unknown until someone
attempts it and discovers the answer is no — usually halfway through something
else.

It is deliberately **not** a PR gate. A design-system release ten minutes ago
must not redden an unrelated blog PR.

### 4. `/publish-dev` — before the design system releases at all

Comment `/publish-dev` on a design-system PR. It publishes
`<version>-dev.<pr>.<sha>` to npm under the `dev` dist-tag, without releasing.

Then, from anywhere:

```bash
# locally
pnpm ds:try 0.4.0-dev.108.a1b2c3d

# or on CI, and it will file the same report the weekly canary does
gh workflow run design-system-drift.yml -R rtkelly13/blog \
  -f version=0.4.0-dev.108.a1b2c3d
```

That is the loop closed: **a design-system change can be judged against its only
consumer before it is a release, rather than after.**

## The order to do things in

When the design system changes something a consumer can see:

1. Open the design-system PR as normal.
2. `/publish-dev` on it.
3. `pnpm ds:try <that version>` in the blog, or dispatch the canary at it.
4. If the blog breaks, decide *there* whether the breakage is intended. A
   deliberate breaking change is fine; an accidental one is much cheaper to
   correct before the release than after.
5. Merge and release the design system.
6. Bump the blog. `check:ds` guards the result from then on.

For a routine, non-visual change, steps 2–4 are skippable — the weekly canary
will catch anything within a week. Use them when the change touches tokens,
theme levels, or an exported component's props.

## What this loop actually caught, the first time it ran

Worth recording, because each one is a different hole and together they are the
argument for the whole thing:

- **`text-brutalist-green`, used in five files, defined in no published version.**
  The about page had been rendering its terminal headings and `>` bullets with no
  colour at all. Found by `check:ds` on its first run.
- **0.1.3 → 0.3.0 is a theming migration, not a bump.** `tsc` was clean and the
  token set was purely additive, so it looked safe. It was not — the selector
  mechanism had changed underneath. Found by the E2E suite; `check:ds` now
  catches it directly.
- **`resolvedTheme !== 'light'` in three components, against a level that has
  never existed here.** Always true, so comments and diagrams rendered dark on
  the paper theme for as long as the paper theme existed. Found by reading the
  code during the migration — nothing automated would have.

The third is the one to remember. Not every kind of drift is mechanically
detectable, and the loop's job is to shrink the set that is not.

## Two things the loop does not cover

**Token *values*.** `check:ds` verifies a token exists and is reachable, not that
it still means the same thing. When 0.3.0 moved `--color-black` from `#000000`
to `#0a0a1a`, no check objected — the visual regression suite did, which is the
right tool for "this looks different". Treat a visual diff after a bump as
expected and read it, rather than re-recording it reflexively.

**Duplication.** The blog reimplementing something the design system now has is
drift too, and no script will tell you. That is a judgement call, and
[ADR-0009](./adr/0009-design-system-is-the-durable-asset.md) is where it belongs.

## Why the version numbers are typed

`ThemeSwitch` declares its levels `satisfies readonly ThemeLevel[]`. That is a
small thing with a large effect: the strings written into `data-theme` are a
cross-repo contract, and a level renamed upstream was otherwise invisible. Typed,
a rename is a compile error at the moment of upgrade.

Where a contract *can* be expressed in the type system, express it there. Every
check in this document exists because some part of the contract could not be.
