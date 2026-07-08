import { Calendar, MapPin, Play, Users } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import Link from '@/components/Link';
import LiveTalkBanner from '@/components/LiveTalkBanner';
import RecordingEmbed from '@/components/RecordingEmbed';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';
import { getTalkMeta, getTalkStaticPaths } from '@/lib/talks';
import formatDate from '@/lib/utils/formatDate';
import { youtubeEmbedUrl } from '@/lib/utils/youtubeEmbed';

export const getStaticPaths = getTalkStaticPaths;

export const getStaticProps: GetStaticProps<{
  frontMatter: TalkFrontMatter;
  slideCount: number;
}> = async ({ params }) => {
  const slug = params.slug as string;
  const meta = getTalkMeta(slug);
  if (!meta) return { notFound: true };

  return {
    props: { frontMatter: meta.frontMatter, slideCount: meta.slideCount },
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
    pdf,
    draft,
  } = frontMatter;

  // A YouTube videoUrl becomes an inline player; anything else stays a link.
  const embeddable = videoUrl ? youtubeEmbedUrl(videoUrl) !== null : false;

  return (
    <>
      <PageSEO
        title={`${title} - ${siteMetadata.author}`}
        description={summary}
      />
      {/* Drafts are reachable by URL for admins but shouldn't be indexed. */}
      {draft && (
        <Head>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
      )}
      <article className="mx-auto max-w-3xl py-10">
        {draft && (
          <p className="mb-6 border-2 border-brutalist-pink bg-black px-4 py-2 font-mono text-sm font-bold uppercase text-brutalist-pink">
            ● Draft — unlisted; visible to you as an admin
          </p>
        )}
        <LiveTalkBanner
          slug={slug}
          className="mb-6 flex w-full items-center gap-3 border-2 border-white bg-black px-4 py-3 font-mono shadow-hard-md transition-shadow hover:shadow-hard-lg"
        />
        <header className="border-2 border-white bg-zinc-900 p-6">
          <p className="mb-3 font-mono text-xs uppercase text-brutalist-cyan">
            {event}
          </p>
          <h1 className="font-display text-3xl font-bold uppercase leading-9 tracking-tight text-white md:text-5xl">
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
            href={pdf ?? `/talks/${slug}/present?printMode=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white bg-white px-6 py-3 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Download PDF
          </Link>
          {videoUrl && !embeddable && (
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

        {videoUrl && <RecordingEmbed url={videoUrl} title={title} />}
      </article>
    </>
  );
}
