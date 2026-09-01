/**
 * The pipeline, end to end.
 *
 * The other suites test pieces: `graphics-shared` the primitives,
 * `graphics-modules` the module contract, `graphics-generators` the coherence
 * of each generator, `graphics-svg-regression` the emitted markup. Each can
 * pass while the assembly is broken — a module that never reaches the registry,
 * a default that is dropped on the way through, a data URI that does not decode
 * back to what was rendered.
 *
 * This is the seam test: module → registry → params → SVG → data URI, and the
 * two consumers on the site.
 */
import { describe, expect, it } from 'vitest';
import { GENERATOR_MODULES } from '../components/graphics/generators';
import {
  GENERATOR_LIST,
  generatorsInGroup,
  getGenerator,
  graphicDataUri,
  renderGraphic,
  resolveParams,
} from '../components/graphics/registry';
import { BASE_PARAMS, GENERATOR_GROUPS } from '../components/graphics/types';

const NAMES = GENERATOR_MODULES.map((m) => m.name);

describe('module → registry', () => {
  it('every module is reachable by its own name', () => {
    for (const m of GENERATOR_MODULES) {
      expect(getGenerator(m.name)?.name).toBe(m.name);
    }
  });

  it('an unknown name degrades rather than throwing', () => {
    // Talk frontmatter carries these as free text; a typo must not take the
    // page down.
    expect(getGenerator('does-not-exist')).toBeUndefined();
    expect(renderGraphic('does-not-exist')).toBe('');
    expect(graphicDataUri('does-not-exist')).toBe('');
  });

  it('the grouped view partitions the list exactly', () => {
    const grouped = GENERATOR_GROUPS.flatMap((g) =>
      generatorsInGroup(g).map((x) => x.name),
    );
    expect(grouped.sort()).toEqual([...NAMES].sort());
  });
});

describe('registry → params', () => {
  it.each(NAMES)('%s: module defaults survive the merge', (name) => {
    const module = GENERATOR_MODULES.find((m) => m.name === name);
    const resolved = resolveParams(name);
    for (const [k, v] of Object.entries(module?.defaults ?? {})) {
      expect(resolved[k as keyof typeof resolved]).toBe(v);
    }
  });

  it.each(NAMES)('%s: base params fill every gap', (name) => {
    const resolved = resolveParams(name);
    for (const key of Object.keys(BASE_PARAMS)) {
      expect(resolved[key as keyof typeof resolved]).toBeDefined();
    }
  });

  it('an explicit undefined falls back rather than clobbering', () => {
    // The bug this pins: spreading a props object with optional fields used to
    // overwrite a real default with undefined, and the generator drew at
    // width: undefined.
    const resolved = resolveParams('dot-grid', { width: undefined, seed: 3 });
    expect(resolved.width).toBe(BASE_PARAMS.width);
    expect(resolved.seed).toBe(3);
  });
});

