import { useStopwatch } from 'react-timer-hook';

function fmt(totalSeconds: number): string {
  const s = Math.abs(Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Pacing timer for the presenter console. Counts up from the talk's real start
 * (startedAt from Convex, so it's accurate across reloads/tabs) and, when the
 * talk has a target duration, shows time remaining + a progress bar that turns
 * amber near the end and pink when overtime. Seeded via react-timer-hook's
 * useStopwatch offset; re-mount (keyed on startedAt) resets it for a new talk.
 */
export default function TalkTimer({
  startedAt,
  durationMins,
}: {
  startedAt: number;
  durationMins?: number;
}) {
  // Seed the stopwatch with however long the talk has already been running.
  const elapsedNow = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const offset = new Date();
  offset.setSeconds(offset.getSeconds() + elapsedNow);
  const { totalSeconds } = useStopwatch({
    autoStart: true,
    offsetTimestamp: offset,
  });

  const target = (durationMins ?? 0) * 60;
  const remaining = target - totalSeconds;
  const over = target > 0 && remaining < 0;
  const near = target > 0 && !over && remaining <= target * 0.15;
  const pct = target > 0 ? Math.min(100, (totalSeconds / target) * 100) : 0;
  const color = over ? '#f472b6' : near ? '#facc15' : '#22d3ee';

  return (
    <div className="border-2 border-zinc-700 p-3 font-mono">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xl font-bold" style={{ color }}>
          {fmt(totalSeconds)}
        </span>
        {target > 0 && (
          <span className="text-right text-xs uppercase leading-tight text-zinc-400">
            {over ? `+${fmt(remaining)} over` : `${fmt(remaining)} left`}
            <br />
            of {durationMins}m
          </span>
        )}
      </div>
      {target > 0 && (
        <div className="mt-2 h-2 w-full border-2 border-white bg-black">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}
