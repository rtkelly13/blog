import { Beaker, Palette, Terminal } from 'lucide-react';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const experiments = [
  {
    name: 'Design Sandbox',
    path: '/design-sandbox',
    description: 'Component variations and design system playground',
    icon: <Palette className="w-12 h-12" />,
    status: 'active',
    components: 7,
  },
];

export default function ExperimentsPage() {
  return (
    <>
      <PageSEO
        title={`Experiments - ${siteMetadata.author}`}
        description="Interactive experiments, design systems, and creative prototypes"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <div className="pt-8 pb-10 px-6 bg-zinc-900">
          <div className="flex items-center gap-4 mb-4">
            <Beaker className="w-10 h-10 text-brutalist-cyan" />
            <h1 className="text-4xl font-mono font-bold uppercase text-white md:text-6xl">
              [ EXPERIMENTS ]
            </h1>
          </div>
          <p className="text-lg font-mono text-zinc-400 mt-4">
            <span className="text-brutalist-yellow">&gt;</span> Interactive
            prototypes, design systems, and creative explorations
          </p>
        </div>

        <div className="py-12 px-6">
          <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
            {experiments.map((experiment) => (
              <Link key={experiment.path} href={experiment.path}>
                <div className="bg-zinc-900 border-2 border-white p-8 hover:border-brutalist-cyan transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-[12px_12px_0px_0px_rgba(34,211,238,1)] active:translate-x-1 active:translate-y-1 cursor-pointer group">
                  <div className="flex items-start gap-6">
                    <div className="text-brutalist-cyan group-hover:text-brutalist-pink transition-colors">
                      {experiment.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-mono font-bold text-2xl text-white uppercase group-hover:text-brutalist-cyan transition-colors">
                          {experiment.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-mono uppercase border-2 ${
                            experiment.status === 'active'
                              ? 'border-brutalist-cyan text-brutalist-cyan'
                              : 'border-zinc-600 text-zinc-600'
                          }`}
                        >
                          {experiment.status}
                        </span>
                      </div>
                      <p className="text-zinc-400 font-mono text-sm mb-4">
                        {experiment.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs font-mono text-brutalist-yellow">
                        <span>
                          <Terminal className="w-3 h-3 inline mr-1" />
                          {experiment.components} components
                        </span>
                        <span className="text-white">→ EXPLORE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 max-w-4xl mx-auto border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h2 className="font-mono font-bold text-xl text-brutalist-yellow mb-4 uppercase">
              [ ABOUT_EXPERIMENTS ]
            </h2>
            <div className="space-y-3 text-white font-mono text-sm">
              <p>
                This is a collection of interactive experiments, design systems,
                and creative prototypes.
              </p>
              <div className="text-zinc-400 space-y-1 text-xs">
                <p>
                  <span className="text-brutalist-cyan">&gt;</span> All
                  experiments follow the retro-brutalist ASCII aesthetic
                </p>
                <p>
                  <span className="text-brutalist-cyan">&gt;</span> Components
                  are production-ready and thoroughly tested
                </p>
                <p>
                  <span className="text-brutalist-cyan">&gt;</span> Feel free to
                  explore and use as reference
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
