# Rendering the animated backgrounds

**Question.** `AnimatedBackground` hands the browser a fresh SVG string every
frame — `el.innerHTML = gen.project(structure, params, t)`. `project()` is
cheap; the reparse is not. Given the generator contract, what is the cheapest
way to get a frame on screen, and what would adopting it cost?

**Verdict.** **Draw the frame to a canvas instead of reparsing it into the
DOM.** The frame string does not have to change, the generator contract does
not have to change, and a ~150-line generic interpreter over what `project()`
already emits renders **all 42 generators pixel-identically** to the current
renderer. It is 2.4× cheaper than `innerHTML` on `iso-terrain` per frame and,
more to the point, **four tiles animate inside a 16.7ms budget where the
current renderer misses it on 58% of ticks**.

Attribute mutation — the prior going in, and the thing I expected to win — does
work, but by less than expected: 2.0× on `iso-terrain`, and only 1.0× on
`flow-lines` unless the string scan is lifted out of the loop as well. Retained
mode removes the *parse*; it does not remove SVG's per-element layout, and
layout is where the money is. Canvas removes both.

The prototype and the benchmark that produced every number below are in
`bench/graphics/`. Run it with `node bench/graphics/run.mjs`.

## Method

`bench/graphics/run.mjs` bundles the real registry with esbuild, serves a
harness over http, and drives Chromium 1.61 (Playwright) headless on an M-series
Mac. Every strategy is handed the **same pre-computed array of frame strings**,
so `project()` sits outside all of them and the comparison is purely "what does
it cost to get this frame on screen". `project()` is timed separately and
reported in its own column.

Two timing modes, because neither is honest alone:

- **work** — a synchronous loop over frames timing `draw()` **plus a forced
  layout** (`getBoundingClientRect()` and `getBBox()` on the SVG root). This is
  the number in the tables. It isolates the renderer. **Paint and raster are
  deferred by the browser and are not in it** — see the limits at the end.
- **throughput** — the same renderer driven from an uncapped `rAF` (vsync
  disabled) for a fixed window. The browser cannot present without painting, so
  paint *is* in this number, but as a ceiling rather than an attribution.

30 warm-up frames are discarded. 480 frames are timed. `p95` is quoted rather
than max: the maximum is dominated by GC pauses unrelated to the strategy — one
`innerHTML` run showed a 176ms outlier that reproduces nowhere. Where `avg`
exceeds `p95` in a row below, that is exactly this: a handful of large outliers
pulling the mean above the 95th percentile.

Each gallery configuration runs in a **fresh page**. It did not originally, and
the numbers were nonsense — an 8-tile bitmap run leaves ~600MB for the collector
and whichever configuration followed it paid the bill.

**Correctness is checked before speed.** Every strategy is screenshot at the
same frame and pixel-diffed against the `innerHTML` baseline; a fast renderer
that draws a different picture is not a result. That check caught the canvas
interpreter silently ignoring `transform`, which produced a plausible-looking
`truchet-arcs` with every tile in the same orientation, 6.85% of pixels wrong.

### The strategies

| Name | What it does |
| --- | --- |
| `innerHTML` | What `AnimatedBackground` does today. |
| `mutate-scan` | Parse once into a retained SVG DOM; per frame, scan the emitted string back into values and `setAttribute` only what changed. **No generator change.** |
| `mutate-values` | The same renderer with the scan lifted out of the loop — i.e. what a `project` that emitted *numbers* instead of a *string* would give. **Contract change.** |
| `canvas-scan` | Scan the string, interpret it into Canvas 2D calls. **No generator change.** |
| `canvas-values` | Ditto, scan lifted out. **Contract change.** |
| `bitmap-cache` | Rasterise the whole loop to `ImageBitmap`s once; `drawImage` per frame. |

`mutate-values` and `canvas-values` are not proposals — they are the *floor* for
their family, measuring what changing the contract would buy over not changing
it.

## Per-frame renderer cost

One tile, 600×338 CSS px, `devicePixelRatio` 1, 96-frame loop, 480 timed frames.
All times in ms.

