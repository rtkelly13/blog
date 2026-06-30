import { isConvexConfigured } from '@/lib/convexClient';
import { usePresence } from '@/lib/usePresence';

function LivePresence({ room }: { room: string }) {
  const count = usePresence(room);
  const label = count === 1 ? 'person' : 'people';
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm uppercase text-brutalist-cyan">
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-brutalist-cyan"
        aria-hidden
      />
      👥 {count ?? '—'} {label} here
    </span>
  );
}

/**
 * Live, de-duplicated presence count for a room. Self-guarding: renders nothing
 * when Convex isn't configured (so it's safe to drop into any page), and only
 * mounts the heartbeat/query when the provider is present.
 */
export default function PresenceBadge({ room }: { room: string }) {
  if (!isConvexConfigured) return null;
  return <LivePresence room={room} />;
}
