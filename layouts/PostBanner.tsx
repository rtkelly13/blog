import NextImage from 'next/image';
import type { ReactNode } from 'react';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import type { Reference } from 'types/Reference';
import BlogActions from '@/components/BlogActions';
import Comments from '@/components/comments';
import Link from '@/components/Link';
import PageTitle from '@/components/PageTitle';
import References, { ReferencesContext } from '@/components/References';
import { BlogSEO } from '@/components/SEO';
import SectionContainer from '@/components/SectionContainer';
import siteMetadata from '@/data/siteMetadata';
import formatDate from '@/lib/utils/formatDate';

interface Props {
  frontMatter: PostFrontMatter;
  children: ReactNode;
  next?: { slug: string; title: string };
  prev?: { slug: string; title: string };
  references?: Reference[];
  /** See ADR-0007 — suppresses the auto-appended section when the body
   * renders `<References />` itself. */
  hasManualReferences?: boolean;
}

export default function PostBanner({
  frontMatter,
  next,
  prev,
  children,
  references,
  hasManualReferences,
}: Props) {
  const { slug, date, title, images } = frontMatter;

  // Use first image from frontmatter, or fallback to placeholder
  const displayImage =
    images && images.length > 0 ? images[0] : '/static/images/twitter-card.png';

  return (
    <>
      <BlogSEO url={`${siteMetadata.siteUrl}/blog/${slug}`} {...frontMatter} />
      <BlogActions />

      {/* Full-width banner - breaks out of container */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <div className="relative aspect-[2/1] w-full border-y-2 border-brutalist-cyan shadow-glow-cyan">
          <NextImage
            src={displayImage}
            alt={title}
            fill
            className="object-cover opacity-80 dark:mix-blend-screen"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
      </div>

      <SectionContainer>
        <article className="relative -mt-24 z-10 bg-black/80 backdrop-blur border border-zinc-800 p-8 rounded-md">
          <header className="pt-6 pb-8 text-center border-b-2 border-zinc-800">
            <div className="space-y-1">
              <dl>
                <dt className="sr-only">Published on</dt>
                <dd className="text-base font-mono font-medium leading-6 text-brutalist-cyberOrange">
                  <span className="font-bold">&gt;</span>{' '}
                  <time dateTime={date}>{formatDate(date)}</time>
                </dd>
              </dl>
              <div className="py-4">
                <PageTitle>{title}</PageTitle>
              </div>
            </div>
          </header>

          <ReferencesContext.Provider value={references ?? []}>
            <div className="pb-8 pt-8 prose prose-invert max-w-none font-mono">
              {children}
            </div>
          </ReferencesContext.Provider>

          {references && !hasManualReferences && (
            <References references={references} />
          )}

          <Comments frontMatter={frontMatter} />

          <footer className="pt-8 border-t-2 border-zinc-800">
            <div className="flex flex-col text-sm font-medium sm:flex-row sm:justify-between sm:text-base">
              {prev && (
                <div className="pt-4 xl:pt-8">
                  <Link
                    href={`/blog/${prev.slug}`}
                    className="text-brutalist-cyan hover:text-brutalist-pink transition-colors font-bold uppercase inline-flex items-center gap-2"
                  >
                    <span>&larr;</span> [ {prev.title} ]
                  </Link>
                </div>
              )}
              {next && (
                <div className="pt-4 xl:pt-8">
                  <Link
                    href={`/blog/${next.slug}`}
                    className="text-brutalist-cyan hover:text-brutalist-pink transition-colors font-bold uppercase inline-flex items-center gap-2"
                  >
                    [ {next.title} ] <span>&rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </footer>
        </article>
      </SectionContainer>
    </>
  );
}
