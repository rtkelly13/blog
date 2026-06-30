import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface ToastWallProps {
  talkSlug: string;
}

/**
 * The projected audience wall. Subscribes to revealed submissions and updates
 * live as students send them (after the 5s moderation buffer). Designed to be
 * legible across a classroom.
 */
export default function ToastWall({ talkSlug }: ToastWallProps) {
  const submissions = useQuery(api.toast.wall, { talkSlug });

  return (
    <div className="min-h-screen bg-black px-6 py-8">
      <div className="mb-8 flex items-baseline justify-between border-b-2 border-white pb-4">
        <h1 className="font-mono text-3xl font-bold uppercase text-white md:text-5xl">
          [ How to make toast ]
        </h1>
        <span className="font-mono text-lg text-brutalist-yellow">
          {submissions?.length ?? 0} recipes
        </span>
      </div>

      {submissions === undefined ? (
        <p className="font-mono text-xl text-zinc-500">Connecting…</p>
      ) : submissions.length === 0 ? (
        <p className="font-mono text-xl text-zinc-400">
          <span className="text-brutalist-cyan">&gt;</span> Waiting for the
          first recipe…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {submissions.map((entry) => (
            <div
              key={entry._id}
              className="border-2 border-white bg-zinc-900 p-5 shadow-hard-cyan"
            >
              <p className="mb-3 font-mono text-sm font-bold uppercase text-brutalist-cyan">
                {entry.nickname || 'Anonymous chef'}
              </p>
              <ol className="space-y-1">
                {entry.steps.map((step, index) => (
                  <li key={index} className="font-mono text-base text-gray-100">
                    <span className="font-bold text-brutalist-yellow">
                      {index + 1}.
                    </span>{' '}
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
