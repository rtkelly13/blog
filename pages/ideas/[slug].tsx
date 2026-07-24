import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import type { IdeaFrontMatter } from 'types/IdeaFrontMatter';
import type { Toc } from 'types/Toc';
import { MDXLayoutRenderer } from '@/components/MDXComponents';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import { formatSlug, getFileBySlug, getFiles } from '@/lib/mdx';

const DEFAULT_LAYOUT = 'IdeaLayout';

// Same client-only gating as /ideas and /admin: the idea body renders only
// for a signed-in, allowlisted admin.
const AdminGate = dynamic(() => import('@/components/admin/AdminGate'), {
  ssr: false,
  loading: () => <p className="font-mono text-zinc-400 p-6">Connecting…</p>,
});

export async function getStaticPaths() {
  return {
    paths: getFiles('ideas').map((file) => ({
      params: { slug: formatSlug(file) },
    })),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<{
  idea: { mdxSource: string; toc: Toc; frontMatter: IdeaFrontMatter };
}> = async ({ params }) => {
  // getFileBySlug types frontmatter from the file loosely; the idea files own
  // the real shape (IdeaFrontMatter), so narrow through unknown.
  const idea = (await getFileBySlug(
    'ideas',
    params?.slug as string,
  )) as unknown as {
    mdxSource: string;
    toc: Toc;
    frontMatter: IdeaFrontMatter;
  };
  return { props: { idea } };
};

export default function IdeaPage({
  idea,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { mdxSource, toc, frontMatter } = idea;
  return (
    <>
      {/* Deliberately generic: the title of an unpublished idea shouldn't leak
          through a browser tab or a shared link. The page is noindexed and
          admin-gated regardless (lib/seo/routePolicy.mjs). */}
      <PageSEO
        title={`Idea - ${siteMetadata.author}`}
        description="Admin-only workbench for evolving post and series ideas before drafting."
      />
      <AdminGate>
        <MDXLayoutRenderer
          layout={frontMatter.layout || DEFAULT_LAYOUT}
          toc={toc}
          mdxSource={mdxSource}
          frontMatter={frontMatter}
        />
      </AdminGate>
    </>
  );
}
