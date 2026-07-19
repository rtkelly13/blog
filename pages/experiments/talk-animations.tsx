import { Projector } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

// Client-only, mirroring how the interactives load in MDX.
const load = { ssr: false as const };
const MapReduceViz = dynamic(
  () => import('@/components/interactive/MapReduceViz'),
  load,
);
const RailwayTrack = dynamic(
  () => import('@/components/interactive/RailwayTrack'),
  load,
);
const MvuLoop = dynamic(() => import('@/components/interactive/MvuLoop'), load);
const DepResolve = dynamic(
  () => import('@/components/interactive/DepResolve'),
  load,
);
const Terminal = dynamic(
  () => import('@/components/interactive/Terminal'),
  load,
);

const PAKET_CONVERT = [
  { cmd: 'paket convert-from-nuget --force' },
  {
    out: [
      'Converting from NuGet',
      '  - Analyzing packages.config files',
      '  - Creating paket.dependencies',
      '  - Creating paket.references per project',
      '  - Resolving dependency graph',
    ],
    speed: 60,
  },
  {
    out: ['{{cyan|Locked 47 packages to a single global version set}}'],
    speed: 'instant',
  },
  { cmd: 'git add paket.* && git rm packages.config' },
  {
    out: [
      '{{yellow|Reproducible builds: the lock file is now the source of truth}}',
    ],
    speed: 'instant',
  },
];

function Prototype({
  talk,
  title,
  note,
  children,
}: {
  talk: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b-2 border-white px-6 py-8">
      <div className="mb-1 flex items-baseline gap-3">
        <span className="bg-brutalist-cyan px-1.5 font-mono text-[10px] font-bold uppercase text-black">
          {talk}
        </span>
        <h2 className="font-display text-2xl font-bold uppercase text-white">
          {title}
        </h2>
      </div>
      <p className="mb-3 max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span> {note}
      </p>
      {children}
    </section>
  );
}

export default function TalkAnimationsGallery() {
  return (
    <>
      <PageSEO
        title={`Talk Animations - ${siteMetadata.author}`}
        description="Prototype interactive animations for the talk decks"
      />
      <div className="border-2 border-white bg-black">
        <div className="border-b-2 border-white bg-zinc-900 px-6 pt-8 pb-8">
          <div className="mb-4 flex items-center gap-4">
            <Projector className="h-9 w-9 text-brutalist-cyan" />
            <h1 className="font-display text-4xl font-bold uppercase text-white md:text-5xl">
              [ TALK_ANIMATIONS ]
            </h1>
          </div>
          <p className="max-w-3xl font-mono text-sm text-zinc-400">
            <span className="text-brutalist-yellow">&gt;</span> Prototype
            interactives for the talk decks — each replaces a static diagram
            with a model-first animation (seeded/deterministic, reduced-motion
            aware, dual-theme). Drop into a slide with the same MDX tag.
          </p>
        </div>

        <Prototype
          talk="AWS Batch"
          title="Map/Reduce pipeline"
          note="Jobs flow through a queue into a slot-limited compute environment: one PREPARE job, a MAP array draining through the slots (one loses its spot instance and re-queues), then REDUCE. Replaces the static map/reduce mermaid."
        >
          <MapReduceViz />
        </Prototype>

        <Prototype
          talk="ROP"
          title="Railway track"
          note="A value rides the success rail through the pipeline; bind switches it to the failure rail at the failing step and short-circuits the rest. Pick which step fails."
        >
          <RailwayTrack />
        </Prototype>

        <Prototype
          talk="SAFE"
          title="Model-View-Update loop"
          note="A message makes one lap — View emits it, Update produces a new Model, the View re-renders — and the model counter ticks each lap so the state change is visible."
        >
          <MvuLoop />
        </Prototype>

        <Prototype
          talk="Paket"
          title="Dependency resolution"
          note="The diamond conflict — two packages pin different versions of one dependency — resolved globally to a single version across the solution, then locked."
        >
          <DepResolve />
        </Prototype>

        <Prototype
          talk="Paket"
          title="convert-from-nuget (Terminal)"
          note="The 'let's convert a project' slide as a scripted terminal — reuses the existing Terminal interactive, no new component."
        >
          <Terminal title="paket" script={PAKET_CONVERT} />
        </Prototype>
      </div>
    </>
  );
}