| Generator | els | KB | `project` | strategy | avg | p95 | throughput fps | held |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| **iso-terrain** | 1193 | 118 | 0.86 | `innerHTML` | **3.48** | 5.20 | 254 | — |
| | | | 0.73 | `mutate-scan` | **1.78** | 2.40 | 388 | — |
| | | | 0.66 | `mutate-values` | **1.65** | 2.70 | 461 | 4.9 MB |
| | | | 0.70 | `canvas-scan` | **1.44** | 1.60 | 359 | — |
| | | | 0.63 | `canvas-values` | **1.19** | 1.70 | 387 | 4.9 MB |
| | | | 0.59 | `bitmap-cache` | **0.10** | 0.00 | 4244 | 74.3 MB |
| **flow-lines** | 549 | 99 | 1.04 | `innerHTML` | **2.43** | 4.20 | 348 | — |
| | | | 1.49 | `mutate-scan` | **2.39** | 2.10 | 545 | — |
| | | | 0.90 | `mutate-values` | **1.08** | 1.50 | 609 | 4.0 MB |
| | | | 0.87 | `canvas-scan` | **0.85** | 1.10 | 668 | — |
| | | | 0.74 | `canvas-values` | **0.61** | 0.80 | 798 | 4.0 MB |
| | | | 0.99 | `bitmap-cache` | **0.11** | 0.10 | 5508 | 74.3 MB |
| **truchet-arcs** | 173 | 62 | 0.53 | `innerHTML` | **0.92** | 1.70 | 670 | — |
| | | | 0.35 | `mutate-scan` | **0.15** | 0.20 | 1005 | — |
| | | | 0.41 | `mutate-values` | **0.10** | 0.20 | 1329 | 1.5 MB |
| | | | 0.37 | `canvas-scan` | **0.26** | 0.50 | 684 | — |
| | | | 0.35 | `canvas-values` | **0.19** | 0.40 | 764 | 1.5 MB |
| | | | 0.34 | `bitmap-cache` | **0.14** | 0.10 | 4734 | 74.3 MB |
| **contour** | 21 | 13 | 0.18 | `innerHTML` | **0.14** | 0.30 | 2595 | — |
| | | | 0.19 | `mutate-scan` | **0.04** | 0.10 | 3139 | — |
| | | | 0.23 | `mutate-values` | **0.03** | 0.10 | 2506 | 0.1 MB |
| | | | 0.28 | `canvas-scan` | **0.03** | 0.10 | 2358 | — |
| | | | 0.19 | `canvas-values` | **0.01** | 0.10 | 2535 | 0.1 MB |
| | | | 0.37 | `bitmap-cache` | **0.10** | 0.00 | 4967 | 74.3 MB |

Reading it:

- On `contour` **the renderer is already free and `project()` is the cost.**
  Every strategy is under a fifth of a millisecond; the 0.18ms of arithmetic
  dominates. Nothing here is worth doing for the light generators, and
  `bitmap-cache` is actively *worse* than drawing 21 paths.
- On `iso-terrain` and `flow-lines` the renderer is 2–4× `project()` and the
  ordering is stable: `bitmap` ≪ `canvas-values` < `canvas-scan` <
  `mutate-values` < `mutate-scan` < `innerHTML`.
- `truchet-arcs` is the one place mutation beats canvas, by 0.1ms. It changes
  **3.7% of its attributes per frame** (see the churn table), so the diffed
  `setAttribute` path does almost nothing while canvas still redraws all 173
  marks. That is the shape of the whole trade: mutation's cost tracks *churn*,
  canvas's tracks *marks drawn*.
- The `mutate-scan` row for `flow-lines` is the awkward one: 2.39ms average
  against a 2.10ms p95, i.e. a fast renderer with a fat tail. `flow-lines`
  writes 1500 attributes a frame, most of them long `d` strings, and the
  allocation churn shows up as GC.

## The scenario that prompted this

Eight `iso-terrain` tiles at 300×169, one shared `rAF` capped at 24fps, layout
forced once per tick. `>16.7ms` is the share of animation ticks that overran a
60Hz frame budget — which is what "stutters" means.

