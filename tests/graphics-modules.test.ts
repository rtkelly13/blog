/**
 * The generator module contract.
 *
 * Adding a generator is meant to be one file plus two lines in the index. That
 * only stays true if the shape is enforced somewhere, so it is enforced here:
 * every failure below is a mistake that would otherwise show up as a generator
 * rendering under its own id, or missing from a gallery, or silently absent
 * from the coherence suite.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERATOR_MODULES } from '../components/graphics/generators';
import { GENERATOR_LIST } from '../components/graphics/registry';
import { GENERATOR_GROUPS } from '../components/graphics/types';

const DIR = join(__dirname, '..', 'components', 'graphics', 'generators');
const NOT_GENERATORS = new Set(['index.ts', 'shared.ts']);

describe('generator modules', () => {
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith('.ts') && !NOT_GENERATORS.has(f))
    .map((f) => f.replace(/\.ts$/, ''))
    .sort();

  it('has a module file for every registered generator, and vice versa', () => {
    // The failure this catches is a new module that was written but never
    // added to the index: it compiles, it is never rendered, and nothing else
    // would notice.
    expect(GENERATOR_MODULES.map((m) => m.name).sort()).toEqual(files);
  });

  it.each(GENERATOR_MODULES.map((m) => [m.name, m] as const))(
    '%s: name matches its filename',
    (name) => {
      expect(files).toContain(name);
    },
  );

  it.each(GENERATOR_MODULES.map((m) => [m.name, m] as const))(
    '%s: is kebab-case',
    (name) => {
      // Ids appear in talk frontmatter and in URLs. A camelCase one would work
      // everywhere except the places a human types it.
      expect(name).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
    },
  );

  it('has unique names', () => {
    const names = GENERATOR_MODULES.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(GENERATOR_MODULES.map((m) => [m.name, m] as const))(
    '%s: carries the metadata a gallery needs',
    (_name, m) => {
      expect(m.label.length).toBeGreaterThan(0);
      // Descriptions are rendered as a caption; an empty one leaves a gap, and
      // a paragraph breaks the tile.
      expect(m.description.length).toBeGreaterThan(10);
      expect(m.description.length).toBeLessThan(140);
      expect(GENERATOR_GROUPS).toContain(m.group);
    },
  );

  it.each(GENERATOR_MODULES.map((m) => [m.name, m] as const))(
    '%s: declares only real params in its defaults',
    (_name, m) => {
      // A typo here is silent: the bad key is merged in, ignored by the
      // generator, and the intended default never applies.
      const allowed = new Set([
        'width',
        'height',
        'seed',
        't',
        'accent',
        'background',
        'density',
        'opacity',
        'strokeWidth',
        'occlusion',
        'disorder',
      ]);
      for (const key of Object.keys(m.defaults ?? {})) {
        expect(allowed).toContain(key);
      }
    },
  );

  it('reaches the registry with its group intact', () => {
    for (const m of GENERATOR_MODULES) {
      const g = GENERATOR_LIST.find((x) => x.name === m.name);
      expect(g?.group).toBe(m.group);
    }
  });

  it('covers every group with at least one generator', () => {
    // A group nobody is in renders as an empty heading in the gallery.
    for (const group of GENERATOR_GROUPS) {
      expect(GENERATOR_MODULES.some((m) => m.group === group)).toBe(true);
    }
  });
});
