import { useMutation, useQuery } from 'convex/react';
import PresenceBadge from '@/components/PresenceBadge';
import Reactions from '@/components/Reactions';
import TalkStatsChart from '@/components/TalkStatsChart';
import { api } from '@/convex/_generated/api';

// Right-hand deck sidebar (~1/5 of the screen). The floating reaction bubbles
// (from <Reactions>) rise in the viewport's right 20vw, i.e. within this panel.
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

/**
 * Presenter console (admin second screen): connection status, moderation, and
 * controls while presenting from another view.
 */
export function ConsoleSidebar({ room }: { room: string }) {
  const current = useQuery(api.talks.current);
  const presenters = useQuery(api.talks.presenterCount, { room });
  const end = useMutation(api.talks.end);

  const slide = (current?.currentSlide ?? 0) + 1;
  const clash = typeof presenters === 'number' && presenters > 1;
  const noPresenter = presenters === 0;

  return (
    <aside className={PANEL}>
      <p className="font-mono text-xs uppercase tracking-wider text-brutalist-pink">
        Console
      </p>

      {/* Connection status */}
      <div className="space-y-1 border-2 border-zinc-700 p-3 font-mono text-xs">
        <p className="uppercase tracking-wider text-zinc-500">Status</p>
        <p className="text-brutalist-cyan">● Live · on slide {slide}</p>
        <p
          className={
            clash
              ? 'text-brutalist-pink'
              : noPresenter
                ? 'text-brutalist-yellow'
                : 'text-zinc-400'
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