| Strategy | 1 tile | 2 tiles | 4 tiles | 8 tiles |
| --- | ---: | ---: | ---: | ---: |
| `innerHTML` | 4.66ms · 0% | 9.13ms · 4% | 19.13ms · **58%** | 48.97ms · **100%** |
| `mutate-scan` | 4.50ms · 0% | 5.74ms · 0% | 13.84ms · 22% | 20.41ms · **98%** |
| `mutate-values` | 2.63ms · 0% | 4.82ms · 0% | 8.68ms · 0% | 17.68ms · **79%** |
| `canvas-scan` | 2.55ms · 0% | 4.84ms · 0% | 8.36ms · 0% | 16.88ms · 38% |
| `canvas-values` | 2.18ms · 0% | 3.93ms · 0% | 6.95ms · 0% | 14.80ms · 24% |
| `bitmap-cache` | 0.06ms · 0% | 0.10ms · 0% | 0.25ms · 0% | 0.41ms · 0% |

This is the table the decision comes off. The user-visible question is not
"how many milliseconds" but "how many tiles before it stutters", and the answer
is **two** today, **four** with mutation, **four to eight** with canvas, and
"as many as fit in memory" with a pre-rasterised loop.

Note this measurement *flatters the current renderer*: it drives every tile from
one shared `rAF`. `AnimatedBackground` today gives each tile its own loop, and
independent loops cannot cooperate on a single layout pass.

## The seven candidates, answered

### 1. Mutate instead of reparse — works, by less than expected

2.0× on `iso-terrain`, 1.0× on `flow-lines`, 6× on `truchet-arcs`. The spread is
the finding, and the reason is churn. Measured across all 42 generators, the
fraction of attribute values that change per frame:

| | Generators | Example |
| --- | --- | --- |
| under 10% | 5 | `void-field` 2.7%, the three `truchet-*` ~3.7%, `cell-mask` 9.9% |
| 10–40% | 21 | `contour` 22%, `iso-cubes` 35% |
| 40–75% | 15 | `iso-terrain` 52%, `flow-lines` 55%, `dot-grid` 73% |
| over 75% | 1 | `ripple` 85% |

`iso-terrain` rewrites 1751 of its 3342 attribute values every frame. Retained
mode saves the *parse* of 118KB and the construction of 1193 elements — real,
and worth 2× — but every one of those 1751 writes still invalidates layout on an
SVG element, and the browser still lays out 1193 boxes before it can paint. You
cannot mutate your way out of SVG's layout model; you can only stop handing it
new documents.

`setAttribute` itself is not the bottleneck. `mutate-values` (no scan, no
strings, just the diffed writes) is only 8% faster than `mutate-scan` on
`iso-terrain`. The scan of a 118KB string costs about 0.13ms; the writes and the
layout they trigger cost the rest.

### 2. Instancing with `<use>` — no, it is *slower*

1200 marks, median of 40 interleaved parses with layout forced:

```
expanded <path>:  2.40ms
<use> of <defs>:  4.00ms
```

Reproducible across runs. `<use>` is not an instanced draw call; it is a
*shadow-tree clone*, so the browser builds the same 1200 boxes it would have
built anyway and pays for the reference indirection on top. The DOM analogy to
instancing does not hold — the thing instancing avoids in a GPU pipeline (the
per-object driver call) is not what SVG is spending its time on. Discard.

### 3. Canvas 2D — yes, and a generic interpreter is enough

This is the surprise. I expected a per-generator canvas path. It is not needed.

`project()` emits a tiny, closed language: `path`, `polygon`, `line`, `circle`,
`rect`, one `g` for opacity, one `clipPath` (in `cell-mask` alone), and path
data using only `M`, `L`, `A`, `Z` — which `Path2D` accepts verbatim. A
~150-line interpreter over the scanned attribute values covers it. Swept across
**all 42 generators**, screenshot and pixel-diffed against the `innerHTML`
baseline at the same frame: **maximum difference 0.001% of pixels**. Not "close
enough" — the same picture.

The one thing it *silently* got wrong was `transform`, which only four
generators emit and which produces a picture that looks fine unless you diff it.
That is an argument for keeping the pixel check in the adoption, not against the
approach.

