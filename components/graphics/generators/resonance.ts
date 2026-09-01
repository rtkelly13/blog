import { defineGenerator } from '../types';
import { type Source, WAVE_FALLOFF } from './interference';
import type { Rng } from './shared';
import {
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
} from './shared';

/* ── resonance ────────────────────────────────────────────────────────────── */

interface Rule {
  /** Rest height of this rule down the frame. */
  y: number;
  /**
   * How far the rule passes from the centre of the source swarm, 0..1.
   *
   * Frozen in `sample` — the sources orbit, but the swarm's centre barely
   * moves, and a colour that chased it frame by frame would read as the palette
   * breathing rather than as a property of the rule.
   */
  pos: number;
}

interface Field {
  sources: Source[];
  rules: Rule[];
  cols: number[];
}

/**
 * `interference` with the source count turned up until the fringes dissolve.
 *
 * The parent draws two or three sources deliberately, and says so: more sources
 * "do not read as more interference, they read as noise — the fringes stop
 * being traceable once there are enough of them". That is true, and it is also
 * a different and worthwhile picture, which is what this generator is. Nine to
 * fourteen sources at mixed frequencies produce beats between every *pair*, so
 * the surface carries several superimposed fringe systems at once and reads as
 * moiré: dense, shimmering, and impossible to trace back to a source. Two
 * stones in a pond versus rain on it.
 *
 * Three things had to move together to get there, and each of them fails alone:
 *
 *  - **Amplitude down.** Eighteen sources at the parent's 10–22px each would sum
 *    to a couple of hundred pixels of displacement and the rules would cross
 *    into a tangle. 4–10px keeps the sum in the same range the parent's two
 *    sources reached.
 *  - **Frequency up and spread wider.** Beat spacing is set by the *difference*
 *    between two sources' frequencies, so a narrow band gives beats longer than
 *    the frame — which is a slow undulation, not moiré. A 4x spread puts several
 *    beat scales on screen at once.
 *  - **Rules closer together.** Moiré is a pattern *across* the rules; a coarse
 *    stack samples it too sparsely to show, whatever each individual rule does.
 *
 * Contrast is carried by proximity to the swarm rather than by the parent's
 * every-seventh-rule accent. With this many sources there is no traceable
 * fringe for a bright rule to highlight, and the one structure that genuinely
 * exists is a dense core fading to calm at the edges of the frame.
 */

/** Sampled distance-to-swarm range is normalised against this, in frame heights. */
const SWARM_REACH = 0.55;

/**
 * The parent's field sum, unrolled into flat arrays.
 *
 * `interference` exports `orbitSources`/`waveAt` and this could call them; it
 * deliberately does not, and the reason is arithmetic rather than taste. The
 * parent evaluates 3 sources over ~40 rules; this evaluates up to 14 over ~45,
 * which is an order of magnitude more work per frame — enough that the
 * coherence suite, which renders 300 frames four times over, timed out on the
 * shared version. Flat arrays instead of an array of objects, and one `sqrt`
 * instead of `Math.hypot` (which is slow because it guards against overflow we
 * cannot reach with screen coordinates), together cut it by roughly 3x.
 *
 * The formula is the parent's exactly — same falloff, same superposition — so
 * the two generators remain the same physics however this is spelled.
 */
class Swarm {
  private readonly x: Float64Array;
  private readonly y: Float64Array;
  private readonly freq: Float64Array;
  private readonly amp: Float64Array;

