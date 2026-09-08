/** Working with the tilings from `lattice.ts`. */

import type { LatticeCell } from '../../lattice';
import { TAU } from './math';

export type { LatticeCell } from '../../lattice';
export { lattice, scaledPath } from '../../lattice';

/**
 * A tiling plus a per-cell roll, so a generator can vary a lattice without
 * re-drawing it. Shared by every lattice-backed generator.
 */
export interface Tiled {
  cells: LatticeCell[];
  /** Per-cell roll, so a generator can vary a tiling without re-drawing it. */
  rolls: number[];
}

/**
 * A wave sweeping across a tiling: `k` cycles across the frame, `m` whole
 * cycles per loop, so it closes at `t = 1`.
 */
export const wave = (u: number, t: number, k: number, m: number): number =>
  (Math.sin(u * TAU * k + t * TAU * m) + 1) / 2;
