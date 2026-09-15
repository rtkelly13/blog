export interface ArticleMetadataGridProps {
  /** Publication date string (e.g. "2026-09-14" or "September 14, 2026"). */
  published: string;
  /** Estimated reading time or word count (e.g. "12 MIN READ" or "~3,400 WORDS"). */
  readTime: string;
  /** Optional series context (e.g. "DISTRIBUTED // PART 02"). */
  series?: {
    name: string;
    part?: number;
    totalParts?: number;
    href?: string;
  };
  /** List of topic or technology tags. */
  tags: string[];
  className?: string;
}

/**
 * High-density 4-column editorial metadata grid.
 *
 * Replaces unstructured inline frontmatter rows with a brutalist key/value
 * matrix. Features hard cell borders, monospace category headers, and responsive
 * 2-to-4 column reflow.
 */
export default function ArticleMetadataGrid({
  published,
  readTime,
  series,
  tags,
  className = '',
}: ArticleMetadataGridProps) {
  return (
    <div
      data-slot="article-metadata-grid"
      className={`grid grid-cols-2 md:grid-cols-4 border-2 border-white bg-black font-mono text-xs text-white divide-y-2 md:divide-y-0 md:divide-x-2 divide-white shadow-hard-sm ${className}`}
    >
      {/* 1. PUBLISHED */}
      <div className="p-3.5 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">
          [ PUBLISHED ]
        </span>
        <span className="text-xs font-bold text-white tracking-wide">
          {published}
        </span>
      </div>

      {/* 2. READ TIME */}
      <div className="p-3.5 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">
          [ READ TIME ]
        </span>
        <span className="text-xs font-bold text-accent-primary tracking-wide">
          {readTime}
        </span>
      </div>

      {/* 3. SERIES */}
      <div className="p-3.5 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">
          [ SERIES TRACK ]
        </span>
        {series ? (
          series.href ? (
            <a
              href={series.href}
              className="text-xs font-bold text-accent-secondary hover:underline truncate"
              title={series.name}
            >
              {series.name}
              {series.part !== undefined &&
                ` (${series.part}/${series.totalParts ?? '?'})`}
            </a>
          ) : (
            <span
              className="text-xs font-bold text-accent-secondary truncate"
              title={series.name}
            >
              {series.name}
              {series.part !== undefined &&
                ` (${series.part}/${series.totalParts ?? '?'})`}
            </span>
          )
        ) : (
          <span className="text-xs font-bold text-zinc-500">STANDALONE</span>
        )}
      </div>

      {/* 4. TAGS */}
      <div className="p-3.5 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">
          [ TOPICS ]
        </span>
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-white/20 hover:border-accent-primary hover:text-accent-primary transition-colors"
            >
              #{tag.toUpperCase()}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] font-bold text-zinc-500 self-center">
              +{tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
