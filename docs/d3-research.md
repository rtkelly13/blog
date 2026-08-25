# d3.js research

**Question.** The interactive elements of this site — the MDX interactives in
`components/interactive/`, the diagram renderers, the generative graphics, the
live-talk widgets — are all hand-rolled. Should any of them be built on d3, and
what would it cost?

**Verdict.** Adopt d3 as a **calculation library**, in named submodules, where a
real need appears. Never as a rendering library, and never as the `d3` meta-package.
The split is not stylistic: d3's layout half (`d3-scale`, `d3-shape`, `d3-force`,
`d3-hierarchy`, `d3-quadtree`, …) is pure functions that hand back numbers and path
strings, which is exactly the shape every interactive here already has — a pure
model plus a React render. Its DOM half (`d3-selection`, `d3-transition`, `d3-axis`)
owns a subtree and runs its own clock, which collides with React, with the
`prefers-reduced-motion` rule, and with 33 pixel-diffed screenshots.

The bytes are not the interesting part — a chart's worth of d3 is **15.2 KB gzip**,
a third of `motion` (41.8 KB), which every interactive already loads. The
interesting part is that **there is nothing to chart yet**: across `data/blog`,
`data/talks` and `data/ideas` there is not one quantitative dataset. Every table
in the content is a design spec, and every interactive is an *explanatory mechanism
animation*, not a data visualisation. d3's core competency — mapping data to visual
encodings — currently has almost no purchase on this site.

So the recommendation is narrow and conditional, not "adopt d3".

