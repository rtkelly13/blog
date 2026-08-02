import {
  AudioLines,
  Beaker,
  Boxes,
  FlaskConical,
  Gavel,
  Palette,
  Projector,
  Sparkles,
  Terminal,
  Type,
} from 'lucide-react';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const experiments = [
  {
    name: 'Component Library',
    path: '/design-sandbox/component-library',
    description:
      'Every core component rendered in both themes (dark + sketch) side by side',
    icon: <Boxes className="w-12 h-12" />,
    status: 'active',
    components: 5,
  },
  {
    name: 'Design Sandbox',
    path: '/design-sandbox',
    description: 'Component variations and design system playground',
    icon: <Palette className="w-12 h-12" />,
    status: 'active',
    components: 9,
  },
  {
    name: 'Typography Proposals',
    path: '/design-sandbox/typography-proposals',
    description:
      'Font pairing + weight-system proposals to fix the design system',
    icon: <Type className="w-12 h-12" />,
    status: 'active',
    components: 3,
  },
  {
    name: 'Graphics Generators',
    path: '/experiments/graphics',
    description:
      'Seed-driven SVG background + graphic generators for talks and heroes',
    icon: <Sparkles className="w-12 h-12" />,
    status: 'active',
    components: 6,
  },
  {
    name: 'NeanderBonk',
    path: '/experiments/neanderbonk',
    description:
      'Automatic referee for Poetry for Neanderthals — listens to the poet, counts syllables, calls the bonk',
    icon: <Gavel className="w-12 h-12" />,
    status: 'active',
    components: 6,
  },
  {
    name: 'NeanderBonk Lab',
    path: '/experiments/neanderbonk-lab',
    description:
      'The NeanderBonk referee on the bench — type or speak words and see every ruling, without the game around it',
    icon: <FlaskConical className="w-12 h-12" />,
    status: 'active',
    components: 1,
  },
  {
    name: 'NeanderBonk Voice',
    path: '/experiments/neanderbonk-voice',
    description:
      'Can the referee tell who is speaking? Loudness-gate vs voice-profile speaker attribution, live on one microphone',
    icon: <AudioLines className="w-12 h-12" />,
    status: 'active',
    components: 3,
  },
  {
    name: 'Talk Animations',
    path: '/experiments/talk-animations',
    description:
      'Prototype interactive animations for the talk decks — map/reduce, ROP railway, MVU loop, dependency resolution',
    icon: <Projector className="w-12 h-12" />,
    status: 'active',
    components: 5,
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
            <h1 className="text-4xl font-display font-bold uppercase text-white md:text-6xl">
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
                        <h3 className="font-display font-bold text-2xl text-white uppercase group-hover:text-brutalist-cyan transition-colors">
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
            <h2 className="font-display font-bold text-xl text-brutalist-yellow mb-4 uppercase">
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
