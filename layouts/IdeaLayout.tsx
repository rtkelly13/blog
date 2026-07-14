import type { ReactNode } from 'react';
import type { IdeaFrontMatter } from 'types/IdeaFrontMatter';
import { IdeaKindBadge, IdeaStatusBadge } from '@/components/ideas/IdeaBadges';
import Link from '@/components/Link';
import PageTitle from '@/components/PageTitle';
import SectionContainer from '@/components/SectionContainer';

interface Props {
  frontMatter: IdeaFrontMatter;
  children: ReactNode;
}

/**
 * Workbench layout for an idea (/ideas/[slug]) — working material, not a
 * published post: no SEO block, no comments, no newsletter. The page that
 * renders this sits behind the admin gate.
 */
export default function IdeaLayout({ frontMatter, children }: Props) {
  const { title, kind, status, summary, target, updated, created } =
    frontMatter;
  const touched = updated ?? created;

  return (
    <SectionContainer>
      <article>
        <header className="pt-6 pb-8 border-b-2 border-zinc-800">
          <p className="font-mono text-xs uppercase tracking-widest text-brutalist-yellow mb-4">
            [ idea workbench ]
          </p>
          <PageTitle>{title}</PageTitle>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <IdeaKindBadge kind={kind} />
            <IdeaStatusBadge status={status} />
            {touched && (
              <span className="font-mono text-xs text-zinc-400">
                touched <time dateTime={touched}>{touched}</time>
              </span>
            )}
          </div>
          {summary && (
            <p className="mt-4 font-mono text-sm text-zinc-300 border-l-4 border-brutalist-cyan pl-4 max-w-3xl">
              {summary}
            </p>
          )}
          {target && (
            <p className="mt-2 font-mono text-xs text-zinc-400">
              <span className="text-brutalist-yellow">target:</span> {target}
            </p>
          )}
        </header>

        <div className="pt-10 pb-8 prose prose-invert max-w-none">
          {children}
        </div>

        <footer className="pt-6 border-t-2 border-zinc-800">
          <Link
            href="/ideas"
            className="text-brutalist-yellow hover:text-white font-bold font-mono transition-colors uppercase border-2 border-brutalist-yellow hover:bg-brutalist-yellow hover:text-black px-4 py-2 inline-block"
          >
            &lt; BACK_TO_IDEAS
          </Link>
        </footer>
      </article>
    </SectionContainer>
  );
}
