import { useMutation } from 'convex/react';
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

/** Moderator sidebar (admin second screen): monitor + control while presenting. */
export function ModerationSidebar({ room }: { room: string }) {
  const end = useMutation(api.talks.end);
  return (
    <aside className={PANEL}>
      <p className="font-mono text-xs uppercase tracking-wider text-brutalist-pink">
        Moderation
      </p>

      <PresenceBadge room={room} />

      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">React</p>
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
