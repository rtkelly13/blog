import { defineGenerator } from '../types';
import type { LatticeCell, Rng } from './shared';
import {
  cycles,
  frame,
  ink,
  lattice,
  lerp,
  mulberry32,
  r2,
  wave,
} from './shared';

/* ── ribbon-grid ──────────────────────────────────────────────────────────── */

interface RibbonGrid {
  cells: LatticeCell[];
  /** Per-cell roll: a static phase nudge and a static weight. */
  rolls: number[];
  /** Whole sweeps of the light per loop. Integer via `cycles`. */
  tempo: number;
}

/**
 * Parallelogram facets on a triangular lattice, rocking as light sweeps over.
 *
 * Each cell carries a strip standing on one edge of its triangle and leaning
 * toward the opposite apex — a segment of ribbon, seen from the side. The lean
 * is a shear of the strip's far edge along the base, so a cell reads as tilted
 * *toward* or *away from* the viewer, and the fill tracks the same value: the
 * facets turned one way catch the light, the ones turned the other go faint.
 *
 * The lattice does half the work for free. A triangular tiling is two
 * interleaved orientations, so the apex direction — and with it the axis the
 * strip leans about — already alternates cell by cell. Adding a half-cycle
 * offset for the flipped cells keeps the two families from ever peaking
 * together, which is what stops the sweep reading as a plain wipe.
 *
 * The motion is a travelling field over the lattice rather than a per-cell
 * oscillation: a light source crossing a surface tilts every facet it reaches,
 * in order, and that ordering is the entire effect. Independent per-cell phases
 * would give the same amount of movement and none of the sweep.
 *
 * No occlusion here — the facets are translucent and are *meant* to build up
 * where they overlap, which is what gives the ribbon its folded-over look.
 */

export default defineGenerator<RibbonGrid>({
  name: 'ribbon-grid',
  label: 'Ribbon Grid',
  description:
    'Parallelogram cells on a triangular lattice, tilting like ribbon segments.',
  group: 'isometric',
  defaults: { density: 0.5, strokeWidth: 1 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cells = lattice('triangle', {
      width: p.width,
      height: p.height,
      size: lerp(140, 62, p.density),
    });
    // One roll per cell, in lattice order, and the tempo last — so the tempo
    // cannot shift which roll belongs to which cell.
    const rolls = cells.map(() => rng());
    return { cells, rolls, tempo: cycles(rng(), 2) };
  },

  project: ({ cells, rolls, tempo }, p, t) => {
    // These are backdrops: they sit behind text, typically at an opacity well
    // under half, and still have to look like a surface rather than artwork at
    // full opacity in the gallery. So the whole alpha range lives low — the
    // unlit facets are barely-there texture and only the lit ones carry weight.
    let out = '';
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const [b0, b1, apex] = c.points;
      // The field runs down the diagonal, so the sweep crosses the frame rather
      // than marching along one axis. The roll adds a small static phase nudge,
      // which keeps the wavefront from arriving as a ruled line.
      const u =
        c.cx / p.width +
        (c.cy / p.height) * 0.7 +
        rolls[i] * 0.05 +
        (c.flipped ? 0.25 : 0);
      // `wave` returns 0..1; the facet needs a signed tilt, because the sign is
      // exactly the "which way is it facing" the brightness reads off.
      const tilt = wave(u, t, 2, tempo) * 2 - 1;

      // Base edge and apex direction, taken from the cell itself so the strip
      // sits in the lattice instead of near it.
      const ex = b1[0] - b0[0];
      const ey = b1[1] - b0[1];
      const nx = apex[0] - (b0[0] + b1[0]) / 2;
      const ny = apex[1] - (b0[1] + b1[1]) / 2;

      // Foreshortening: a strip turning edge-on narrows. Held off zero so a
      // facet never collapses to a line and disappears mid-sweep.
      //
      // The overhang past the base is the smallest that still breaks the ruled
      // horizontal seam a strip stopping exactly on its base edge leaves. It
      // was four times this, which hid the seams and cost the picture its
      // subject: three or four strips landed on the same pixels and the facets
      // stopped being individually legible. A facet has to be a facet.
      const far = 0.4 + Math.abs(tilt) * 0.34;
      const near = -0.02;
      const shear = tilt * 0.44;

      // Inset from both ends of the base edge, so neighbours sit close without
      // stacking. Together with the shear this is what keeps the lattice
      // readable as a field of separate cells.
      const inset = 0.17;

      const q = (b: [number, number], f: number, s: number): string =>
        `${r2(b[0] + nx * f + ex * s)},${r2(b[1] + ny * f + ey * s)}`;
      // A parallelogram, not a general quad: both far vertices take the same
      // offset, so the two long edges stay parallel however hard it is sheared.
      const points = `${q(b0, near, inset)} ${q(b1, near, -inset)} ${q(b1, far, shear - inset)} ${q(b0, far, shear + inset)}`;

      // Brightness is the tilt itself, so the facets that lean one way light up
      // and their neighbours leaning the other stay dim — the whole reason the
      // sweep is legible as light rather than as motion.
      const weight = 0.55 + rolls[i] * 0.45;
      const lit = (tilt + 1) / 2;
      // Cubed, not linear: a linear ramp spends most of the sweep in the
      // mid-tones and the facets all read as the same grey. The cube keeps the
      // faint side genuinely faint, so the lit band is a band.
      // Position on the ramp is `lit` — the tilt the brightness already reads
      // off. The sweep is the subject, so a facet turned into the light and its
      // neighbour turned away should differ in hue as well as in weight, and
      // the wavefront then reads as light of a colour crossing the lattice
      // rather than as the same accent brightening.
      const fill = ink(p, lit, r2(0.015 + lit ** 3 * weight * 0.34));
      // The outline takes the same position, so a facet's edge never belongs
      // to a different part of the ramp than its face.
      const line = ink(p, lit, 0.13);
      out += `<polygon points="${points}" fill="${fill}" stroke="${line}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
