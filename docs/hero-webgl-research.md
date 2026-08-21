# Hero: WebGL research

**Question.** The homepage hero (`components/CyberHero.tsx`) is a CSS/SVG
perspective grid with a glowing ring. Should it be rebuilt on a 3D engine —
three.js, or react-three-fiber on top of it — and what would that cost?

**Verdict.** Not for the hero we have. The look is a *backdrop*, not a scene:
one WebGL2 fragment shader reproduces it — with better lines than CSS
transforms manage — for **0.8 KB gzip and no dependency**, against **127 KB
gzip** for the smallest useful three.js. The working prototype is at
[`/design-sandbox/webgl-heroes`](../pages/design-sandbox/webgl-heroes.tsx).
three.js earns its weight the moment the hero wants *things in space* — loaded
models, lighting, cameras that move, post-processing. Until it does, it is a
56% increase in homepage JS for a background.

## What the hero has to do here

This is where the decision actually gets made; the bytes only break the tie.
Any replacement inherits five constraints from the repo:

1. **Dual-mode theming is non-negotiable.** `dark` / `dim` / `sketch` remap the
   colour tokens themselves ([components/AGENTS.md](../components/AGENTS.md)),
   and `CyberHero` already reads `--hero-grid`, `--hero-grid-strong`,
   `--hero-ring`, `--hero-ring-glow`. A renderer that bakes its palette into
   materials breaks sketch mode. Whatever draws the hero has to read the same
   custom properties at runtime and re-read them when the theme class flips.
2. **`prefers-reduced-motion` means *no loop*, not a slower one.** Every
   interactive in `components/interactive/` honours it via `useReducedMotion`.
   A hero should draw one still frame and never schedule a rAF.
3. **The homepage is snapshot-tested** in four themes plus mobile and tablet
   (`tests/visual.spec.ts`, `tests/visual-responsive.spec.ts`, 0.2% pixel
   tolerance). An animated canvas is not deterministic across those runs. Any
   shipped WebGL hero needs a time freeze (or a still first frame) under test —
   this is the single largest piece of work in adopting one, and it is the same
   work for every option below.
4. **CSP already allows it.** WebGL needs no change to the policy in
   `next.config.js`; there is no `blob:` worker and no external origin. A
   loader-based three.js hero *would* need `connect-src`/`img-src` review if
   assets came from anywhere but `self`.
5. **Client-only.** The hero must load through `next/dynamic` with
   `ssr: false`, like `SpectacleDeck` and the MDX interactives, so nothing
   reaches the server render.

## Measured cost

Two independent measurements, both on this repo, August 2026 —
`three@0.185.1`, `@react-three/fiber@9.7.0`, `ogl@1.0.11`.

**Isolated library cost.** Each approach implements the same hero (grid, ring,
animated glow); bundled with esbuild, minified, `react`/`react-dom` external:

| Approach | minified | gzip | brotli |
| --- | ---: | ---: | ---: |
| raw WebGL2, no library | 1.3 KB | **0.8 KB** | 0.7 KB |
| `ogl` | 44.1 KB | **13.0 KB** | 11.0 KB |
| `three` | 511.9 KB | **129.6 KB** | 106.8 KB |
| `@react-three/fiber` + `three` | 878.5 KB | **237.9 KB** | 195.7 KB |

**In the real build.** A three.js hero wired onto `pages/index.tsx` through
`next/dynamic({ ssr: false })` and built with `next build` (Turbopack):

| Build | Homepage first-load JS | Lazy hero chunk |
| --- | ---: | ---: |
| `main` today | 229.9 KB gzip (747.8 KB raw) | — |
| + three.js hero, named imports | 231.3 KB gzip | **127.2 KB gzip** (514 KB raw) |
| + three.js hero, `import * as THREE` | 231.3 KB gzip | **178.9 KB gzip** (708 KB raw) |

Three things fall out of that table:

- **`next/dynamic` moves the cost, it does not remove it.** First-load JS barely
  changes (+1.4 KB, the loader stub) because the chunk is deferred — but it is
  requested on the homepage immediately after hydration, by every visitor, on
  the one route where bounce matters most. Deferred is not free.
- **`import * as THREE` costs 52 KB gzip for nothing.** Turbopack tree-shakes
  three respectably (127 KB) when you destructure named exports, and not at all
  when you take the namespace. If three.js is ever adopted here, that is a lint
  rule waiting to be written.
- **three barely shrinks with scene complexity.** The 127 KB is the renderer
  core; the grid and ring in the prototype are rounding error against it. There
  is no "small three.js" for a small scene.

Reproduce with `scripts/`-free steps: bundle the four entry points in
`docs/` order with esbuild (`--bundle --minify --format=esm`), and for the
in-app numbers sum the gzip of `.next/build-manifest.json`'s entries for `/`.

## What three.js would actually buy

Worth being fair to it — the reasons to pay 127 KB are real, they are just not
present in the current design:

- A **loaded model** (`GLTFLoader`) — a logo, a mesh, anything authored outside
  the shader. Reimplementing glTF parsing is not a trade anyone should make.
- **Lighting and materials** you want to reason about physically, rather than
  hand-rolling in GLSL.
- **A camera that moves** through a scene with depth sorting, or an
  `OrbitControls`-style interaction.
- **Post-processing chains** (bloom on the ring, film grain) — `EffectComposer`
  is a lot of machinery to rebuild.
- **Ecosystem**: drei's helpers, and the fact that the next person to touch it
  will have seen react-three-fiber before, but not this shader.

react-three-fiber adds a further ~108 KB gzip on top of three (its own React
reconciler, `zustand`, `suspend-react`). It pays for itself when the scene is a
component tree that reacts to state — not for a fire-and-forget backdrop. It is
current with the stack here: r3f v9 pairs with React 19, which this repo is on.

`ogl` is the sensible middle: a thin, tree-shakeable WebGL wrapper at 13 KB
gzip. Reach for it if the hero grows real geometry, buffers and transforms but
still doesn't need a renderer with a scene graph, materials and loaders.

## The prototype

[`pages/design-sandbox/webgl-heroes.tsx`](../pages/design-sandbox/webgl-heroes.tsx)
— one WebGL2 fragment shader drawing a perspective floor grid, a horizon glow
and a pulsing ring, plus the cost table above rendered from the same numbers.

It deliberately carries the production-shaped concerns, not just the pretty
part, because those are what any of these options would have to solve:

- Colours come from `--hero-grid-strong` and `--hero-ring` as uniforms, re-read
  through a `MutationObserver` on the theme class — so HIGH / DIM / SKETCH all
  work off the design system rather than a baked palette.
- `prefers-reduced-motion` draws a single still frame and never starts a rAF;
  the media query is watched, so toggling it mid-session takes effect.
- An `IntersectionObserver` and `visibilitychange` park the loop when the hero
  scrolls away or the tab is backgrounded.
- DPR-aware sizing capped at 2×, via `ResizeObserver`.
- No WebGL2, a failed shader compile, or a lost context falls back to the CSS
  grid backdrop, and the canvas is `aria-hidden` throughout.

Anti-aliased grid lines use `fwidth()` derivatives, which is why the receding
lines stay one pixel wide instead of shimmering the way the CSS
`perspective()` transform does at the horizon.

### Three things building it turned up

These apply to *any* of the options above, three.js included — they are
properties of this design system meeting a GPU, not of the shader:

- **Recolouring is not enough to theme a hero; the shading model has to
  change.** A glow is additive light, and light on paper reads as a smudge. The
  first sketch-mode render was a grey blob around the ring. The prototype now
  takes an `uInk` uniform off the background token's luminance and swaps bloom
  for a weightier ink stroke. In three.js the same problem arrives as
  "which material", and is more work, not less.
- **Design tokens do not come back in the form they were written.**
  `--hero-grid-strong` is authored as `rgba(35, 38, 46, 0.14)` and
  `getComputedStyle` returns `#23262e24`. A parser that only knows 3- and
  6-digit hex plus `rgb()` silently falls through to its fallback — which is
  precisely how the paper grid came out neon green for one build.
- **The dark themes leave `--hero-*` unset on purpose.** `CyberHero` carries the
  neon values as inline `var()` fallbacks and `.sketch` is the mode that
  overrides them. Anything reading these tokens has to carry the same
  fallbacks, or dark mode gets nothing.

**Verified**, not asserted: rendered in headless Chromium (SwiftShader) at
1280×900 on the production build, in the default dark theme, in `.sketch`, and
under `prefers-reduced-motion: reduce` — WebGL2 context in all three, no
console errors, and the still-frame path confirmed by the status line.

**What it is not:** it is not wired into the homepage, and it is not
snapshot-tested. Constraint 3 above is the work that stands between this page
and `pages/index.tsx`.

## If we adopt it

1. Lift the shader hero out of the sandbox page into `components/`, loaded from
   `pages/index.tsx` via `next/dynamic` with `ssr: false`.
2. Solve the visual-regression problem: freeze the clock under test (a
   `?static` query param, or draw the still frame whenever
   `navigator.webdriver`), then regenerate the homepage snapshots on CI —
   `pnpm test:snapshots:remote`, never locally.
3. Story it, since a story is a test here
   ([tests/AGENTS.md](../tests/AGENTS.md)) — mount it in both themes and let the
   a11y addon check the fallback.
4. Keep `CyberHero` as the no-WebGL fallback rather than deleting it; the CSS
   backdrop in the prototype is a stand-in for exactly that.
5. Re-measure. The claim is that the hero gets *cheaper*, and that should be
   visible in first-load JS, not asserted.

## Open

- Whether the hero should change at all is a design call, not a technical one —
  this documents what it would cost, not that it is wanted.
- If a 3D *object* (a rotating logo, say) is the actual goal, this verdict
  flips: that is `ogl` at minimum, and three.js if the object is authored
  anywhere but in code.
