/**
 * The order-to-chaos ramp.
 *
 * Perturbs from a coordinate hash rather than an rng draw, which is what lets it
 * be added to a generator whose output is pinned by a golden: a draw would shift
 * the stream and re-roll every later mark even when multiplied by zero.
 */
import type { GraphicParams } from '../../types';

/**
 * Deterministic value in [-1, 1) from a pair of coordinates.
 *
 * Not an rng draw, and that is the entire point. `disorder` is sampled, so it
 * has to perturb positions from *inside* `sample` — and drawing for it would
 * shift the stream and re-roll every later mark, which is the failure this
 * module exists to prevent, reintroduced by the parameter meant to improve it.
 * Hashing the coordinates instead means `disorder = 0` consumes exactly the
 * randomness the generator always did, so not one golden moves.
 */
export const scramble = (x: number, y: number, salt: number): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + salt * 43.7585) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
};

/**
 * How far into the disorder ramp a point is — 0 at the top edge, `disorder` at
 * the bottom.
 *
 * The ramp is what separates this from jitter. A uniform perturbation is
 * texture, and the eye stops reading it within about a second; a gradient from
 * strict lattice to chaos is a *composition*, with somewhere to start and
 * somewhere to end up. Squared, so the ordered end holds on rather than
 * degrading from the first row — the top of `flow_dots` is a convincing grid
 * for a third of its height, and that contrast is the whole effect.
 */
export const disorderAt = (p: GraphicParams, y: number): number =>
  p.disorder <= 0
    ? 0
    : p.disorder * Math.min(1, Math.max(0, y / p.height)) ** 2;