Canvas's cost tracks pixels drawn rather than elements retained, which is why it
wins on `iso-terrain` and loses to mutation on the low-churn `truchet-*`.

### 4. WebGL — no, and here is the line

Not measured; the case is arithmetic. Canvas 2D draws 1193 stroked cubes in
1.4ms. WebGL would need geometry tessellation for stroked paths (lines with
joins and caps are not a GPU primitive), a shader pipeline, and a context per
tile or a shared context with scissoring. `docs/hero-webgl-research.md` already
made the dependency-weight argument for the hero, and it applies here: the
lightest useful path is hand-written GL, and hand-written GL for *stroked
vector paths* is a tessellator.

It would pay when a generator wants something canvas cannot do at all — per-pixel
fields, thousands of overlapping translucent marks where fill rate rather than
draw calls dominates, or a generator authored as a fragment shader from the
start. `interference`, `resonance` and `ripple` are field-evaluated and would be
*more natural* as shaders than as marks. That is a generator-design conversation,
not a renderer one.

### 5. GPU compositing via CSS `transform` — essentially zero of the 42 qualify

I went looking for generators whose motion is a rigid transform of a static
scene and found that the codebase has already had this argument and settled it.
From `spiral-warp.ts`:

> The obvious way to wind the arms is `<g transform="rotate(360t)">`, and it
> does not close: the printed angle at `t = 1` is `360`, textually different
> from the `0` at `t = 0`, so the emitted SVG differs at the seam.

`t = 1` renders **byte-identically** to `t = 0` is a tested invariant, and a
printed rotation angle breaks it. Every generator that could have been a rigid
rotation — the whole radial family — deliberately rotates a *phase inside the
field* instead. The four generators that do emit `transform="rotate(...)"`
(`truchet-arcs`, `truchet-mirror`, `truchet-single`, `scatter-blocks`) rotate
each mark about its own centre by a sampled, non-animated angle; there is no
whole-scene transform to hoist.

Which is fine, because those are exactly the low-churn generators that are
already nearly free under mutation. There is no win here to go and get.

### 6. Pre-render the loop — fastest by an order of magnitude, and unaffordable

`bitmap-cache` is 35× cheaper than `innerHTML` per frame and holds 8 tiles at
24fps with 0% of ticks over budget. It is also the only strategy where the
memory is the headline.

A 12-second loop at 24fps is **288 frames**. At a 600×338 tile and DPR 1 that is
600 × 338 × 4 × 288 = **234MB for one tile**. At DPR 2, 936MB. The 96-frame
measurement above already holds 74MB. A gallery of seventeen tiles is not a
number worth writing down.

The variants do not rescue it:

- **Cached strings** replayed through `innerHTML` save only `project()`, which
  is the cheap half. 23MB of strings for 96 frames of `iso-terrain`, to save
  0.86ms and keep the 3.48ms.
- **A sprite sheet** has the same pixel budget in one texture.
- **A video or APNG** moves it off the main thread entirely and is genuinely
  attractive for a *fixed* background — but these are parameterised by seed,
  accent, density, theme and origin, and the theme flips at runtime. Pre-encoding
  the cross-product is not on.

Setup cost also disqualifies it for anything interactive: 796ms to rasterise 96
frames of one `iso-terrain` tile, during which the gallery's controls are dead.

It stays interesting for exactly one case: a single hero background, fixed
params, short loop, where 30–60 frames at hero size could be pre-rendered during
idle time and replayed for free.

### 7. Level of detail — real, and sublinear

`iso-terrain` at density 0.5 emits 1193 elements; at 0.15, 653. Same tile:

| density | els | `innerHTML` | `mutate-scan` | `canvas-scan` |
| --- | ---: | ---: | ---: | ---: |
| 0.5 | 1193 | 3.48ms | 1.78ms | 1.44ms |
| 0.15 | 653 | 2.74ms | 1.38ms | 1.28ms |

45% fewer elements buys 21% less time. Cost is not proportional to element count
at this scale — there is per-frame fixed overhead, and the surviving marks get
*larger* (fewer, bigger cubes cover the same frame), so paint partly cancels what
layout saves.

