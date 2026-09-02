# storybook-site

This directory exists so a **second** Vercel project can deploy this repo's
Storybook while the root project keeps deploying the Next.js site.

It contains no source. Vercel reads the `vercel.json` belonging to a project's
**root directory**, and the one at the repo root declares `framework: "nextjs"`.
A second project pointed at the repo root would therefore be forced to build the
blog, not Storybook. Giving the Storybook project its own root directory gives it
its own `vercel.json` — which is the only way two projects on one repo can build
differently.

The stories themselves live where they always did (`stories/`, `components/`,
`.storybook/`), so the build reaches back up to the repo root:

- `installCommand` and `buildCommand` both `cd ..` first
- `-o storybook-site/dist` puts the output back inside this directory, where
  `outputDirectory: "dist"` (resolved relative to the root directory) finds it

## Why the headers matter

This Storybook is **composed into** the design system's sidebar, and Storybook
resolves composition in the *browser*: the design system's manager fetches
`/index.json` from this origin cross-origin. Without
`Access-Control-Allow-Origin` the ref fails as a CORS error and shows up as a
permanently-erroring sidebar entry, with nothing wrong on this side in isolation.
`index.json` is also served `must-revalidate` so a fresh deploy is picked up
rather than composed from a cached index.

The CORS header is set on **all paths**, not just `/index.json`. The manager also
probes `stories.json` and `metadata.json`, which Storybook 10 no longer emits.
Those requests are expected to fail and composition works without them — but
scoped to `/index.json` they fail as *CORS errors* rather than 404s, because the
browser blocks the response before the status can be read, and each one logs an
error in the console of every page that composes this Storybook.

`cleanUrls: false` is load-bearing for the same reason it is in the design
system's `vercel.json`: clean URLs rewrite `/iframe.html` to `/iframe`, which
breaks Storybook's asset preloading and yields an empty preview pane. Storybook
is one of the few static sites where clean URLs are actively wrong.

The manager also probes `stories.json` and `metadata.json`; 404s there are
expected and harmless.

## Required manual step

Vercel must be told to check out the whole repository rather than just this
directory:

> Project Settings → Build & Development → **Include source files outside of the
> Root Directory in the Build Step** → on

Without it the build fails immediately: `cd ..` finds nothing. **This flag is not
exposed by the Vercel Terraform/Pulumi provider**, so it cannot be declared in
the `shared-utilities` infra stack alongside the project and its domains — it has
to be ticked by hand once, per project.

## Which project is which

| Vercel project | Root directory | Builds |
| --- | --- | --- |
| `blog` | repo root | the Next.js blog, at `ryankelly.dev` / `blog.ryankelly.dev` |
| `blog-storybook` | `storybook-site` | this Storybook |

`blog-storybook` is served on its generated `*.vercel.app` URL and composed into
the design system's Storybook sidebar — see `STORYBOOK_REF_BLOG_URL` in
`shared-utilities/infra/vercel/sites.ts`.
