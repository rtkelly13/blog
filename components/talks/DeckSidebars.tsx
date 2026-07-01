import { useMutation, useQuery } from 'convex/react';
import PresenceBadge from '@/components/PresenceBadge';
import Reactions from '@/components/Reactions';
import TalkStatsChart from '@/components/TalkStatsChart';
import { api } from '@/convex/_generated/api';
import SlideBody from './SlideBody';

type Slide = { code: string; notes: string | null };
type SetSlide = (args: { room: string; index: number }) => Promise<unknown>;

// Right-hand deck sidebar. The floating reaction bubbles (from <Reactions>) rise
// in the viewport's right 20vw, i.e. within/near this panel.
const PANEL =
  'flex h-full w-full flex-col gap-4 overflow-y-auto border-l-2 border-white bg-zinc-950 p-4';

/** Attendee (watch-along) sidebar: react + see everyone's synced reactions. */
export function AttendeeSidebar({ room }: { room: string }) {
  return (
    <aside className={PANEL}>
      <p className="font-mono text-xs uppercase tracking-wider text-brutalist-cyan">
        React
      </p>
      <Reactions room={room} />
      <p className="mt-auto font-mono text-[10px] uppercase leading-relaxed text-zinc-600">
        Tap to react — everyone's reactions float up here.
      </p>
    </aside>
  );
}

/** Scaled-down live render of a slide for the "next up" preview. */
function Thumb({ code }: { code: string }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        border: '2px solid #3f3f46',
        background: '#000',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '320%',
          transform: 'scale(0.3125)',
          transformOrigin: 'top left',
          padding: '1.5rem',
          pointerEvents: 'none',
        }}
      >
        <SlideBody code={code} />
      </div>
    </div>
  );
}

/**
 * Presenter console (admin second screen): drive the deck (Prev/Next → setSlide,
 * same identity as the presenter), read speaker notes for the current slide,
 * preview what's next, and monitor connection status / reactions / numbers.
 */
export function ConsoleSidebar({
  room,
  slides,
  currentSlide,
  setSlide,
}: {
  room: string;
  slides: Slide[];
  currentSlide: number;
  setSlide: SetSlide;
}) {
  const presenters = useQuery(api.talks.presenterCount, { room });
  const end = useMutation(api.talks.end);

  const last = slides.length - 1;
  const idx = Math.min(Math.max(currentSlide, 0), Math.max(last, 0));
  const notes = slides[idx]?.notes;
  const next = slides[idx + 1];

  const go = (i: number) => {
    const target = Math.min(Math.max(i, 0), last);
    setSlide({ room, index: target }).catch(() => {});
  };

  const clash = typeof presenters === 'number' && presenters > 1;
  const noPresenter = presenters === 0;

  const btn =
    'flex-1 border-2 border-white px-3 py-2 font-mono text-sm font-bold uppercase text-black shadow-hard-md disabled:opacity-40 disabled:shadow-none';

  return (
    <aside className={PANEL}>
      <p className="font-mono text-xs uppercase tracking-wider text-brutalist-pink">
        Console
      </p>

      {/* Drive the deck */}
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase text-zinc-400">
          Slide{' '}
          <span className="text-white">
            {idx + 1} / {slides.length}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(idx - 1)}
            disabled={idx <= 0}
            className={`${btn} bg-white`}
          >
            ◀ Prev
          </button>
          <button
            type="button"
            onClick={() => go(idx + 1)}
            disabled={idx >= last}
            className={`${btn} bg-brutalist-cyan`}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Speaker notes (from the slide's `???` block in the MDX) */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">Notes</p>
        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap border-2 border-zinc-700 bg-black p-3 font-mono text-sm leading-relaxed text-zinc-200">
          {notes || (
            <span className="text-zinc-600">
              No notes for this slide. Add a <code>???</code> block after the
              slide body in the MDX.
            </span>
          )}
        </div>
      </div>

      {/* Next-slide preview */}
      {next && (
        <div>
          <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
            Next up
          </p>
          <Thumb code={next.code} />
        </div>
      )}

      {/* Connection status */}
      <div className="space-y-1 border-2 border-zinc-700 p-3 font-mono text-xs">
        <p className="uppercase tracking-wider text-zinc-500">Status</p>
        <p
          className={
            clash
              ? 'text-brutalist-pink'
              : noPresenter
                ? 'text-brutalist-yellow'
                : 'text-brutalist-cyan'
          }
        >
          {presenters === undefined
            ? 'presenter link: …'
            : clash
              ? `⚠ ${presenters} presenters connected — clash`
              : noPresenter
                ? 'no presenter broadcasting'
                : 'presenter connected'}
        </p>
        <PresenceBadge room={room} />
      </div>

      {/* Monitoring */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
          Reactions
        </p>
        <Reactions room={room} />
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
          Live numbers
        </p>
        <TalkStatsChart room={room} threshold={0} />
      </div>

      <button
        type="button"
        onClick={() => end({}).catch(() => {})}
        className="mt-auto border-2 border-white bg-brutalist-pink px-4 py-2 font-mono text-sm font-bold uppercase text-black shadow-hard-md"
      >
        End talk
      </button>
    </aside>
  );
}