  constructor(sources: Source[], t: number) {
    const n = sources.length;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.freq = new Float64Array(n);
    this.amp = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const s = sources[i];
      // Whole turns per loop, so `t = 1` restores the field exactly.
      const a = s.orbitPhase + t * TAU * s.orbitCycles;
      this.x[i] = s.x + Math.cos(a) * s.orbit;
      this.y[i] = s.y + Math.sin(a) * s.orbit;
      this.freq[i] = s.freq;
      this.amp[i] = s.amp;
    }
  }

  at(px: number, py: number): number {
    let sum = 0;
    for (let i = 0; i < this.x.length; i++) {
      const dx = px - this.x[i];
      const dy = py - this.y[i];
      const dist = Math.sqrt(dx * dx + dy * dy);
      sum +=
        this.amp[i] *
        Math.sin(dist * this.freq[i]) *
        (1 / (1 + dist * WAVE_FALLOFF));
    }
    return sum;
  }
}

export default defineGenerator<Field>({
  name: 'resonance',
  label: 'Resonance',
  description:
    'Interference from many sources at once, where the fringes stop being traceable.',
  group: 'field',
  sketch: true,
  speed: 0.9,
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // The parent's two or three, four to five times over. Below about eight the
    // eye still resolves individual fringe systems and it is merely a busy
    // `interference`; far above this the sum averages out and the surface goes
    // flat, because uncorrelated sines cancel. It is also the term the cost is
    // linear in — sources x rules x samples, evaluated per frame — so the
    // ceiling is as much about staying renderable as about how it looks.
    const count = Math.round(lerp(9, 14, p.density));
    const sources: Source[] = [];
    for (let i = 0; i < count; i++) {
      sources.push({
        x: range(rng, p.width * 0.1, p.width * 0.9),
        y: range(rng, p.height * 0.1, p.height * 0.9),
        // Four times the spread of the parent's band, because beats live in the
        // differences between these numbers and a narrow band has none.
        freq: range(rng, 0.02, 0.085),
        amp: range(rng, 5, 12),
        orbit: range(rng, 30, 95),
        orbitPhase: range(rng, 0, TAU),
        // Whole turns per loop, so `t = 1` restores the field exactly. Up to
        // three here rather than the parent's two: with many sources the field
        // needs faster relative motion for the moiré to shimmer rather than
        // drift as a block.
        orbitCycles: intRange(rng, 1, 3),
      });
    }

    // The swarm's centre at rest. Rules are coloured by how far they pass from
    // it, which is the one axis a many-source field still has once the
    // individual fringes have gone.
    let cy = 0;
    for (const s of sources) cy += s.y;
    cy /= sources.length;

    const gap = lerp(28, 16, p.density);
    const rules: Rule[] = [];
    for (let y = gap / 2; y < p.height; y += gap) {
      rules.push({
        y,
        pos: Math.min(1, Math.abs(y - cy) / (p.height * SWARM_REACH)),
      });
    }
    // Fixed sample count along x, so the emitted number count cannot change
    // with `t`. Finer than the parent's, because the top frequencies here are
    // nearly twice its and an under-sampled fringe aliases into a different,
    // wrong pattern rather than into nothing.
    const step = Math.max(7, Math.round(lerp(14, 8, p.density)));
    const cols: number[] = [];
    for (let x = 0; x <= p.width; x += step) cols.push(x);
    return { sources, rules, cols };
  },

  project: (f, p, t) => {
    // Every rule reads the same moved sources — the reason the moiré is one
    // coherent surface rather than each rule inventing its own texture.
    const swarm = new Swarm(f.sources, t);
    let out = '';
    for (const rule of f.rules) {
      let d = '';
      for (const x of f.cols) {
        d += `${d ? 'L' : 'M'}${r2(x)} ${r2(rule.y + swarm.at(x, rule.y))}`;
      }
      // Near the swarm the rules are loud and heavy; at the edges of the frame
      // they thin out to almost nothing, so the eye is given a centre to read
      // the texture around. With a single accent this is a plain alpha ramp;
      // with a two-colour ramp the core and the calm take opposite ends of it.
      const stroke = ink(p, rule.pos, r2(lerp(0.62, 0.14, rule.pos)));
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * lerp(1.1, 0.6, rule.pos))}"/>`;
    }
    return frame(p, out);
  },
});
