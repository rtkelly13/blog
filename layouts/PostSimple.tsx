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

export default function PostLayout({
  frontMatter,
  next,
  prev,
  children,
  references,
  hasManualReferences,
}: Props) {
  const { slug, date, title } = frontMatter;

  return (
    <SectionContainer>
      <BlogSEO url={`${siteMetadata.siteUrl}/blog/${slug}`} {...frontMatter} />
      <article>
        <div>
          <header>
            <div className="pb-10 space-y-1 text-center border-b-2 border-zinc-800">
              <dl>
                <div>
                  <dt className="sr-only">Published on</dt>
                  <dd className="text-base font-mono font-medium leading-6 text-brutalist-cyberOrange">
                    <span className="font-bold">&gt;</span>{' '}
                    <time dateTime={date}>{formatDate(date)}</time>
                  </dd>
                </div>
              </dl>
              <div className="py-4">
                <PageTitle>{title}</PageTitle>
              </div>
            </div>
          </header>
          <div
            className="pb-8 border-b-2 border-zinc-800 font-mono"
            style={{ gridTemplateRows: 'auto 1fr' }}
          >
            <div className="xl:pb-0 xl:col-span-3 xl:row-span-2">
              <ReferencesContext.Provider value={references ?? []}>
                <div className="pt-10 pb-8 prose prose-invert max-w-none">
                  {children}
                </div>
              </ReferencesContext.Provider>
              {references && !hasManualReferences && (
                <References references={references} />
              )}
            </div>
            <Comments frontMatter={frontMatter} />
            <footer>
              <div className="flex flex-col text-sm font-medium sm:flex-row sm:justify-between sm:text-base">
                {prev && (
                  <div className="pt-4 xl:pt-8">
                    <Link
                      href={`/blog/${prev.slug}`}
                      className="text-brutalist-cyan hover:text-brutalist-pink transition-colors font-bold uppercase"
                    >
                      &larr; {prev.title}
                    </Link>
                  </div>
                )}
                {next && (
                  <div className="pt-4 xl:pt-8">
                    <Link
                      href={`/blog/${next.slug}`}
                      className="text-brutalist-cyan hover:text-brutalist-pink transition-colors font-bold uppercase"
                    >
                      {next.title} &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </footer>
          </div>
        </div>
      </article>
      <BlogActions />
    </SectionContainer>
  );
}
