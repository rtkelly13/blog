# The design system is the durable asset; the blog is its proving ground

## Context

This repository looks like a personal blog and is increasingly not one. The
graphics system alone is 41 generators behind a tested contract, a rendering
budget, a benchmark and a legibility standard — none of which a blog needs. The
component library has already been extracted into `@rtkelly13/design-system` and
is consumed here as a dependency.

The intent behind that work has never been written down, which makes it easy to
mistake for over-engineering. It is not: **the long-term aim is a SaaS product
built on a design language that is distinctively mine rather than assembled from
whichever component library is fashionable.** The blog is where that language
gets built and stress-tested against real content, in public, with no users to
disappoint while it is wrong.

Two things follow from that which would otherwise look like poor judgement:

- Effort spent on primitives is disproportionate to what the blog needs, because
  the blog is not the customer.
- The blog is allowed to be a showcase — talk decks, generated backgrounds,
  interactive experiments — because exercising the system is the point, not a
  distraction from it.

## Decision

**The design system is the artefact with a future. This site is the harness.**

Concretely:

1. **Anything reusable belongs in the design system, not here.** If a component,
   token or primitive would make sense in an application that is not a blog, it
   graduates. What stays here is content, routing, and things genuinely specific
   to publishing.

2. **The distinctiveness is a requirement, not a preference.** Zero border
   radius, hard offset shadows, bracketed display type, a near-black ground with
   saturated accents, and an ink-on-paper light theme that is a different design
   rather than an inverted one. A product built on this should be recognisable
   before the logo is. Choices that erode that — reaching for a default
   component, softening a corner — are regressions even when they are
   individually reasonable.

3. **Accessibility is a property of the primitives.** See
   [accessibility.md](../accessibility.md). A component library retrofitted for
   accessibility is one that gets rewritten; the standard has to hold at the
   level where it can be enforced once. This is why WCAG 2.2 AA is a target for
   a site with no legal obligation and, currently, no users.

4. **Constraints are encoded as tests, not as intentions.** The generated
   backgrounds are the worked example: a coherence contract, an element budget,
   a text-safe opacity, a sketch-suitability flag. Each began as a thing someone
   had to remember and became a thing the suite refuses. A design system carried
   into a product by documentation alone does not survive contact with a
   deadline.

5. **The blog may be sacrificed for the system, not the reverse.** If a
   refactor improves the primitives and costs this site a feature, take it.

## Consequences

- Work here will continue to look disproportionate to a blog, and reviews should
  judge it against the product goal rather than the blog's needs.
- The design system repository gains a dependency on this one for validation —
  a change there is not proven until it renders in real content here.
- There is a standing risk of building primitives for a product that does not
  exist yet. The mitigation is that everything built has to earn its place *in
  the blog first*: the graphics system exists because talks needed backgrounds,
  not because a hypothetical product might.
- Some decisions will be made for the product's benefit at the blog's expense —
  the three-theme system is more than a personal site needs, and exists because
  a product will need theming that is not an inversion.
