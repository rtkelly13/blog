import Link from '@/components/Link';
import type { SeriesMetadata } from '../types/Series';

interface SeriesNavigationProps {
  series: SeriesMetadata;
  allInSeries: { slug: string; title: string; order: number }[];
  currentSlug: string;
  prev: { slug: string; title: string; order: number } | null;
  next: { slug: string; title: string; order: number } | null;
}

export default function SeriesNavigation({
  series,
  allInSeries,
  currentSlug,
  prev,
  next,
}: SeriesNavigationProps) {
  return (
    <div className="border-4 border-double border-brutalist-cyan bg-zinc-900 p-6 my-8">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-brutalist-yellow font-mono text-sm">
            📚 SERIES
          </span>
          <div className="flex-1 h-px bg-brutalist-cyan" />
        </div>
        <h3 className="font-mono font-bold text-xl text-white uppercase">
          <Link
            href={`/series/${series.slug}`}
            className="text-brutalist-cyan hover:text-brutalist-pink transition-colors"
          >
            {series.title}
          </Link>
        </h3>
        <p className="font-mono text-sm text-gray-300 mt-2">
          {series.description}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-mono text-xs uppercase text-brutalist-yellow tracking-wider">
          All Parts ({allInSeries.length})
        </h4>
        <ol className="space-y-2">
          {allInSeries.map((post) => {
            const isCurrent = post.slug === currentSlug;
            return (
              <li key={post.slug} className="flex items-start gap-3">
                <span
                  className={`font-mono text-sm font-bold mt-0.5 ${
                    isCurrent ? 'text-brutalist-pink' : 'text-brutalist-cyan'
                  }`}
                >
                  {String(post.order + 1).padStart(2, '0')}.
                </span>
                {isCurrent ? (
                  <span className="font-mono text-sm text-brutalist-pink font-bold flex-1">
                    {post.title}{' '}
                    <span className="text-brutalist-yellow">
                      &lt;- YOU ARE HERE
                    </span>
                  </span>
                ) : (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-mono text-sm text-white hover:text-brutalist-cyan transition-colors flex-1"
                  >
                    {post.title}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {(prev || next) && (
        <div className="mt-6 pt-6 border-t-2 border-brutalist-cyan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prev ? (
              <div>
                <div className="font-mono text-xs uppercase text-brutalist-yellow mb-2">
                  ← Previous in Series
                </div>
                <Link
                  href={`/blog/${prev.slug}`}
                  className="font-mono text-sm text-brutalist-cyan hover:text-brutalist-pink transition-colors border-l-4 border-brutalist-cyan hover:border-brutalist-pink pl-3 block"
                >
                  {prev.title}
                </Link>
              </div>
            ) : (
              <div />
            )}
            {next && (
              <div className="text-right">
                <div className="font-mono text-xs uppercase text-brutalist-yellow mb-2">
                  Next in Series →
                </div>
                <Link
                  href={`/blog/${next.slug}`}
                  className="font-mono text-sm text-brutalist-cyan hover:text-brutalist-pink transition-colors border-r-4 border-brutalist-cyan hover:border-brutalist-pink pr-3 block"
                >
                  {next.title}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
