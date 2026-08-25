import { describe, expect, it } from 'vitest';
import {
  ARROW_SPECIMENS,
  BRAND_MARKS,
  PACKS,
  VERDICT_ACCENT,
  VERDICT_LABEL,
} from '../components/iconlab/packs';

describe('icon pack registry', () => {
  it('gives every pack an id, a licence and a stated obligation', () => {
    for (const pack of PACKS) {
      expect(pack.id, `${pack.name} needs an id`).toBeTruthy();
      expect(pack.licence, `${pack.name} needs a licence`).toBeTruthy();
      expect(
        pack.obligation.length,
        `${pack.name} must say what its licence asks`,
      ).toBeGreaterThan(20);
      expect(pack.source).toMatch(/^https:\/\//);
    }
  });

  it('has no duplicate pack ids', () => {
    const ids = PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders every verdict it uses', () => {
    for (const pack of PACKS) {
      expect(VERDICT_LABEL[pack.verdict]).toBeTruthy();
      expect(VERDICT_ACCENT[pack.verdict]).toBeTruthy();
    }
  });
});

describe('licence rules', () => {
  /**
   * The rule the page argues for: the design system publishes to public npm,
   * so nothing it re-exports may hand an obligation to consumers. Only the
   * `clear` and `notice` tiers qualify.
   */
  it('never recommends a pack whose licence propagates an obligation', () => {
    const recommended = PACKS.filter((p) =>
      ['keep', 'adopt', 'accent'].includes(p.verdict),
    );

    expect(recommended.length).toBeGreaterThan(0);
    for (const pack of recommended) {
      expect(
        ['clear', 'notice'],
        `${pack.name} is recommended but sits in the ${pack.tier} tier`,
      ).toContain(pack.tier);
    }
  });

  it('rejects every attribution-tier pack', () => {
    for (const pack of PACKS.filter((p) => p.tier === 'attribution')) {
      expect(pack.verdict, `${pack.name} carries a CC BY obligation`).toBe(
        'pass',
      );
    }
  });

  it('keeps a declared licence against every vendored brand mark', () => {
    for (const mark of BRAND_MARKS) {
      expect(mark.licence, `${mark.kind} needs a licence`).toBeTruthy();
      // An undeclared mark is allowed to exist — that is the finding — but it
      // must be flagged rather than quietly passed off as declared.
      if (!mark.declared) {
        expect(mark.licence).toBe('unknown');
      }
    }
  });
});

describe('glyph specimens', () => {
  it('attributes every specimen to a pack in the registry', () => {
    const ids = new Set(PACKS.map((p) => p.id));
    for (const glyph of ARROW_SPECIMENS) {
      expect(ids, `${glyph.label} is not in the registry`).toContain(
        glyph.packId,
      );
    }
  });

  it('only claims CSS can re-cut a stroke set', () => {
    for (const glyph of ARROW_SPECIMENS) {
      if (glyph.squareable) {
        expect(glyph.kind).toBe('stroke');
        expect(glyph.strokeWidth).toBeGreaterThan(0);
      }
    }
  });

  it('ships real path data for every specimen', () => {
    for (const glyph of ARROW_SPECIMENS) {
      expect(glyph.paths.length).toBeGreaterThan(0);
      for (const d of glyph.paths) {
        expect(d).toMatch(/^[Mm]/);
      }
    }
  });
});
