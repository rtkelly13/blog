import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import Link from '@/components/Link';
import Tag from '@/components/Tag';
import formatDate from '@/lib/utils/formatDate';

interface TalkCardProps {
  talk: TalkFrontMatter;
}

export default function TalkCard({ talk }: TalkCardProps) {
  const { slug, title, date, event, location, audience, summary, tags, draft } =
    talk;
  const href = `/talks/${slug}`;

  return (
    <div
      className={`h-full bg-zinc-900 border-2 transition-all duration-200 hover:shadow-hard-cyan ${
        draft
          ? 'border-brutalist-pink hover:border-brutalist-pink'
          : 'border-white hover:border-brutalist-cyan'
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-white bg-black px-4 py-2">
        <span className="font-mono text-sm font-bold uppercase text-brutalist-yellow">
          {`${slug}.deck`}
        </span>
        <span className="flex items-center gap-2">
          {draft && (
            <span className="border border-brutalist-pink px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-brutalist-pink">
              Draft
            </span>
          )}
          {date && (
            <span className="font-mono text-xs text-zinc-400">
              {formatDate(date)}
            </span>
          )}
        </span>
      </div>

      <div className="p-6">
        <h2 className="mb-2 font-display text-2xl font-bold uppercase leading-8 tracking-tight text-white">
          <Link href={href} className="hover:text-brutalist-pink">
            [ {title} ]
          </Link>
        </h2>

        <p className="mb-4 font-mono text-xs uppercase text-brutalist-cyan">
          {event}
          {location ? ` // ${location}` : ''}
          {audience ? ` // ${audience}` : ''}
        </p>

        {summary && (
          <p className="mb-4 font-mono text-sm text-gray-200">{summary}</p>
        )}

        {tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/talks/${slug}/present`}
            className="border-b-2 border-brutalist-cyan font-mono text-sm font-bold text-brutalist-cyan transition-colors hover:border-brutalist-pink hover:text-brutalist-pink"
          >
            &gt; PRESENT
          </Link>
          <Link
            href={href}
            className="border-b-2 border-transparent font-mono text-sm font-bold text-gray-300 transition-colors hover:border-white hover:text-white"
          >
            &gt; DETAILS
          </Link>
        </div>
      </div>
    </div>
  );
}
