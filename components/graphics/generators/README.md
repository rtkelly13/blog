# Adding a generator

One file, two lines. Everything else is derived.

## 1. Write the module

`components/graphics/generators/<name>.ts`, where `<name>` is the kebab-case id
the generator will be known by everywhere — frontmatter, the registry, URLs. A
test asserts the filename and the `name` field match, so a typo fails the build
rather than producing a generator nobody can address.

```ts
import { defineGenerator } from '../types';
import { frame, mulberry32, r2, range, withAlpha, wobble, cycles } from './shared';

interface Mark { x: number; y: number; seedSize: number }

export default defineGenerator<Mark[]>({
  name: 'my-generator',
  label: 'My Generator',
  description: 'One line, under 140 characters — it is rendered as a caption.',
  group: 'lattice',                 // see GENERATOR_GROUPS in ../types.ts
  defaults: { density: 0.5 },       // merged over BASE_PARAMS

  sample: (p) => { /* consumes the rng; depends on everything except `t` */ },
  project: (marks, p, t) => frame(p, /* pure arithmetic; no randomness */),
});
```

## 2. Register it

Add the import and the array entry in `./index.ts`. That is the only shared file
you touch, and it is two adjacent lines.

## The contract you are signing up to

`sample` and `project` are not a stylistic split. Every generator is tested
against all of the following automatically, the moment it appears in the index:

| Property | Why |
| --- | --- |
| `sample` never reads `t` | otherwise the composition re-rolls per frame |
| `t = 0` is the still image | the goldens pin it, and a video's first frame *is* the still |
| `t = 1` renders identically to `t = 0` | the loop closes with no seam |
| mark count constant across the loop | a changing count is the confetti signature |
| peak displacement ÷ worst step > 4 | smooth motion, not teleporting |
| peak displacement > 10px | "animated" must not mean "technically moving" |
| no `NaN`, `Infinity` or `undefined` | at any `t`, at any density |
| coordinates stay near the frame | bleed is fine, four frames out is a runaway |
| under 400 KB as a data URI at full density | these get inlined into HTML |

The two rules that catch people:

- **Never draw from the rng inside `project`.** It is not merely wasteful — the
  stream is positional, so a draw shifts every later mark and re-rolls the
  composition. That is the exact failure the split exists to prevent.
- **Every cycle count must be a whole number.** Use `cycles()`, which cannot
  return a float. A fractional multiplier leaves a term mid-cycle at `t = 1` and
  produces a jump that reads as an encoding glitch rather than as a bug here.

Anything sampled — `density`, `disorder` — must not be animated. It moves a loop
bound in `sample`, which re-rolls the composition. Only `t` is animatable.

## What `./shared` gives you

| Module | Responsibility |
| --- | --- |
| `math` | `lerp`, `r2`, `TAU` |
| `motion` | `cycles`, `wobble` — the loop-closure primitives |
| `noise` | deterministic value noise; sample it **on a circle** to loop |
| `disorder` | the order-to-chaos ramp, hashed rather than drawn |
| `svg` | `frame()`, the wrapper every `project` returns |
| `tiling` | lattice re-exports, and the travelling-field helper |

Import from the barrel (`./shared`). Import a specific module only when writing
another shared primitive.

## Tests

| Suite | Scope |
| --- | --- |
| `graphics-shared` | each basis module on its own |
| `graphics-modules` | the module contract — names, metadata, groups |
| `graphics-generators` | coherence, plus byte-exact goldens |
| `graphics-svg-regression` | element counts and extents, as a readable diff |
| `graphics-integration` | module → registry → params → SVG → data URI |

Two golden files, deliberately. Hashes catch *everything* and explain nothing;
the structural fixture explains what moved. Regenerate either only on purpose:

```sh
UPDATE_GRAPHICS_GOLDENS=1   pnpm vitest run tests/graphics-generators.test.ts
UPDATE_GRAPHICS_STRUCTURE=1 pnpm vitest run tests/graphics-svg-regression.test.ts
```
