import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

function Banner() {
  const talk = useQuery(api.talks.current);
  if (!talk) return null; // nothing live (or still connecting) → no banner

  return (
    <a
      href="/live"
      className="absolute left-1/2 top-28 z-30 flex -translate-x-1/2 items-center gap-3 border-2 border-white bg-black px-4 py-2 font-mono shadow-hard-md transition-shadow hover:shadow-hard-lg"
    >
      <span className="flex items-center gap-2 text-sm font-bold uppercase text-brutalist-pink">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-brutalist-pink" />
        Live now
      </span>
      <span className="max-w-[14rem] truncate text-sm text-white sm:max-w-xs">
        {talk.title}
      </span>
      <span className="border-l-2 border-white pl-3 text-sm font-bold uppercase text-brutalist-cyan">
        Join →
      </span>
    </a>
  );
}

/**
 * Homepage hero overlay announcing a live talk. Self-guarding: renders nothing
 * when Convex isn't configured or no talk is live, so the hero is unaffected the
 * rest of the time. Expects a `relative` positioned parent.
 */
export default function LiveTalkBanner() {
  if (!isConvexConfigured) return null;
  return <Banner />;
}
