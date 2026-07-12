import { useRouter } from 'next/router';
import type { ComponentProps } from 'react';
import Link from '@/components/Link';
import ListLayout from '@/layouts/ListLayout';

type Props = ComponentProps<typeof ListLayout>;

/**
 * ListLayout plus a tag-browse sidebar (ported from upstream
 * tailwind-nextjs-starter-blog v2's ListLayoutWithTags). The sidebar lists
 * every tag with its post count, sorted by popularity, and highlights the tag
 * currently being viewed. It only appears on xl viewports; smaller screens
 * get the plain list, which already has search.
 *
 * Tag keys in `tagCounts` are pre-kebab-cased by `getAllTags`, so they are
 * used directly as both label and route segment.
 */
export default function ListLayoutWithTags(props: Props) {
  const router = useRouter();
  const { tagCounts = {} } = props;

  const sortedTags = Object.keys(tagCounts).sort(
    (a, b) => tagCounts[b] - tagCounts[a],
  );
  const currentTag =
    typeof router.query.tag === 'string' ? router.query.tag : undefined;
  const onAllPosts = !currentTag;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 xl:max-w-7xl xl:px-4">
      <div className="xl:flex xl:gap-10">
        <aside className="hidden xl:block w-64 shrink-0 pt-28">
          <nav
            aria-label="Browse by tag"
            className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-auto rounded-md border-2 border-brutalist-cyan bg-black/80 p-5 shadow-glow-cyan"
          >
            {onAllPosts ? (
              <h3 className="font-mono text-sm font-bold uppercase text-brutalist-yellow">
                &gt; ALL_POSTS
              </h3>
            ) : (
              <Link
                href="/blog"
                className="font-mono text-sm font-bold uppercase text-white transition-colors hover:text-brutalist-cyan"
              >
                &gt; ALL_POSTS
              </Link>
            )}
            <ul className="mt-4 space-y-2">
              {sortedTags.map((tag) => (
                <li key={tag}>
                  {currentTag === tag ? (
                    <span
                      aria-current="page"
                      className="font-mono text-sm font-bold uppercase text-brutalist-yellow"
                    >
                      #{tag} ({tagCounts[tag]})
                    </span>
                  ) : (
                    <Link
                      href={`/tags/${tag}`}
                      aria-label={`View posts tagged ${tag}`}
                      className="font-mono text-sm text-gray-300 uppercase transition-colors hover:text-brutalist-cyan"
                    >
                      #{tag} ({tagCounts[tag]})
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <ListLayout {...props} />
        </div>
      </div>
    </div>
  );
}
