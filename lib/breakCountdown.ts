// Pure math for the shared break countdown. Every surface (projected break
// slide, presenter console, /live) holds the same authoritative server
// timestamps (talks.breakStatus) and derives identical display state from them
// via this module — so the whole room reads one clock.

/** Remaining time at which the countdown shifts to the warning colour. */
export const BREAK_WARN_MS = 60_000;
/** Remaining time at which the countdown shifts to the critical colour. */
export const BREAK_CRITICAL_MS = 10_000;
/**
 * How long the "time's up" end state lingers after zero before every surface
 * hides it on its own — a stale break a presenter forgot to clear shouldn't
 * banner /live forever.
 */
export const BREAK_OVER_LINGER_MS = 120_000;

export type BreakPhase = 'running' | 'warning' | 'critical' | 'over';

export interface BreakViewState {
  phase: BreakPhase;
  /** Remaining ms, floored at 0 once the break is over. */
  remainingMs: number;
  /** Remaining time as M:SS. */
  display: string;
  /** Remaining fraction of the whole break (0..1) — drives the draining bar. */
  fraction: number;
  /** Digit/bar colour: cyan → yellow (warning) → pink (critical/over). */
  color: string;
}

/** M:SS, rounding up so a freshly started 5-min break reads 5:00, not 4:59. */
export function formatBreakMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Derive the countdown's display state at `now`, or null when there is nothing
 * to show (break over for longer than the linger window).
 */
export function breakView(
  now: number,
  startedAt: number,
  endsAt: number,
): BreakViewState | null {
  const sinceEnd = now - endsAt;
  if (sinceEnd >= BREAK_OVER_LINGER_MS) return null;

  const remainingMs = Math.max(0, endsAt - now);
  const total = endsAt - startedAt;
  const fraction =
    total > 0 ? Math.min(1, Math.max(0, remainingMs / total)) : 0;

  const phase: BreakPhase =
    remainingMs <= 0
      ? 'over'
      : remainingMs <= BREAK_CRITICAL_MS
        ? 'critical'
        : remainingMs <= BREAK_WARN_MS
          ? 'warning'
          : 'running';

  // Same colour treatment as TalkTimer's pacing bar.
  const color =
    phase === 'over' || phase === 'critical'
      ? '#f472b6'
      : phase === 'warning'
        ? '#facc15'
        : '#22d3ee';

  return {
    phase,
    remainingMs,
    display: formatBreakMs(remainingMs),
    fraction,
    color,
  };
}
