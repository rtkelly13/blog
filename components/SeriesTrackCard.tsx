import { ArrowRight, Check, Lock } from 'lucide-react';

export type TrackItemStatus = 'completed' | 'current' | 'upcoming';

export interface SeriesTrackItem {
  id: string;
  number: string; // e.g. "01", "02"
  title: string;
  duration?: string; // e.g. "15 min"
  status: TrackItemStatus;
  href?: string;
  summary?: string;
}

export interface SeriesTrackCardProps {
  /** Track index numeral (e.g. "01" or "02"). */
  trackNumber: string;
  /** Track title (e.g. "DISTRIBUTED LOG ARCHITECTURES"). */
  title: string;
  /** Short curriculum or learning path summary. */
  description?: string;
  /** Ordered list of articles or milestones in the series. */
  items: SeriesTrackItem[];
  className?: string;
}

/**
 * Multi-Part Curriculum & Learning Track Card.
 *
 * Implements structured learning navigation with brutalist segmented progress bars,
 * numbered milestones, and hover-elevated task item rows with hard offset shadows.
 */
export default function SeriesTrackCard({
  trackNumber,
  title,
  description,
  items,
  className = '',
}: SeriesTrackCardProps) {
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalCount = items.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      data-slot="series-track-card"
      className={`border-2 border-white bg-black font-mono text-white shadow-hard-lg ${className}`}
    >
      {/* Top Track Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-white bg-zinc-950 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 text-xs font-black bg-accent-primary text-black">
            TRACK {trackNumber}
          </span>
          <span className="text-xs font-bold text-zinc-300 tracking-wider">
            {'// '}
            {title}
          </span>
        </div>
        <div className="text-xs font-bold text-zinc-400">
          {completedCount}/{totalCount} COMPLETED ({progressPct}%)
        </div>
      </div>

      {/* Description & Progress Section */}
      <div className="border-b-2 border-white bg-zinc-900/40 p-4 space-y-3">
        {description && (
          <p className="font-sans text-sm text-zinc-300 leading-relaxed">
            {description}
          </p>
        )}

        {/* Brutalist Progress Bar */}
        <div className="space-y-1">
          <div className="h-3 w-full border border-white bg-zinc-950 p-0.5">
            <div
              className="h-full bg-intent-success transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
            <span>0% START</span>
            <span>TARGET: COMPLETE {totalCount} UNITS</span>
            <span>100% READY</span>
          </div>
        </div>
      </div>

      {/* Track Milestones / Item Rows */}
      <div className="divide-y divide-white/20 p-2 space-y-2">
        {items.map((item) => {
          const isCompleted = item.status === 'completed';
          const isCurrent = item.status === 'current';
          const isUpcoming = item.status === 'upcoming';

          const content = (
            <div
              className={`group flex items-center justify-between gap-4 p-3 border border-white/20 transition-all duration-150 ${
                isCurrent
                  ? 'bg-zinc-900 border-accent-primary shadow-hard-sm'
                  : isCompleted
                    ? 'bg-zinc-950/80 hover:bg-zinc-900'
                    : 'bg-zinc-950/40 opacity-60 hover:opacity-100'
              } hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Index / Status Icon */}
                <div
                  className={`w-6 h-6 shrink-0 flex items-center justify-center font-bold text-xs border ${
                    isCompleted
                      ? 'bg-intent-success border-intent-success text-black'
                      : isCurrent
                        ? 'bg-accent-primary border-accent-primary text-black'
                        : 'border-zinc-700 text-zinc-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isUpcoming ? (
                    <Lock size={12} strokeWidth={2} />
                  ) : (
                    item.number
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold truncate ${
                        isCurrent
                          ? 'text-white'
                          : isCompleted
                            ? 'text-zinc-300'
                            : 'text-zinc-400'
                      }`}
                    >
                      {item.title}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 text-[9px] font-black bg-accent-secondary text-black uppercase tracking-wider">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  {item.summary && (
                    <p className="font-sans text-xs text-zinc-400 line-clamp-1 mt-0.5">
                      {item.summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {item.duration && (
                  <span className="text-[11px] text-zinc-500 font-bold">
                    {item.duration}
                  </span>
                )}
                {item.href ? (
                  <ArrowRight
                    size={14}
                    className="text-zinc-500 group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all"
                  />
                ) : (
                  <span className="text-[10px] text-zinc-600 font-bold">
                    COMING SOON
                  </span>
                )}
              </div>
            </div>
          );

          if (item.href) {
            return (
              <a key={item.id} href={item.href} className="block no-underline">
                {content}
              </a>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
