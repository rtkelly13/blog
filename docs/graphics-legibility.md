# Legibility rules for animated backgrounds

Where the numbers in `tests/graphics-legibility.test.ts` come from. The short
version: **a backdrop is constrained from above, not below.** Almost every
contrast rule you will find is about making something easier to see; a
background behind body text has the opposite problem.

## Contrast: a ceiling, not a floor

WCAG has no contrast requirement for purely decorative content — text that is
decoration and conveys no information is explicitly excluded
([Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)).
So these generators are not obliged to be visible at all.

What *is* obliged is the text on top of them. Where a background varies, the
requirement is against the area immediately behind the letters, not the average
of the whole image ([G18](https://www.w3.org/TR/WCAG20-TECHS/G18.html),
[WebAIM](https://webaim.org/articles/contrast/)). A pattern that is fine on
average and dark in patches fails wherever a patch lands under a word.

That turns into a number. Ink `#23262e` on paper `#f5f3ec` is 13.63:1 on bare
paper. Compositing an ink mark over the paper *behind* the text:

| mark alpha | local background | text contrast | |
| ---: | --- | ---: | --- |
| 0.30 | `#b6b6b3` | 7.44 | pass |
| 0.40 | `#a1a1a0` | 5.85 | pass |
| **0.50** | `#8c8d8d` | **4.55** | pass, barely |
| 0.60 | `#77787a` | 3.42 | fail |

The dark theme behaves the same way: white text over a cyan-marked backdrop
holds 4.43:1 at alpha 0.60 and 2.74:1 at 0.80.

**So the bulk of a generator's marks must sit at or below ~0.5 alpha.** Bright
marks above that are allowed and wanted — they are what stops a texture being
inert — but they have to be *sparse*, because the odds of a word landing on one
scale with their area.

## Thin lines pay a penalty

WCAG 1.4.11 asks 3:1 of non-text content, but a line under 3 CSS pixels needs
4.5:1, because thin shapes are harder to perceive
([Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)).
The reason matters more than the number:

> Due to anti-aliasing, particularly thin lines and shapes of non-text elements
> may be rendered by user agents with a much fainter color than the actual color
> defined in the underlying CSS.

Every stroke in this system is "thin" — `strokeWidth` runs 0.6 to 2.4. So a
hairline at low alpha is discounted twice: once by the alpha, once by the
rasteriser. That is why generators like `void-field` and `truchet-arcs` both
read as absent at alphas that looked reasonable in the code, and why the fix
each time was weight rather than colour.

The working rule: **treat effective weight as `strokeWidth x alpha`**, and do
not let the *load-bearing* marks fall below about 0.5 of a device pixel of ink.

## Motion is the part with no standard

Peripheral motion triggers an involuntary, bottom-up shift of attention — the
periphery is rod-dominated and detects motion faster than the fovea, so anything
moving beside the text competes with it
([NN/g](https://www.nngroup.com/articles/animation-usability/),
[Progress](https://www.progress.com/blogs/the-surprising-potential-of-peripheral-vision-in-driving-user-attention)).
That is a strong argument for slow, low-amplitude, non-looming motion.

There is no numeric threshold to appeal to, and it is worth being honest about
that rather than inventing one:

> No current web standard defines a numeric amount, percentage, duration, travel
> distance, velocity, or acceleration by which motion must be reduced
> ([Media Queries L5 discussion](https://gist.github.com/robertpenner/19812c7c6e51cdefee8e55c231090ed6)).

What the guidance does say is that *displacement* is the trigger, not change as
such: scaling or panning large objects is a vestibular risk, while an opacity
oscillation that leaves things spatially put is not
([web.dev](https://web.dev/articles/prefers-reduced-motion)). Two consequences
here:

- `prefers-reduced-motion` holds the still frame, which costs nothing because
  `t = 0` *is* the still frame by construction.
- Generators that move by brightness rather than by position — `flow-lines`
  travelling a pulse along a static curve — are the safer pattern, and worth
  preferring where a generator could go either way.

## What this system already does about it

- `speed` per generator, because a turn at full reach covers the whole
  circumference and the radial family would otherwise be the fastest thing on
  screen.
- 24fps rather than 60, which is a cost decision that happens to reduce motion
  salience too.
- Only the two tiles nearest the middle of the gallery animate.
- `sketchWeight`, because the same alpha is far heavier as ink on white.

## Not settled

The site's paper texture is `diagonal-hatch` via `LayoutWrapper`, and the
expectation is that a tuned hatch becomes the default background generally. If
that happens, the ceiling above stops being advisory: it will sit under every
paragraph on the site rather than under an experiment, and the sparse-bright-
marks allowance should probably be tightened for that one case specifically.
