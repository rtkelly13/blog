import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import ErrorLine from '@/components/admin/ErrorLine';
import { useRunAction } from '@/components/admin/useRunAction';
import { api } from '@/convex/_generated/api';
import { breakView } from '@/lib/breakCountdown';
import { useDeckMode } from './DeckModeContext';
import { ResolvedRoom } from './ResolvedRoom';

const EXTEND_MS = 60_000;

/** Local ticker — display state is still derived from the server timestamps. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const CONTROL_BTN =
  'border-2 border-white px-3 py-1 font-mono text-xs font-bold uppercase text-black shadow-hard-md';

/** Presenter's +1 min / End controls, shared by the embed and the console. */
function BreakButtons({ room }: { room: string }) {
  const extendBreak = useMutation(api.talks.extendBreak);
  const endBreak = useMutation(api.talks.endBreak);
  const { run, error } = useRunAction();
  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => run(() => extendBreak({ room, byMs: EXTEND_MS }))}
          className={`${CONTROL_BTN} bg-brutalist-yellow`}
        >
          +1 min
        </button>
        <button
          type="button"
          onClick={() => run(() => endBreak({ room }))}
          className={`${CONTROL_BTN} bg-brutalist-pink`}
        >
          ✕ End break
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

function Countdown({
  room,
  minutes,
  title,
}: {
  room: string;
  minutes: number;
  title?: string;
}) {
  const mode = useDeckMode();
  const isAdmin = useQuery(api.talks.isAdmin) === true;
  const status = useQuery(api.talks.breakStatus, { room });
  const startBreak = useMutation(api.talks.startBreak);
  const { run, error } = useRunAction();
  const now = useNow(status != null);
  const view = status ? breakView(now, status.startedAt, status.endsAt) : null;
  // The projected deck (presenter mode) must stay clean — the room sees it. The
  // presenter drives from the console deck / sidebar / live page instead.
  const canControl = isAdmin && mode !== 'presenter';

  if (!view) {
    // No break running: admins get a one-click start with the slide-declared
    // duration (the LivePoll slide-declared-prompt pattern); everyone else
    // sees nothing.
    if (!canControl) return null;
    return (
      <div className="border-2 border-dashed border-brutalist-pink bg-zinc-900 p-5">
        <p className="mb-3 font-mono text-sm uppercase text-brutalist-pink">
          ● {title ?? 'Break'}
        </p>
        <button
          type="button"
          onClick={() =>
            run(() => startBreak({ room, durationMs: minutes * 60_000 }))
          }
          className="border-2 border-white bg-brutalist-pink px-5 py-2 font-mono font-bold uppercase text-black shadow-hard-md"
        >
          ▶ Start {minutes} min break
        </button>
        <ErrorLine error={error} />
      </div>
    );
  }

  return (
    <div className="border-2 border-white bg-zinc-900 p-5 text-center">
      <p className="mb-2 font-mono text-sm uppercase text-brutalist-pink">
        ☕ {title ?? 'Break'}
      </p>
      {view.phase === 'over' ? (
        <p
          className="font-display font-bold uppercase text-brutalist-pink"
          style={{ fontSize: 'clamp(2rem, 7vw, 4.5rem)', lineHeight: 1.05 }}
        >
          Time's up — we're back
        </p>
      ) : (
        <p
          className="font-mono font-bold tabular-nums"
          style={{
            color: view.color,
            fontSize: 'clamp(3.5rem, 14vw, 9rem)',
            lineHeight: 1,
          }}
        >
          {view.display}
        </p>
      )}
      <div className="mt-4 h-3 w-full border-2 border-white bg-black">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${view.fraction * 100}%`,
            background: view.color,
          }}
        />
      </div>
      {canControl && (
        <div className="mt-4">
          <BreakButtons room={room} />
        </div>
      )}
    </div>
  );
}

/**
 * Compact break panel for the presenter console sidebar: start a break of a
 * chosen length, watch the remaining time, extend or end it. Admin-only surface
 * (the mutations are identity-gated server-side regardless).
 */
export function BreakControl({ room }: { room: string }) {
  const status = useQuery(api.talks.breakStatus, { room });
  const startBreak = useMutation(api.talks.startBreak);
  const { run, error } = useRunAction();
  const [mins, setMins] = useState(5);
  const now = useNow(status != null);
  const view = status ? breakView(now, status.startedAt, status.endsAt) : null;

  return (
    <div className="space-y-2 border-2 border-zinc-700 p-3 font-mono text-xs">
      <p className="uppercase tracking-wider text-zinc-500">Break</p>
      {view ? (
        <>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: view.color }}
          >
            {view.phase === 'over' ? "Time's up" : view.display}
          </p>
          <div className="h-2 w-full border-2 border-white bg-black">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${view.fraction * 100}%`,
                background: view.color,
              }}
            />
          </div>
          <BreakButtons room={room} />
        </>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={mins}
            onChange={(e) => setMins(Number(e.target.value))}
            className="w-14 border-2 border-white bg-black px-2 py-1 text-sm text-white focus:border-brutalist-pink focus:outline-none"
            aria-label="Break length in minutes"
          />
          <span className="text-zinc-400">min</span>
          <button
            type="button"
            onClick={() =>
              run(() =>
                startBreak({
                  room,
                  durationMs: Math.max(1, Math.floor(mins || 0)) * 60_000,
                }),
              )
            }
            className={`${CONTROL_BTN} bg-brutalist-cyan`}
          >
            ▶ Start break
          </button>
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/**
 * Presenter-started break countdown, embeddable in MDX slides and on /live.
 * The remaining time is computed everywhere from the same server-side
 * `breakEndsAt` (talks.breakStatus), so the projected break slide, the console
 * and every attendee's phone show one shared clock, with a colour shift as it
 * approaches zero and a "time's up" end state. Renders nothing when no break is
 * running (admins see a one-click start instead). Resolves the live room
 * automatically or takes one.
 */
export default function BreakTimer({
  room,
  minutes = 5,
  title,
}: {
  room?: string;
  /** Slide-declared break length — the admin one-click start uses this. */
  minutes?: number;
  title?: string;
}) {
  return (
    <ResolvedRoom room={room}>
      {(r) => <Countdown room={r} minutes={minutes} title={title} />}
    </ResolvedRoom>
  );
}
