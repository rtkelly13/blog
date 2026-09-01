# Accessibility

What standard this project holds itself to, what is actually enforced, and what
is knowingly not. Written to be useful rather than reassuring: the gaps are
listed because an accessibility document that only lists wins is a document
nobody can act on.

## The target

**WCAG 2.2 Level AA.** AA rather than AAA because AAA's 7:1 contrast floor is
incompatible with a design language built on a near-black ground and saturated
accents — cyan `#22d3ee` on `#0a0a1a` is 10.85:1 and passes AA comfortably,
while several of the palette's working combinations do not reach 7:1 and would
have to be abandoned. That is a deliberate trade, not an oversight.

2.2 rather than 2.1 because the additions that matter here are cheap: focus
appearance and target size are things a brutalist design with hard 2px borders
and generous hit areas gets close to for free.

## Where it is enforced

| Layer | What it covers |
| --- | --- |
| `biome check` | The a11y lint rules, on every commit via the pre-commit hook and again in CI |
| `@storybook/addon-a11y` | axe runs against component stories in Storybook |
| `tests/graphics-legibility.test.ts` | The contrast and visibility rules specific to generated backgrounds |
| `tests/graphics-visual.spec.ts` | Snapshots taken at the *weakest* accent for each surface, so a regression in weight fails first |
| Playwright e2e | Navigation by role and label, which fails when landmarks or accessible names go missing |

### Four lint rules are off, on purpose

`biome.json` disables `noSvgWithoutTitle`, `useButtonType`,
`noStaticElementInteractions` and `useValidAnchor`. The first is the one worth
explaining: this project emits a great deal of SVG that is *decoration*, and the
rule wants a `<title>` on all of it. A title on a decorative graphic is worse
than no title — it puts noise into the accessibility tree and invites a screen
reader to read out "Rotating Arc Grid" before the article. The generated
backgrounds carry `role="img"` and `aria-hidden` instead, which is the correct
treatment for content that conveys nothing.

The other three are pre-existing and unexamined. They are listed here so that
"we turned it off" is at least visible; none has been justified the way the
first has.

## Generated backgrounds: the interesting case

The graphics system is where the standard needed real thought, and it is written
up separately in [graphics-legibility.md](./graphics-legibility.md). The summary:

**A backdrop is constrained from above, not below.** WCAG exempts purely
decorative content from any contrast floor, so a background generator is not
obliged to be visible at all. What *is* obliged is the text on top of it, and
where a background varies the requirement is against the area immediately behind
the letters rather than the average of the image — so a pattern that is fine on
average and dark in patches fails wherever a patch lands under a word.

That yields a number rather than a principle: compositing ink over paper, body
text holds 4.55:1 at mark alpha 0.50 and drops to 3.42:1 at 0.60. Every
generator therefore publishes a **text-safe opacity** — the weight below which
it can carry a paragraph — in [graphics-benchmark.md](./graphics-benchmark.md),
and a test asserts none of them has to be dimmed into invisibility to qualify.

Two smaller consequences:

- Every stroke in the system is under 3px, and WCAG 1.4.11 asks 4.5:1 of thin
  lines against 3:1 of thicker shapes *because anti-aliasing renders them
  fainter than their declared colour*. Thin marks are discounted twice. This is
  why several generators read as absent at alphas that looked reasonable in the
  source, and why the fix each time was weight rather than colour.
- `prefers-reduced-motion` holds the still frame. It costs nothing to honour
  because `t = 0` *is* the still frame by construction — the motion terms are
  written `f(t) − f(0)`.

## Known gaps

- **No axe in the end-to-end suite.** Storybook covers components in isolation;
  nothing runs axe over a composed page, which is where landmark and heading
  order problems actually live.
- **The `dim` theme is unaudited.** `dark` and `sketch` have had their palettes
  checked against text; `dim` has not.
- **Focus appearance is inherited, not designed.** 2.4.11 is probably satisfied
  by the browser default over a high-contrast ground, but it has not been
  measured.
- **Keyboard paths through the interactive talk components are untested.** The
  presenter deck and the audience participation views are the most complex
  interaction surfaces in the project and the least covered here.
- **Reduced motion is honoured by the generators and not audited elsewhere** —
  the Spectacle deck transitions and the Motion-driven talk animations have not
  been checked.

## Why this matters beyond the blog

The design system is intended to outlive this site and carry a product — see
[ADR 0009](./adr/0009-design-system-is-the-durable-asset.md). A component
library that has to be retrofitted for accessibility is a component library that
gets rewritten, so the standard is a property of the primitives rather than
something applied to the pages that use them. Enforcing it here, on a site with
no users to disappoint, is the cheap moment to do it.
