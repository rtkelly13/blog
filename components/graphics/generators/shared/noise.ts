/**
 * Deterministic 2D value noise.
 *
 * Written out rather than pulled in because it must be exactly reproducible
 * across runs and machines — the goldens depend on it.
 *
 * To loop a noise-driven generator, sample this **around a circle**: the profile
 * is aperiodic to look at while being exactly periodic in the loop parameter,
 * because a circle returns to where it started. `ridgeline` is the worked
 * example.
 */
import { lerp } from './math';

/**
 * Deterministic 2D value noise, and the fractal sum built on it.
 *
 * Written out rather than pulled in because it has to be *exactly* reproducible
 * across runs and machines — the goldens depend on it — and because the ridge
 * needs it sampled in a very specific way (see `ridgeline`).
 */
export const hash2 = (x: number, y: number, seed: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Smoothstep, so the lattice of the noise grid never shows as facets. */
export const smooth = (v: number): number => v * v * (3 - 2 * v);

export const valueNoise = (x: number, y: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
};
