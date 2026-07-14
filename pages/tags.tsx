import { Tags as TagsIcon } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';
import { getAllTags } from '@/lib/tags';
import kebabCase from '@/lib/utils/kebabCase';

export const getStaticProps: GetStaticProps<{
  tags: Record<string, number>;
}> = async () => {
  const tags = await getAllTags('blog');

  return { props: { tags } };
};

export default function Tags({
  tags,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const sortedTags = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);
  return (
    <>
      <PageSEO
        title={`Tags - ${siteMetadata.author}`}
        description="Things I blog about"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="TAGS"
          icon={TagsIcon}
          subtitle="Browse posts by topic"
        />
        <div className="flex flex-wrap px-6 py-12">
          {Object.keys(tags).length === 0 && (
            <p className="font-mono text-zinc-400">
              <span className="text-brutalist-pink">&gt;</span> No tags found.
            </p>
          )}
          {sortedTags.map((t) => {
            return (
              <div key={t} className="mt-2 mb-2 mr-5">
                <Tag text={t} />
                <Link
                  href={`/tags/${kebabCase(t)}`}
                  className="-ml-2 font-mono text-sm font-semibold text-zinc-400 uppercase"
                >
                  {` (${tags[t]})`}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
