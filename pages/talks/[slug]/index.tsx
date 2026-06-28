import { Calendar, MapPin, Play, Users } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';
import { getTalkBySlug, getTalkSlugs } from '@/lib/talks';
import formatDate from '@/lib/utils/formatDate';

export async function getStaticPaths() {
  return {
    paths: getTalkSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<{
  frontMatter: TalkFrontMatter;
  slideCount: number;
}> = async ({ params }) => {
  const slug = params.slug as string;
  const talk = await getTalkBySlug(slug);
  if (!talk) return { notFound: true };

  return {
    props: { frontMatter: talk.frontMatter, slideCount: talk.slides.length },
  };
};

export default function TalkLanding({
  frontMatter,
  slideCount,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const {
    slug,
    title,
    date,
    event,
    location,
    audience,
    summary,
    tags,
    videoUrl,
  } = frontMatter;

  return (
    <>
      <PageSEO
        title={`${title} - ${siteMetadata.author}`}
        description={summary}
      />
      <article className="mx-auto max-w-3xl py-10">
        <header className="border-2 border-white bg-zinc-900 p-6">
          <p className="mb-3 font-mono text-xs uppercase text-brutalist-cyan">
            {event}
          </p>
          <h1 className="font-mono text-3xl font-bold uppercase leading-9 tracking-tight text-white md:text-5xl">
            [ {title} ]
          </h1>

          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm text-zinc-300">
            {date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brutalist-yellow" />
                <dd>{formatDate(date)}</dd>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brutalist-yellow" />
                <dd>{location}</dd>
              </div>
            )}
            {audience && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brutalist-yellow" />
                <dd>{audience}</dd>
              </div>
            )}
          </dl>
        </header>

        {summary && (
          <p className="mt-8 font-mono text-lg leading-relaxed text-gray-200">
            {summary}
          </p>
        )}

        {tags?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t-2 border-white pt-8">
          <Link
            href={`/talks/${slug}/present`}
            className="flex items-center gap-2 border-2 border-white bg-brutalist-cyan px-6 py-3 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Play className="h-4 w-4" /> Present
          </Link>
          <Link
            href={`/talks/${slug}/present?pdf=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white bg-white px-6 py-3 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Download PDF
          </Link>
          {videoUrl && (
            <Link
              href={videoUrl}
              className="border-2 border-white bg-brutalist-pink px-6 py-3 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Watch Recording
            </Link>
          )}
          <span className="font-mono text-xs uppercase text-zinc-500">
            {slideCount} slides
          </span>
        </div>
      </article>
    </>
  );
}
