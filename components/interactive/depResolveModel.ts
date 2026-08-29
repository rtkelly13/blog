/**
 * The dependency-resolution animation model — pure, and a function of
 * continuous time.
 *
 * Separated from `DepResolve.tsx` so that reaching `depFrameAt` does not also
 * pull in React, `lucide-react` and `motion/react`. The component's rAF loop
 * does nothing but advance `t` and hand it here.
 *
 * `t` is seconds. The run is finite: past `depTotal()` the frame clamps to the
 * `locked` phase rather than wrapping, so a renderer overshooting the end holds
 * the final state instead of restarting.
 */
export type DepPhase = 'graph' | 'conflict' | 'resolve' | 'locked';

export interface DepFrame {
  phase: DepPhase;
  /** 0..1 within the resolve transition (A's edge re-points, v1 fades). */
  resolveProgress: number;
  lockWritten: boolean;
}

const T_GRAPH = 1.6;
const T_CONFLICT = 3.4;
const T_RESOLVE = 5.4;
const TOTAL = 7.0;

export function depTotal(): number {
  return TOTAL;
}

export function depFrameAt(t: number): DepFrame {
  let phase: DepPhase;
  if (t < T_GRAPH) phase = 'graph';
  else if (t < T_CONFLICT) phase = 'conflict';
  else if (t < T_RESOLVE) phase = 'resolve';
  else phase = 'locked';
  const resolveProgress =
    t <= T_CONFLICT
      ? 0
      : t >= T_RESOLVE
        ? 1
        : (t - T_CONFLICT) / (T_RESOLVE - T_CONFLICT);
  return { phase, resolveProgress, lockWritten: phase === 'locked' };
}
