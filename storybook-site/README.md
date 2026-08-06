# storybook-site — Vercel config for the blog's Storybook

This directory contains **only** a `vercel.json`. It exists so one repo can back two
Vercel projects with different builds.

The repo root's `vercel.json` configures the Next.js site (`ryankelly.dev`). Vercel
reads `vercel.json` from a project's **Root Directory**, and its settings take
precedence over dashboard project settings — so a second project pointed at the repo
root would inherit `"framework": "nextjs"` and try to deploy the blog again. Pointing
that project's Root Directory at `storybook-site/` makes Vercel read *this* config
instead, leaving the blog's deploy untouched.

## Why the blog's Storybook is deployed at all

The design system's Storybook (`design-system.ryankelly.dev`) **composes** this one
into its sidebar via `refs` in
[`rtkelly13/design-system`](https://github.com/rtkelly13/design-system)'s
`.storybook/main.ts`. Storybook composition is resolved in the browser by fetching
`<url>/index.json` — it cannot bundle another repo's stories at build time, so the
blog's Storybook needs a URL of its own.

Hence the `Access-Control-Allow-Origin` header: the fetch is cross-origin. It is set
to `*` because this is a public documentation site with no credentials or private
data; there is nothing here that same-origin policy is protecting.

`"cleanUrls": false` is load-bearing. Clean URLs rewrite `/iframe.html` to `/iframe`,
which breaks Storybook's asset preloading and renders an empty preview pane.

## Build commands run from the repo root

The Storybook build needs the whole repo — `components/`, `stories/`, `css/`,
`.storybook/` — not just this directory, so both commands `cd ..` first and the build
writes back into `storybook-site/storybook-static`.

That requires **"Include source files outside of the Root Directory in the Build
Step"** to be enabled on the Vercel project (Settings → Build & Deployment). Without
it Vercel uploads only this directory and the build fails immediately. The Vercel
Pulumi provider does not expose that toggle, so it is the one setting that must be
ticked by hand.

The project itself is declared in the design-system repo's `infra/` Pulumi program
(resource `blog-storybook`), alongside the domains for the composed Storybook.
