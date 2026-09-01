import { Radio, Sparkles } from 'lucide-react';
import { GENERATOR_LIST } from '@/components/graphics';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * The tech galleries: where an experiment goes once it has stopped being one.
 *
 * `/experiments` is a workbench — things there are allowed to be half-built,
 * and are allowed to be deleted. A gallery is the opposite promise: a stable
 * URL, a configuration that can be linked to, and something worth coming back
 * to. Moving a thing here is a decision that it has earned permanence.
 */
const GALLERIES = [
  {
    name: 'Backgrounds',
    path: '/gallery/backgrounds',
    description:
      'Deterministic, seamlessly looping SVG background generators. Every one is configurable and linkable.',
    icon: <Radio className="h-10 w-10" />,
    count: `${GENERATOR_LIST.length} generators`,
  },
];

export default function GalleryIndex() {
  return (
    <>
      <PageSEO
        title={`Galleries - ${siteMetadata.author}`}
        description="Long-lived interactive galleries: generative backgrounds and other pieces worth keeping"
      />
      <div className="border-2 border-white bg-black">
        <div className="border-b-2 border-white bg-zinc-900 px-6 pt-8 pb-8">
          <div className="mb-4 flex items-center gap-4">
            <Sparkles className="h-9 w-9 text-brutalist-cyan" />
            <h1 className="font-display text-4xl font-bold uppercase text-white md:text-5xl">
              [ GALLERIES ]
            </h1>
          </div>
          <p className="max-w-3xl font-mono text-sm text-zinc-400">
            <span className="text-brutalist-yellow">&gt;</span> Where an
            experiment goes once it has stopped being one. Everything here has a
            stable URL and a configuration you can link to.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 bg-zinc-800 p-2 md:grid-cols-2">
          {GALLERIES.map((g) => (
            <Link
              key={g.path}
              href={g.path}
              className="group block bg-black p-6 transition-colors hover:bg-zinc-900"
            >
              <div className="mb-4 text-brutalist-cyan">{g.icon}</div>
              <h2 className="font-display text-2xl font-bold uppercase text-white group-hover:text-brutalist-cyan">
                {g.name}
              </h2>
              <p className="mt-2 font-mono text-xs text-zinc-400">
                {g.description}
              </p>
              <p className="mt-3 font-mono text-xs text-brutalist-cyan">
                {g.count} &rarr;
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