**Adopted, narrowly.** `components/charts/` now implements exactly the shape
this document argued for — `d3-array`, `d3-force`, `d3-format`, `d3-scale`,
`d3-shape` and nothing else, with `biome.json` failing the build on `d3`,
`d3-selection`, `d3-transition` and `d3-axis`. It runs at
[/experiments/d3-charts](../pages/experiments/d3-charts.tsx). See
[What shipped](#what-shipped) at the end.

## What d3 already is here

Worth establishing before discussing adoption: **d3 is already in this repo's
dependency tree**, twice over, and nobody chose it.

| Path | What it pulls | Measured |
| --- | --- | ---: |
| `mermaid@11` → `d3@7.9.0`, `d3-sankey`, `dagre-d3-es` | the whole of d3 | 932.7 KB gzip for the mermaid chunk |
| `@xyflow/react@12` → `@xyflow/system` → `d3-drag`, `d3-zoom`, `d3-selection`, `d3-interpolate` | the DOM/interaction half | 17.2 KB gzip of that chunk is d3 |

Two consequences:

- **"Adding d3" is not a new supply-chain decision.** The packages, their
  maintainers and their licences are already trusted transitively — every
  `d3-*` name below is already resolved in `pnpm-lock.yaml`, and 30
  `@types/d3-*` packages are already installed (mermaid lists `@types/d3` in
  its runtime `dependencies`, oddly, so they are not even dev-only).
- **It is still a bundle decision.** pnpm keeps one instance per version, so a
  blog-authored `d3-interpolate` import dedupes with xyflow's. But the overlap
  is small: `d3-interpolate` + `d3-color` — the slice a chart would share with
  `@xyflow/react` — is **4.2 KB gzip** of a 15.2 KB chart. There is no free
  ride hiding in the existing tree.

## The constraints any option inherits

This is where the decision is actually made; the bytes only break ties.

1. **Every interactive here is `pure model + React render`.** `railFrameAt(t, cfg)`,
   `stateAt(plan, t)`, `depFrameAt(t)`, `mvuFrameAt(t)`, `fileTreeModel.ts` — the
   model is a total function of time, unit-tested, and the component renders
   `frameAt(t)`. The clock is the only stateful part. Anything that computes
   *positions* fits this shape. Anything that *mutates the DOM to a position*
   does not.
2. **`prefers-reduced-motion` means no loop, not a slower one.** Every component in
   `components/interactive/` reads `useReducedMotion()` from `motion/react` and
   renders the final frame without scheduling a rAF. `d3-transition` and
   `d3-timer` schedule their own; honouring the rule would mean never starting
   them, which is most of what they are.
3. **33 screenshot assertions at 0.2% tolerance** (`tests/visual.spec.ts`,
   `tests/visual-responsive.spec.ts`), regenerated on CI only. Anything
   mid-transition when the shot is taken is a flake. Deterministic-at-time-t is
   the property that makes the current interactives snapshotable.
4. **Dual-mode theming is non-negotiable.** `.dark` / `.dim` / `.sketch` remap the
   colour tokens themselves, so components must be built on
   `--brutalist-*` / `--color-*` and never on literals. The interactives already do
   this through a local `C` map of `var(--brutalist-cyan, #22d3ee)`-style strings.
   Any d3 code that emits its own colour or type is a leak in that system.
5. **There is already an animation library.** `motion` (41.8 KB gzip) provides
   easing, springs, `AnimatePresence` and `useReducedMotion`, and every interactive
   uses it. `d3-transition` + `d3-ease` would be a second one, with a second
   clock and a second reduced-motion story.
6. **Client-only, lazily loaded.** The interactives are registered in
   `MDXComponents.tsx` through `next/dynamic({ ssr: false })` so `motion` and
   `@xyflow/react` only ship on pages that mount them. Any d3 adoption follows
   the same route — with one exception noted under *the generators trap* below.
7. **A story is a test** (`tests/AGENTS.md`) — the `storybook` Vitest project runs
   every `*.stories.tsx` in a real browser with an axe pass. New primitives get
   stories, and get a11y coverage for free.
8. **CSP needs no change.** d3 is same-origin JS with no worker, no `blob:` and
   no external fetch. `d3-fetch` and `d3-dsv` would need a `connect-src` review
   if data ever came from anywhere but `self`; nothing else here does.

## Measured cost

Isolated library cost, same methodology as
[hero-webgl-research.md](./hero-webgl-research.md): one entry point per usage
shape, bundled with `esbuild 0.28.1 --bundle --minify --format=esm`,
`react`/`react-dom` external, gzip at level 9. Measured August 2026 against
`d3@7.9.0`, `d3-scale@4.0.2`, `d3-shape@3.2.0`, `d3-array@3.2.4`,
`d3-force@3.0.0`, `d3-delaunay@6.0.4`, `d3-hierarchy@3.1.2`,
`d3-quadtree@3.0.1`, `d3-geo@3.1.1`, `d3-contour@4.0.2`, `d3-sankey@0.12.3`,
`d3-axis@3.0.0`, `d3-selection@3.0.0`, `d3-transition@3.0.1`, `d3-cloud@1.2.9`.

| Usage shape | minified | gzip | brotli |
| --- | ---: | ---: | ---: |
| `d3-quadtree` — spatial index | 4.9 KB | **1.9 KB** | 1.7 KB |
| `d3-contour` — marching squares | 4.7 KB | **2.0 KB** | 1.9 KB |
| `d3-sankey` (+ `d3-shape`) | 8.0 KB | **2.8 KB** | 2.5 KB |
| `d3-hierarchy` — tree + treemap + pack | 10.3 KB | **4.1 KB** | 3.7 KB |
| `d3-interpolate` + `d3-color` *(the slice xyflow already ships)* | 9.8 KB | **4.2 KB** | 3.6 KB |
| `d3-force` — simulation + charge/link/centre | 12.5 KB | **4.9 KB** | 4.5 KB |
| `d3-delaunay` — triangulation / Voronoi | 19.2 KB | **7.1 KB** | 6.4 KB |
| `d3-geo` — Mercator + path | 20.3 KB | **7.9 KB** | 7.2 KB |
| `d3-interpolate` + `d3-format` + `d3-time-format` | 26.0 KB | **9.7 KB** | 8.5 KB |
| `d3-cloud` + `d3-scale` — word-cloud layout | 26.3 KB | **11.0 KB** | 9.7 KB |
| `d3-scale` — linear + band + time | 35.7 KB | **13.0 KB** | 11.5 KB |
| **a brutalist chart** — `d3-scale` + `d3-shape` + `d3-array` + `d3-format`, React renders every mark | 42.4 KB | **15.2 KB** | 13.4 KB |
| the same chart core without `d3-format` | 42.4 KB | **15.3 KB** | 13.5 KB |
| `d3-selection` + `d3-transition` + `d3-zoom` + `d3-drag` | 50.0 KB | **16.9 KB** | 14.8 KB |
| `d3` meta-package, tree-shaken (named **or** namespace import) | 51.8 KB | **18.1 KB** | 16.0 KB |
| the same chart core, but `d3-axis` + `d3-selection` draw the axes | 52.2 KB | **18.3 KB** | 16.1 KB |
| **`d3` with the namespace escaping** (`d3[name](…)`) | 277.2 KB | **94.1 KB** | 79.3 KB |
| the whole of d3, nothing shaken out | 276.4 KB | **93.5 KB** | 79.1 KB |

For scale, the same harness on what this repo already ships — measured at
`motion@12.43.0`, `@xyflow/react@12.11.3`, `mermaid@11.17.2` (the repo pins
`@xyflow/react@12.11.2` and `mermaid@^11.16.0`; near enough for an order of
magnitude, not for a regression budget):

| Already here | minified | gzip | brotli |
| --- | ---: | ---: | ---: |
| `motion/react` (`motion`, `AnimatePresence`, `useReducedMotion`) | 125.4 KB | **41.8 KB** | 37.2 KB |
| `@xyflow/react` (`ReactFlow` + `Background` + `Controls` + hooks) | 175.0 KB | **58.1 KB** | 50.5 KB |
| `mermaid` | 3371.1 KB | **932.7 KB** | 703.5 KB |

Three things fall out of that:

- **A chart is cheap in context.** 15.2 KB gzip is 36% of `motion` and 26% of
  `@xyflow/react`, both of which already load lazily on interactive pages. Cost
  is not the reason to say no to d3 here.
- **The tree-shaking cliff is 5×, and it is about escape, not import style.**
  `import * as d3` and `import { scaleLinear } from 'd3'` measure *identically*
  (18.1 KB) because esbuild sees through static member access. The 94.1 KB
  version is the one where the namespace object itself escapes — passed
  somewhere, re-exported, or indexed dynamically (`d3[name](…)`). This is the
  opposite failure mode to three.js in
  [hero-webgl-research.md](./hero-webgl-research.md), where the namespace import
  itself cost 52 KB — so the lint rule that repo note asks for would not catch
  this one. `d3` also ships **no `sideEffects: false`** in its own
  `package.json` (every `d3-*` submodule does), so a less capable bundler has
  less to work with.
- **`d3-axis` costs 3.0 KB to draw two axes worse than React can.** It pulls in
  `d3-selection` and then hardcodes `font-size: 10` and
  `font-family: sans-serif` as attributes on the axis group
  (`d3-axis/src/axis.js:109-110`) — neither of which is in this design system.
  Its `stroke: currentColor` / `fill: currentColor` are genuinely well-behaved
  and do remap under `.sketch`; the type does not. `scale.ticks(n)` returns the
  tick values as plain numbers, and React renders them in `font-mono` for free.

### In the real build

The isolated figures above predicted the in-app cost well. Measured with
`next build` (Turbopack), summing the gzip of each route's entries in
`.next/build-manifest.json` — the same method as the precedent doc:

| Route | First-load JS | Route's own JS |
| --- | ---: | ---: |
| `/experiments` (the index this links from) | 220.4 KB gzip | 18.7 KB gzip |
| `/experiments/d3-charts` | **239.6 KB gzip** | **38.0 KB gzip** |
| `/` (homepage, for scale) | 254.8 KB gzip | 53.2 KB gzip |

Shared `/_app` baseline: 201.6 KB gzip.

**+19.2 KB gzip** for the whole page against its sibling — the 15.2 KB of d3
plus about 4 KB of components and page JSX. Two honest notes on that number:

- **These charts are not lazily loaded, on purpose.** `next/dynamic` moves cost
  rather than removing it, and this page *is* the charts — deferring them would
  delay the only content on the route. A chart dropped into a post should go
  through `MDXComponents.tsx` like the other interactives, and then the 19 KB
  lands only on posts that carry one.
- **The layout runs twice: once server-side, once on hydration.** The marks are
  prerendered into the HTML, but React still needs the component code on the
  client, and `layoutForce` recomputes its ticks there. At five nodes that is
  free; at a few hundred it would want `useMemo` on a stable input or a
  serialised layout.

## Where d3 would and would not go, component by component

### The interactives — no, and for a specific reason

`RailwayTrack`, `DepResolve`, `MvuLoop`, `MapReduceViz`, `FileTree`,
`Walkthrough`, `Terminal`, `QueryRouter` all animate a *mechanism*: railway-oriented
programming, a diamond dependency conflict, the MVU loop, a slot-limited job
queue. Their hard part is the state machine — `mapReduceModel.ts` is a seeded
discrete-event simulator with dependencies and spot reclaim, 316 lines of domain
logic and no geometry to speak of. d3 has nothing to say about any of it.

What d3 *could* replace is the arithmetic around the edges: a `lerp` here, a
`(count / max) * 100` there, node coordinates written as literals
(`DepResolve.tsx` has an `N` map of hand-placed `{x, y}`). `scaleLinear()` is a
nicer spelling of a lerp, at 13 KB. That is not a trade worth making, and it is
worth naming plainly rather than hedging: on the existing interactives d3 is a
**net loss**.

### `d3-force` — the one genuinely promising piece, and not for the reason usually given

Force layout is normally ruled out here on determinism, and that turns out to be
**wrong**. `d3-force@3` seeds its own LCG (`lcg.js`, `s = 1`) rather than calling
`Math.random`, and places nodes on a deterministic phyllotaxis spiral. Verified
empirically: two identical simulations, 300 manual ticks each, produce
bit-identical coordinates (`-147.757671,21.790253` both runs).

So this is a pure layout function, and it composes with the house pattern exactly:

```js
const sim = forceSimulation(nodes).force(…).stop(); // stop() first — see below
for (let i = 0; i < 300; i++) sim.tick();
// nodes now carry final x/y. No clock, no DOM, snapshotable, reduced-motion-safe.
```

Two caveats: `forceSimulation()` constructs a `d3-timer` **before** it returns, so
`.stop()` is mandatory rather than stylistic — one frame of rAF fires otherwise;
and this only pays off for a graph too large or too irregular to hand-place, which
none of today's diagrams are (`DepResolve` has five hand-placed nodes). File it
as *available and cheap at 4.9 KB* for the first genuinely large graph, not as
work to do now.

### `components/graphics/generators.ts` — no, and there is a trap here

`nodeNetwork` wires each node to its nearest neighbours by sorting every other
node by squared distance — textbook O(n²), and textbook `d3-quadtree`
(1.9 KB) or `d3-delaunay` (7.1 KB, and a Delaunay triangulation is a better
neighbour graph than k-nearest by distance).

Don't. Two reasons, and the second is the one that matters:

- **n ≤ 64.** `count = lerp(12, 64, density)`, so the worst case is ~4,000
  distance calculations. A quadtree would be slower to build than the loop is to
  run.
- **`generators.ts` is in the site-wide bundle, not a lazy chunk.**
  `LayoutWrapper.tsx:23` calls `graphicDataUri('diagonal-hatch', …)` at *module
  scope* for the sketch-mode paper texture, so the generators module is
  evaluated on every page of the site. Anything imported there is unconditional
  first-load cost on every route — including the 7.1 KB of `d3-delaunay` that
  only `nodeNetwork` would use. This is the one place in the repo where the
  "it's lazy, it's fine" reasoning silently fails.

`d3-contour` is a related near-miss: the `contourLines` generator stacks
sine-wave paths, which is not what `d3-contour` does (it marches iso-lines
through a scalar field, and needs a field to march through). Real contours of real data would be a different, better graphic —
and would belong in a lazily loaded component, not in `generators.ts`.

### `LivePoll`'s word cloud — no

`sizeFor(count, max)` scales font size 1→3rem and the words flow inline. A real
`d3-cloud` spiral layout is 11 KB gzip and would re-run on every vote arriving over
Convex, so words would jump between positions live — worse for the room than the
current stable flow. `d3-cloud` is also unmaintained relative to the rest of d3
(v1.2.9, its own release line) and does its layout by rasterising sprites to a
canvas for collision detection, which is a hard thing to snapshot. The brutalist
answer to "word cloud" is a stable list at varying weights, which is what exists.

### `EmojiTop5` — no

One `width: ${(r.total / max) * 100}%`. This is the entire chart. It is correct.

### The diagram renderers — no

`Diagram` routes to mermaid (which already contains all of d3), SVG, or React
Flow (which already contains d3's interaction half). A fourth d3-native renderer
would overlap both. If a diagram needs a Sankey, mermaid has one; `d3-sankey` at
2.8 KB only wins if the diagram needs to be *interactive*, and that is a real
component, not a renderer swap.

### A chart primitive — yes, and it now exists

This is the only case where d3 is clearly the right tool, and it is the one
thing here that got built: `components/charts/`. `d3-scale` does the mapping,
`d3-shape` the path strings, `d3-array` the extents, `d3-format` the tick
labels, and **React renders every mark** — no `d3-selection`, no
`d3-transition`, no `d3-axis`.

Two notes on shape, which the implementation follows:

- **The design system rules out most of `d3-shape`.** Of its 20 exported curves,
  the brutalist constraint (hard edges, no soft anything) permits exactly five:
  `curveLinear`, `curveLinearClosed`, `curveStep`, `curveStepBefore`,
  `curveStepAfter`. The other fifteen — `curveBasis`, `curveCatmullRom`,
  `curveMonotoneX`/`Y`, `curveNatural`, `curveCardinal`, `curveBumpX`/`Y`,
  `curveBundle` and the closed/open variants — are aesthetically out. Worth
  pinning in the component's API rather than exposing `curve` as a free prop.
- **Colour comes from tokens, per the `C`-map pattern already used in
  `components/interactive/`** — `var(--brutalist-cyan, #22d3ee)` — so a chart
  reads on paper and on black. `d3-scale-chromatic` is the wrong tool here: its
  palettes are designed for perceptual uniformity, not for a three-accent
  brutalist system, and a scheme baked into the series colours would not remap
  under `.sketch`.

And this is where the "nothing to chart" finding turned out to be half wrong:
**the repo does generate data worth charting — in `docs/`, not in `data/`.** The
bundle tables in [hero-webgl-research.md](./hero-webgl-research.md) and in this
document are exactly the kind of thing a post would want as a chart, and
[/experiments/d3-charts](../pages/experiments/d3-charts.tsx) now draws both
tables with the primitive. The editorial question — whether a *post* wants one —
is still open; the tooling question is closed.

## Rules

Four of these are enforced by `biome.json` rather than by review — `d3`,
`d3-selection`, `d3-transition` and `d3-axis` each fail
`style/noRestrictedImports` with the reason attached. The rest are conventions
`components/charts/` follows.

1. **Never `import … from 'd3'`.** Always the named submodule
   (`d3-scale`, `d3-shape`, …). The meta-package's 18.1 KB floor is five times
   the parts most uses need, and its 94.1 KB cliff is one careless re-export
   away. `biome.json` already carries a `linter.rules` block, so the cheap
   enforcement is one entry in it:

   ```json
   "style": {
     "noRestrictedImports": {
       "level": "error",
       "options": {
         "paths": {
           "d3": "Import the named d3-* submodule (see docs/d3-research.md)."
         }
       }
     }
   }
   ```
2. **d3 computes; React renders.** No `d3-selection` in app code. Two owners of
   one DOM subtree is the classic React/d3 bug, and it forfeits Storybook's
   render/axe coverage of the marks.
3. **No `d3-transition`, no `d3-ease`, and no d3-driven clock.** `motion` is the
   animation library, `useReducedMotion` is the contract, and the existing
   rAF-driven `frameAt(t)` pattern is the clock. `d3-timer` may only arrive
   transitively (`d3-force` pulls it), never as a loop that is allowed to run —
   which is what `.stop()` in rule 5 is for. `d3-transition` additionally declares
   `sideEffects: ["./src/index.js", "./src/selection/index.js"]` because it
   monkey-patches `d3-selection`'s prototype — a side-effecting import in a
   codebase whose every other d3 module is `sideEffects: false`.
4. **No `d3-axis`.** `scale.ticks(n)` plus JSX, in `font-mono`, on tokens.
5. **Keep the model pure.** A d3 layout call belongs in the `*Model.ts` half —
   returning coordinates — so it stays unit-testable and the component stays a
   function of `frameAt(t)`. `d3-force` needs `.stop()` before its first tick.
6. **Nothing d3 in `components/graphics/generators.ts`**, or in anything else
   `LayoutWrapper` imports at module scope.
7. **Lazily, via `next/dynamic({ ssr: false })`**, registered in
   `MDXComponents.tsx` like every other interactive; with a story, since a story
   is a test here.

## What shipped

`components/charts/` — four files, and the only place in this repo that imports
d3:

| File | Role |
| --- | --- |
| `chartModel.ts` | The whole of d3. `layoutBars`, `layoutSeries`, `layoutForce` — data in, numbers and path strings out. No DOM, no clock, no state. |
| `BarChart.tsx` | Horizontal bars. Ticks are `scale.ticks()` rendered as mono JSX. |
| `SeriesChart.tsx` | One series, on a `CurveName` rather than a curve factory. |
| `ForceGraph.tsx` | A graph drawn from settled coordinates — no running simulation. |

Dependencies added: `d3-array`, `d3-force`, `d3-format`, `d3-scale`,
`d3-shape` (and their `@types`). Nothing else.

**And "added" overstates it.** All ten were *already resolved in
`pnpm-lock.yaml`* at the same versions — the runtime five via mermaid, the
`@types` via mermaid's runtime `@types/d3` dependency. So the lockfile diff for
this whole adoption is **30 lines of pure insertion and not one new package**:
five direct-dependency entries, five dev, and no new `packages:` or
`snapshots:` blocks at all. The install graph is byte-for-byte what it was.
That is the "d3 is already in the tree" finding above, in its strongest form —
this change promoted transitive resolutions to declared ones and added nothing
to what gets downloaded.

Enforcement, so the rules above are not just prose: `biome.json` fails
`style/noRestrictedImports` on `d3`, `d3-selection`, `d3-transition` and
`d3-axis`, each with its reason attached.

Verified rather than asserted:

- `tests/chart-model.test.ts` — 19 unit tests on the pure model, including the
  determinism claim (two runs, identical digests), that a differing tick count
  *does* change the layout (otherwise the determinism test proves nothing), that
  the caller's nodes are not mutated, and the degenerate cases (empty series,
  zero domain, flat series, dangling link, gutter wider than the viewBox).
- `BarChart.stories.tsx` / `ForceGraph.stories.tsx` — 8 stories, which in this
  repo are browser tests with an axe pass (`pnpm test` went from 62 to 70
  Storybook assertions).
- `next build` passes and `/experiments/d3-charts` prerenders statically; the
  determinism panel's verdict is in the server-rendered HTML, not computed on
  the client.
- Rendered at 1280px in `dark` and `sketch`, no console errors, with the
  accents landing as blue pen / red pen / green marker on paper.

Two things the model got wrong first, both caught by tests rather than by
reading:

- `forceLink` **throws** `node not found` on a link naming an absent node — it
  validates at `initialize`, long before any render-time filter would run. One
  bad edge took the whole layout down; dangling links are now dropped before
  the simulation sees them.
- Bar options merged by spread let a forwarded `undefined` clobber a default —
  the same trap `components/graphics/registry.ts` already documents. The merge
  is per-field now.

Not done, deliberately: the charts are **not** registered in
`MDXComponents.tsx`. Nothing in `data/` needs one yet, and an unused dynamic
import is dead weight; wire it up in the same commit as the first post that
charts something.

## Reproducing the numbers

No script is checked in — the measurement is a scratch project, deliberately
outside this repo so its `package.json` and lockfile stay clean (the lockfile
protocol guard would reject a `link:`/`file:` specifier anyway):

```bash
mkdir d3bench && cd d3bench && echo '{"private":true,"type":"module"}' > package.json
pnpm add -D esbuild@0.28.1 d3 d3-scale d3-shape d3-array d3-hierarchy d3-force \
  d3-selection d3-transition d3-zoom d3-drag d3-quadtree d3-delaunay d3-contour \
  d3-geo d3-sankey d3-interpolate d3-format d3-time-format d3-cloud \
  motion @xyflow/react mermaid react react-dom
# one entry file per row of the table, then per entry:
esbuild entry.js --bundle --minify --format=esm \
  --external:react --external:react-dom --outfile=out.js
# gzip at level 9, brotli at default, via node:zlib
```

Each entry imports only what its row names and exports a value that consumes it,
so nothing shakes out that a real call site would keep. The two 94 KB rows are
the exceptions: one re-exports `d3` wholesale, the other indexes the namespace
dynamically.

## Open

- Whether a *post* wants a chart is still an editorial question. The primitive
  exists and is exercised on the experiment page; nothing in `data/` uses it,
  and nothing should until there is a dataset the prose needs.
- If a genuinely large graph diagram ever appears — a dependency graph of the
  virtual monorepo, say — `ForceGraph` is already the answer, and the honest
  next step is the hydration note under *In the real build*: recomputing a
  few-hundred-node layout on the client is the one place this design pays for
  its simplicity.
- `d3-geo` (7.9 KB) is filed for completeness only. Nothing on this site is a map.
