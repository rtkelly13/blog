import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  wobble,
} from './shared';

/* ── diagonal-hatch ───────────────────────────────────────────────────────── */

interface Rule {
  o: number;
  w: number;
  hot: boolean;
}

/** Parallel 45° rules; a few lines pop to accent, the rest stay ghostly. */

export default defineGenerator<Rule[]>({
  name: 'diagonal-hatch',
  label: 'Diagonal Hatch',
  description: 'Parallel 45° rules — a few pop, the rest stay ghostly.',
  group: 'lattice',
  defaults: { density: 0.55, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const gap = lerp(70, 20, p.density);
    const rules: Rule[] = [];
    for (let o = -p.height; o < p.width; o += gap) {
      const hot = chance(rng, 0.12);
      // Deliberately mirrors the original ternary: `range` is not evaluated
      // when `hot`, so a hot line consumes one draw and a cold line two.
      // Reordering this would shift the stream and re-roll every later line.
      const w = hot
        ? p.strokeWidth * 2.5
        : p.strokeWidth * range(rng, 0.5, 1.1);
      rules.push({ o, w, hot });
    }
    return rules;
  },
  // The one field that can translate wholesale: every rule is the same infinite
  // 45 degree line, generated from -height to width so the set overruns both
  // edges. Sliding it reveals no bare margin, and unlike a grid there is no
  // per-mark identity to mismatch — so this is the most legible motion in the
  // set, and the cheapest.
  project: (rules, p, t) => {
    // Rules are generated from `-height` to `width`, so that span is the axis
    // the hatch is built on; normalising the offset across it puts one end of
    // the ramp at the first rule and the other at the last, and the gradient
    // runs perpendicular to the rules rather than along them. The *sampled*
    // offset, not the slid one, so the field slides without the colours
    // crawling through it.
    const span = p.width + p.height;
    const slide = lerp(70, 20, p.density) * 0.9 * wobble(t, 1, 0);
    let out = '';
    for (const rule of rules) {
      const o = rule.o + slide;
      const w =
        rule.w * (1 + 0.3 * wobble(t, cycles(rule.w, 2), rule.o * 0.02));
      const stroke = ink(p, (rule.o + p.height) / span, rule.hot ? 0.9 : 0.32);
      out += `<line x1="${r2(o)}" y1="0" x2="${r2(o + p.height)}" y2="${p.height}" stroke="${stroke}" stroke-width="${r2(w)}"/>`;
    }
    return frame(p, out);
  },
});