More importantly, **`density` is a `sample()` parameter**. Changing it re-rolls
the composition, so LOD cannot be applied per-frame or animated; it can only be
chosen once, when the tile's displayed size is known. That makes it a
`GeneratedBackground`/gallery-layout decision — "a 300px tile asks for density
0.3" — and a legitimate one, but it is a *tuning* change worth ~20%, not a
renderer change worth 2.4×. Do it as well, not instead.

## Recommendation

**First choice: canvas 2D through a generic interpreter, keeping `project()`
exactly as it is.**

Why it, over attribute mutation:

1. **It is faster where it matters and never much slower.** 2.4× on
   `iso-terrain`, 2.9× on `flow-lines`, 4.7× on `contour`; 0.1ms *slower* than
   mutation on `truchet-arcs`, which is 0.1ms.
2. **It scales with tiles, which is the actual complaint.** Four tiles fit the
   frame budget with 0% overruns against `innerHTML`'s 58%. N canvases do not
   participate in layout at all; N retained SVG trees do.
3. **It needs no contract change**, and the measured value of making one is
   small: `canvas-values` beats `canvas-scan` by 0.25ms on the heaviest
   generator. That is not worth reopening a contract whose invariants
   (`t=1 == t=0` byte-identically, constant mark count) are load-bearing for
   2200 tests. **Do not change `project()` to emit numbers.** The scan is cheap
   precisely because the guarantee makes it possible.
4. **The coverage risk is measured, not assumed.** 42/42 generators, ≤0.001%
   pixel difference.

Sequenced, because the first step is nearly free:

- **Step 0 (now, ~30 lines).** Share one `rAF` across all mounted
  `AnimatedBackground`s instead of one per tile, and force layout once per tick.
  The gallery table's `innerHTML` row already assumes this and it is not what
  ships today.
- **Step 1 (the recommendation).** Canvas renderer behind a prop, SVG retained
  as the default until the pixel sweep is in CI.
- **Step 2 (optional).** Density-by-displayed-size in the gallery, for another
  ~20%.
- **Not doing.** `<use>`, WebGL, CSS transforms, pre-rendered loops, and any
  change to `project()`'s signature.

**Second choice, if canvas is rejected** — because it forfeits resolution
independence, or because rebaselining visual snapshots is unwelcome — is
`mutate-scan`. It is also contract-free, one file, 2.0× on the heavy generators,
and it keeps the output an SVG DOM. It buys three tiles instead of four.

## What adoption costs

**Files that change: one.** `components/graphics/AnimatedBackground.tsx`, plus
two new files (`renderCanvas.ts` and the scanner) alongside it. The renderer is
already the only thing that knows how a frame reaches the screen; the
`sample`/`project` split it drives is exactly what makes swapping it possible.

**The generator contract does not change.** `sample` and `project` keep their
signatures. `project` keeps returning an SVG string. No generator file is
touched. `registry.ts`, `types.ts`, `generators/*` are all untouched.

**The 2200 tests still hold, verbatim.** Every graphics suite —
`graphics-generators` (coherence + byte-exact goldens), `graphics-svg-regression`
(element counts and extents), `graphics-modules`, `graphics-shared`,
`graphics-integration` — operates on the string `project()` returns. That string
is unchanged, so the goldens do not move and nothing needs regenerating. This is
the strongest argument for the string-in / canvas-out shape over a contract
change: a `project` that emitted numbers would invalidate every golden in the
repo.

**What does need work:**

- **`prefers-reduced-motion` and the held frame.** Currently `el.innerHTML =
  project(..., 0)`. On canvas this becomes one `draw(0)`. Same behaviour, and
  `t = 0` is still the still frame by construction.
- **Resize.** SVG scales for free via `viewBox`; a canvas has to be re-sized and
  redrawn on a `ResizeObserver`. This is the one piece of genuinely new
  machinery.
- **DPR.** `canvas.width = cssW * devicePixelRatio`, and the raster cost goes up
  ~4× on a retina display. Unmeasured — see limits.