describe('params → svg → data uri', () => {
  it.each(NAMES)('%s: the data URI decodes back to the SVG', (name) => {
    const svg = renderGraphic(name, { seed: 5 });
    const uri = graphicDataUri(name, { seed: 5 });
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(
      decodeURIComponent(uri.slice('data:image/svg+xml;utf8,'.length)),
    ).toBe(svg);
  });

  it.each(NAMES)('%s: the URI is safe inside a quoted CSS url()', (name) => {
    // Both consumers write `url("...")`, and they have to.
    //
    // `encodeURIComponent` deliberately leaves `(` and `)` alone, and every
    // generator emits `rgba(...)` fills — so an *unquoted* `url(data:…)` would
    // terminate at the first colour's closing paren and load nothing. Quoting
    // fixes that, and is why this asserts the quote-safe property rather than
    // the paren-free one: no double quote, and no newline to break the
    // declaration.
    const uri = graphicDataUri(name);
    expect(uri).not.toMatch(/["\n\r]/);
    // And the hazard is real, not theoretical: the parens are genuinely there.
    expect(uri).toContain('(');
  });

  it.each(NAMES)(
    '%s: render() equals sample() then project() at t=0',
    (name) => {
      // The registry's convenience path and the split path must agree, or the
      // still gallery and the animated one draw different pictures.
      const g = getGenerator(name);
      if (!g) throw new Error(name);
      const p = resolveParams(name, { seed: 9 });
      expect(g.render(p)).toBe(g.project(g.sample(p), p, 0));
    },
  );
});

describe('the colour options are additive', () => {
  // The constraint the ramp was added under: a single accent must keep working
  // exactly as it did, so every one of these is opt-in and none of them can
  // quietly change an existing consumer. Asserted per generator rather than
  // trusted, because `ink()` is called from 42 files and one of them getting it
  // wrong would be invisible until someone noticed a colour had shifted.

  it.each(NAMES)(
    '%s: omitting the new options renders the classic output',
    (name) => {
      const classic = renderGraphic(name, { seed: 4 });
      expect(
        renderGraphic(name, {
          seed: 4,
          accents: undefined,
          contrast: 1,
          originX: 0.5,
          originY: 0.5,
        }),
      ).toBe(classic);
    },
  );

  it.each(NAMES)(
    '%s: a one-colour ramp equals that colour as the accent',
    (name) => {
      // A ramp of one is not a gradient, and must degrade to the plain case
      // rather than to some interpolated approximation of it.
      expect(renderGraphic(name, { seed: 4, accents: ['#22d3ee'] })).toBe(
        renderGraphic(name, { seed: 4, accent: '#22d3ee' }),
      );
    },
  );

  it.each(NAMES)('%s: contrast of 1 is a no-op', (name) => {
    expect(renderGraphic(name, { seed: 4, contrast: 1 })).toBe(
      renderGraphic(name, { seed: 4 }),
    );
  });

  it.each(NAMES)('%s: a two-colour ramp actually changes something', (name) => {
    // Guards the guard: every assertion above is satisfied by a generator that
    // ignores `accents` entirely, so without this "additive" could quietly mean
    // "inert".
    expect(
      renderGraphic(name, { seed: 4, accents: ['#22d3ee', '#ec4899'] }),
    ).not.toBe(renderGraphic(name, { seed: 4 }));
  });

  it.each(NAMES)(
    '%s: contrast away from 1 actually changes something',
    (name) => {
      expect(renderGraphic(name, { seed: 4, contrast: 0.4 })).not.toBe(
        renderGraphic(name, { seed: 4 }),
      );
    },
  );

  it('a moved origin shifts every centred generator', () => {
    // And is inert for the rest, which is why this is not `it.each` over all of
    // them — a lattice has no centre to move.
    for (const g of GENERATOR_LIST.filter((x) => x.group === 'radial')) {
      expect(renderGraphic(g.name, { seed: 4, originX: 0.25 })).not.toBe(
        renderGraphic(g.name, { seed: 4 }),
      );
    }
  });
});

describe('the whole list', () => {
  it('renders every generator at both density extremes without throwing', () => {
    for (const g of GENERATOR_LIST) {
      for (const density of [0.05, 1]) {
        expect(renderGraphic(g.name, { density }).length).toBeGreaterThan(60);
      }
    }
  });

  it('responds to accent, so nothing is hardcoding a colour', () => {
    for (const g of GENERATOR_LIST) {
      expect(renderGraphic(g.name, { accent: '#ff0000' })).not.toBe(
        renderGraphic(g.name, { accent: '#00ff00' }),
      );
    }
  });

  it('responds to seed, so nothing is ignoring the rng', () => {
    for (const g of GENERATOR_LIST) {
      expect(renderGraphic(g.name, { seed: 1 })).not.toBe(
        renderGraphic(g.name, { seed: 2 }),
      );
    }
  });
});
