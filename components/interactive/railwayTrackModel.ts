/**
 * The railway-oriented-programming animation model — pure, and a function of
 * continuous time and a config.
 *
 * Separated from `RailwayTrack.tsx` so that reaching `railFrameAt` does not also
 * pull in React, `lucide-react` and `motion/react`. The component's rAF loop
 * does nothing but advance `t` and hand it here.
 *
 * `t` is seconds. The run is finite: past `railTotal(cfg)` the token holds at
 * the end of its rail with `done` set, rather than wrapping.
 */
export interface RailStep {
  label: string;
  op: string;
}

export interface RailConfig {
  steps: RailStep[];
  /** Index of the step that fails, or -1 for an all-success run. */
  failAt: number;
}

export interface RailFrame {
  /** 0..1 across the whole pipeline (station space normalised). */
  x: number;
  rail: 'success' | 'failure';
  activeStep: number;
  /** The value label carried by the token. */
  value: 'Ok' | 'Error';
  switching: boolean;
  done: boolean;
}

const STEP_DUR = 1.15;
const TAIL = 1.0;

export function railTotal(cfg: RailConfig): number {
  return cfg.steps.length * STEP_DUR + TAIL;
}

export function railFrameAt(t: number, cfg: RailConfig): RailFrame {
  const n = cfg.steps.length;
  const u = Math.min(t / STEP_DUR, n); // station-space position 0..n
  const failed = cfg.failAt >= 0;
  const switchU = failed ? cfg.failAt + 0.5 : Number.POSITIVE_INFINITY;
  const onFailure = u >= switchU;
  const switching = failed && Math.abs(u - switchU) < 0.28;
  return {
    x: u / n,
    rail: onFailure ? 'failure' : 'success',
    activeStep: Math.min(Math.floor(u), n - 1),
    value: onFailure ? 'Error' : 'Ok',
    switching,
    done: t >= railTotal(cfg) - 1e-6,
  };
}
