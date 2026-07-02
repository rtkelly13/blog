import { useStopwatch } from 'react-timer-hook';
import { pacingStatus, type SlideWindow } from '@/lib/slideTiming';

function fmt(totalSeconds: number): string {
  const s = Math.abs(Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** "on track / ~N min ahead / ~N min behind" vs the current slide's window. */
function SlidePace({
  elapsedSeconds,
  window,
}: {
  elapsedSeconds: number;
  window: SlideWindow;
}) {
  const pace = pacingStatus(elapsedSeconds, window);
  const color =
    pace.kind === 'behind'
      ? '#f472b6'
      : pace.kind === 'ahead'
        ? '#facc15'
        : '#22d3ee';
  const label =
    pace.kind === 'on-track' ? 'on track' : `~${pace.minutes} min ${pace.kind}`;

  return (
    <div className="mt-2 flex items-baseline justify-between gap-2 border-t-2 border-zinc-700 pt-2 text-xs uppercase">
      <span className="text-zinc-400">
        slide {window.startMin}–{window.endMin}m
      </span>
      <span className="font-bold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

/**
 * Pacing timer for the presenter console. Counts up from the talk's real start
 * (startedAt from Convex, so it's accurate across reloads/tabs) and, when the
 * talk has a target duration, shows time remaining + a progress bar that turns
 * amber near the end and pink when overtime. Seeded via react-timer-hook's
 * useStopwatch offset; re-mount (keyed on startedAt) resets it for a new talk.
 *
 * When the current slide has a `[⏱ a–b …]` window in its presenter notes,
 * pass it as `slideWindow` to also show a per-slide "on track / ahead /
 * behind" line; slides without a window show nothing extra.
 */
export default function TalkTimer({
  startedAt,
  durationMins,
  slideWindow,
}: {
  startedAt: number;
  durationMins?: number;
  slideWindow?: SlideWindow | null;
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
      {slideWindow && (
        <SlidePace elapsedSeconds={totalSeconds} window={slideWindow} />
      )}
    </div>
  );
}
