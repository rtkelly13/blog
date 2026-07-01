import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

// Homepage hero overlay placement (pinned over the hero, expects relative parent).
const OVERLAY_CLASS =
  'absolute left-1/2 top-28 z-30 flex -translate-x-1/2 items-center gap-3 border-2 border-white bg-black px-4 py-2 font-mono shadow-hard-md transition-shadow hover:shadow-hard-lg';

function Banner({ slug, className }: { slug?: string; className?: string }) {
  const talk = useQuery(api.talks.current);
  if (!talk) return null; // nothing live (or still connecting) → no banner
  // When scoped to a specific talk, only show if that talk is the live one.
  if (slug && talk.slug !== slug) return null;

  return (
    <a href="/live" className={className ?? OVERLAY_CLASS}>
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
 * Announces a live talk with a Join → /live link. Self-guarding: renders nothing
 * when Convex isn't configured or no talk is live.
 *
 * - No `slug`: shows for ANY live talk (homepage hero). Defaults to the overlay
 *   placement, so its parent should be `relative`.
 * - With `slug`: only shows when THAT talk is the live one (e.g. its landing page).
 * - `className` overrides placement (e.g. an inline banner instead of an overlay).
 */
export default function LiveTalkBanner({
  slug,
  className,
}: {
  slug?: string;
  className?: string;
}) {
  if (!isConvexConfigured) return null;
  return <Banner slug={slug} className={className} />;
}
