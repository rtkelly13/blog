# Remotion spike — what broke

Answers to the five things #117 set out to find, in the order they mattered.
Everything here was measured in this repo; nothing is quoted from documentation.

Two 10-second 1080p loops render in ~28s each: `ContourLoop` and `TitleCard`.

---

## 1. The loop closes, and it is measured rather than eyeballed

The acceptance criterion. `tests/graphics-generators.test.ts:137` already asserts
`project(s, p, 1) === project(s, p, 0)` for every generator, so the *source*
periodicity was gated before this spike existed. What the spike adds is that it
survives the render.

Rendered stills, mean absolute per-channel difference over the full 1920×1080
frame:

| step | mean \|Δ\| /255 | pixels changed |
|---|---|---|
| frame 0 → 1 (ordinary) | 1.358 | 5.0% |
| frame 298 → 299 (ordinary) | 1.355 | 5.0% |
| **frame 299 → 0 (the wrap)** | **1.340** | **4.9%** |
| frame 0 → 149 (half a loop) | 4.434 | 10.4% |

**Wrap / ordinary step = 0.99×.** The wrap is not a special frame.

The half-loop row is the control, and it is the one worth keeping: a static
composition would also score a perfect wrap. At 3.3× an ordinary step it proves
the image genuinely moves, so "seamless" is not "seamless because nothing
happened".

## 2. Fonts — the guard is in, and I could **not** make it fail

This was billed as the most likely thing to bite. It did not bite, and the
honest report is that I did not reproduce the failure rather than that I proved
it absent.

`TitleCard` renders the same frame with `waitForFont` on and off:

```
pixels differing at frame 30: 0.000%
```

Identical. The likely reason is that the face is bundled as a webpack asset from
`@fontsource/ibm-plex-mono` rather than fetched, so there is no network round
trip to lose a race against, and `font-display: block` prevents a fallback
paint. A CDN-loaded face would restore the race exactly.

`delayRender('fonts')` + `document.fonts.ready` stays in `TitleCard.tsx` anyway.
The cost is one effect; the failure mode is a non-deterministic layout shift on
monospace that does not reproduce between runs. That trade does not need
evidence to justify it — but the claim "this guard is doing work" is
unsupported here, and should not be repeated as though it were measured.

**Follow-up worth doing:** force the failure by loading a face over the network
and rendering with `--concurrency` high enough to reuse pages aggressively. If
it still cannot be reproduced, the guard can be reconsidered rather than
cargo-culted.

## 3. Tailwind — not exercised, deliberately

The spike renders SVG strings from the generators and inline styles on the title
card. No utility classes, so `@remotion/tailwind-v4` was never wired in and the
"install at exact versions, no `^`" trap was never approached.

This is a real gap against #117's scope, not an omission I am glossing: the
moment a composition mounts a design-system component, Tailwind has to work, and
that is untested. It belongs with the `<Slide>` step below.

## 4. Transitions — handled by construction

`src/transitions.css` kills `transition` and `animation` globally. Nothing was
observed lagging, which is expected: no design-system component is mounted yet,
and the 19 hover-intent transitions are inert until one is.

The rule the file encodes is the one that matters and it held throughout:
**every visual change comes from `useCurrentFrame()`.** `TitleCard`'s fade is
arithmetic on `frame`, not a CSS transition, for exactly that reason.

## 5. Scale — a non-event, as predicted

`BASE_PARAMS` is 1280×720 and 1280 × 1.5 = 1920 exactly. The generators emit an
SVG with a viewBox and scale to their container, so a 1080p composition needed
**no** transform, no `zoom`, and no retuning. The `<AbsoluteFill>` simply is the
frame.

Worth being precise about why: the SVG scales because it is resolution
independent, not because the maths worked out. A raster asset at 1280×720 would
still have needed the 1.5× transform #117 describes.

---

## What actually broke: the toolchain, not the code

Nothing in `components/graphics/` needed changing. The whole composition is
about forty lines. Every obstacle was environmental.

**Remotion cannot download its browser here.** It fetches a pinned Chrome
Headless Shell from `remotion.media` on first render, which an egress allowlist
blocks with a 403. The image already carries
`/opt/pw-browsers/chromium_headless_shell-1194`, and `Config.setBrowserExecutable`
takes it. `remotion.config.ts` reads `REMOTION_BROWSER_EXECUTABLE` so the path
is not committed — it differs in every image, and hardcoding one makes the
project un-runnable everywhere else.

```bash
REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
  npx remotion render src/index.ts ContourLoop out/contour.mp4
```

**Remotion's bundled ffmpeg cannot write image files.** It is compiled for their
encode path only: the `png` encoder is present, but every image muxer invocation
fails with `Invalid argument` — single file, `-update 1`, and `image2` with a
`%03d` pattern alike. Playwright's ffmpeg is the mirror image: it writes PNG
fine and cannot demux an H.264 MP4 at all (`Invalid data found when processing
input`).

So the frame comparison in §1 uses `remotion still`, which renders frames
through Remotion's own pipeline. **That means §1 measures the render, not the
encode.** A quantisation pop at the wrap — frame 0 being an I-frame while 299 is
a P-frame — would not show up in those numbers. It is the one claim in this
document with a gap under it, and closing it needs a full ffmpeg in the image.

**`moduleResolution: bundler` vs raw Node.** Not new here, but it bit again: the
graphics modules import each other extensionlessly, so a plain
`node script.mjs` cannot load them even though webpack and vitest can. Checks
against the generators have to run under vitest.

---

## Should `video/` be a workspace package?

#117 asks for a written answer. **No — keep it standalone, for now.**

- It installs 249 packages the Next build has no use for, and the site's
  install is on the critical path of every deploy.
- It has its own React version and its own tsconfig, and needs neither to agree
  with the app's.
- It reaches into `../components/graphics` and `../node_modules/@fontsource` by
  relative path, which webpack resolves without any workspace wiring. That is
  the entire integration surface and it costs nothing.

Revisit if a composition ever needs the app's module aliases or its MDX
pipeline. Rendering a talk deck (#133) would be the trigger, since that does
need the app's loader.

## Not done

- **The `<Slide>` step.** #117's step 4 is a design-system component over the
  background, which is what brings Tailwind and the package's own font stack
  into scope. `@rtkelly13/design-system` in this repo is **0.1.3**; current is
  **0.3.0**, and #75's syntax layer is not in either. Doing it against a
  two-minor-old package would test the wrong thing, so it waits on the version
  bump (#55 covers the install path).
- **Audio, captions, aspect ratios, render infrastructure** — #127–#130,
  untouched and out of scope here.

## Licence

Unchanged and unresolved: #115. Remotion is free for individuals and for
organisations of three or fewer; a Company Licence is mandatory at four, and
headcount aggregates across collaborating parties. This spike is evaluation,
which the licence explicitly permits. Nothing here may ship commercially until
#115 has an answer.
