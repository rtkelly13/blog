import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
  wobble,
} from './shared';

/* ── iso-cubes ────────────────────────────────────────────────────────────── */

interface Cube {
  col: number;
  row: number;
  /** Sampled height in cube units — the still silhouette. */
  height: number;
  lit: boolean;
  phase: number;
}

/**
 * Isometric cubes on a height field — the generator `occlusion` exists for.
 *
 * `iso-grid` draws diamonds because flat diamonds never overlap. The moment
 * cubes stack, a nearer cube has to hide the one behind it, and there is no way
 * to say that with an accent and an alpha: `withAlpha(accent, 0.9)` still lets
 * the far cube through, and the stack turns to soup exactly where the depth cue
 * was supposed to be. So the faces are painted `p.occlusion` — opaque, matching
 * the surface — and the form is carried by the stroked edges over the top.
 *
 * That is the technique the isometric patterns in the reference set use, and
 * measurably so: they are the only ten of the fifty-seven that declare an
 * occlusion colour at all.
 *
 * Draw order is back-to-front by `row + col`, which is the whole of painter's
 * algorithm on a regular lattice and the reason the occlusion reads correctly.
 */

export default defineGenerator<Cube[]>({
  name: 'iso-cubes',
  label: 'Iso Cubes',
  description:
    'Stacked cubes on a rolling height field — opaque faces, so depth survives.',
  group: 'isometric',
  defaults: { density: 0.4, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cols = Math.round(lerp(7, 16, p.density));
    const rows = Math.round(lerp(9, 20, p.density));
    const cubes: Cube[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cubes.push({
          col,
          row,
          height: range(rng, 0.15, 1),
          lit: chance(rng, 0.14),
          phase: range(rng, 0, TAU),
        });
      }
    }
    // Painter's order. Sorted after sampling so the rng stream stays in lattice
    // order and does not depend on the comparator.
    return cubes.sort((a, b) => a.row + a.col - (b.row + b.col));
  },
  project: (cubes, p, t) => {
    const cw = lerp(74, 38, p.density);
    const halfW = cw / 2;
    const halfH = cw * 0.29;
    const unit = cw * 0.62;
    const edge = withAlpha(p.accent, 0.55);
    const litTop = withAlpha(p.accent, 0.9);
    const dimTop = withAlpha(p.accent, 0.16);
    const originX = p.width / 2;
    const originY = p.height * 0.16;
    let out = '';
    for (const c of cubes) {
      // A travelling wave over the lattice rather than a per-cube bob: the
      // surface rises and falls as a landscape, which is the thing a height
      // field can do that a grid of independent pulses cannot.
      const lift =
        1 +
        0.45 * wobble(t, cycles(c.height, 2), c.phase + (c.col - c.row) * 0.5);
      const hgt = c.height * unit * lift;
      const bx = originX + (c.col - c.row) * halfW;
      const by = originY + (c.col + c.row) * halfH;
      const top = by - hgt;
      // Left and right faces, opaque, so this cube hides whatever is behind it.
      const left = `${r2(bx - halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(top)} ${r2(bx - halfW)},${r2(top - halfH)}`;
      const right = `${r2(bx + halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(top)} ${r2(bx + halfW)},${r2(top - halfH)}`;
      const cap = `${r2(bx)},${r2(top)} ${r2(bx + halfW)},${r2(top - halfH)} ${r2(bx)},${r2(top - halfH * 2)} ${r2(bx - halfW)},${r2(top - halfH)}`;
      out += `<polygon points="${left}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${right}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${cap}" fill="${c.lit ? litTop : dimTop}"/>`;
      out += `<path d="M${r2(bx - halfW)} ${r2(top - halfH)} L${r2(bx)} ${r2(top)} L${r2(bx + halfW)} ${r2(top - halfH)} M${r2(bx)} ${r2(top)} L${r2(bx)} ${r2(by)}" fill="none" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
      out += `<polygon points="${cap}" fill="none" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