- **Visual snapshots.** Any Playwright snapshot of a page containing an
  `AnimatedBackground` will need rebaselining once, at whatever tolerance
  `tests/visual.spec.ts` uses. `GeneratedBackground` (stills, `dangerouslySet
  InnerHTML`) is unaffected and should stay SVG — it is also what
  `graphicDataUri` and the OG-image pipeline depend on.
- **A coverage test.** The 42-generator pixel sweep should become a test, not a
  benchmark run. It is the thing that catches a new generator emitting an
  element or a path command the interpreter does not know — the `transform` bug,
  which was invisible to everything except a pixel diff.
- **`aria-hidden` and CSP** are unaffected. No new dependency; no `blob:`, no
  worker, no external origin.

## Limits

**Paint and raster are not in the `work` numbers, for any strategy.** Chromium
defers both past the point `performance.now()` can see, and forcing them
(`getImageData`, a GPU readback) would cost more than the thing being measured
and would penalise canvas specifically. The throughput and gallery columns
include paint implicitly — the browser cannot present without it — but as a
ceiling, not an attribution. **I cannot tell you how much of `innerHTML`'s
3.48ms is paint.** The direction is safe (canvas draws the same marks over the
same area, so its paint is comparable and its layout is zero) but the magnitude
is not established.

**DPR 1 only.** Headless Chromium reports `devicePixelRatio` 1. SVG is
resolution-independent; canvas is not, and at DPR 2 or 3 the canvas raster cost
rises roughly with area while SVG's layout cost does not. On a retina laptop
canvas's margin will be *smaller* than measured here, possibly much smaller for
large tiles. **This is the single biggest hole in the recommendation** and the
first thing to check on real hardware.

**One machine, one browser.** M-series Mac, Chromium 1.61 headless. Firefox's
and WebKit's SVG layout costs differ enough that the *ordering* could change,
though not plausibly the `innerHTML`-is-worst part. Nothing measured on a phone,
where this matters most and where the memory ceiling on `bitmap-cache` bites
hardest.

**Headless is not a real page.** No compositing with real content above it, no
scroll, no other JavaScript competing. The gallery numbers are a lower bound on
the real cost.

**The gallery test uses one generator.** Eight `iso-terrain` tiles is the worst
realistic case, not the typical one. A gallery of mixed generators would sit
somewhere between the `iso-terrain` and `contour` rows.

**Maximum frame times are not trustworthy** and are omitted from the tables.
They are dominated by GC pauses that reproduce inconsistently; p95 is quoted
instead. Anyone re-running this should expect the maxima to move by an order of
magnitude between runs and should not read anything into it.

**The canvas interpreter is not a general SVG renderer.** It handles what these
42 generators emit today: six element types, four path commands, `rotate` and
`translate`, and it ignores `clipPath` (which only `cell-mask` uses, and which
happens not to change the pixels there). A generator that reached for a
gradient, a filter, a mask, or a `text` node would render wrongly and — as the
`transform` bug showed — possibly plausibly. The pixel sweep is what makes this
safe, and it has to be a test rather than a promise.

**Not measured at all:** memory pressure over a long session, battery cost,
`OffscreenCanvas` on a worker (which would move the whole cost off the main
thread and is the obvious next spike if canvas is adopted and is still not
enough).

## Running it

```sh
node bench/graphics/run.mjs                       # the default four generators
node bench/graphics/run.mjs --generators all \
  --strategies innerHTML,canvas-scan --frames 8 \
  --verify /tmp/shots                             # the 42-generator pixel sweep
node bench/graphics/run.mjs --tiles 1,2,4,8       # the gallery scenario
node bench/graphics/run.mjs --density 0.15        # the level-of-detail lever
node bench/graphics/run.mjs --json out.json       # machine-readable
```

| File | |
| --- | --- |
| `bench/graphics/run.mjs` | bundle, serve, drive Chromium, report |
| `bench/graphics/driver.ts` | in-page measurement: `work`, throughput, gallery, screenshot, `<use>` micro |
| `bench/graphics/strategies.ts` | the six renderers |
| `bench/graphics/scan.ts` | the SVG-string scanner the non-`innerHTML` strategies share |
| `bench/graphics/harness.html` | one tile, and a stage for the gallery |
