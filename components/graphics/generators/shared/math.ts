/** Scalar helpers every generator uses. */

/** Linear interpolate — used to map density (0..1) onto per-generator ranges. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const r2 = (n: number) => Math.round(n * 100) / 100;

export const TAU = Math.PI * 2;
