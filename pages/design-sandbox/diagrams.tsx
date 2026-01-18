import {
  Box,
  ChevronLeft,
  ChevronRight,
  Circle,
  Diamond,
  Grid,
  Hexagon,
  Square,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import Diagram from '@/components/diagrams/Diagram';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

export default function DiagramsPage() {
  const [activeVariant, setActiveVariant] = useState(0);

  const variants = [
    {
      name: 'Square Boxes',
      description: 'Default rectangular nodes',
      icon: <Square className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
    {
      name: 'ASCII Dashed',
      description: 'Dashed borders like ASCII art',
      icon: <Box className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,stroke-dasharray:8 4,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,stroke-dasharray:8 4,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,stroke-dasharray:8 4,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:3px,stroke-dasharray:8 4,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
    {
      name: 'Circle Nodes',
      description: 'Circular containers',
      icon: <Circle className="w-5 h-5" />,
      code: `graph LR
    P((Primary))
    S1((Secondary 1))
    S2((Secondary 2))
    T((Tertiary))
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
    {
      name: 'Diamond Nodes',
      description: 'Decision-style diamonds',
      icon: <Diamond className="w-5 h-5" />,
      code: `graph LR
    P{Primary}
    S1{Secondary 1}
    S2{Secondary 2}
    T{Tertiary}
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
    {
      name: 'Hexagon Nodes',
      description: 'Six-sided containers',
      icon: <Hexagon className="w-5 h-5" />,
      code: `graph LR
    P{{Primary Job}}
    S1{{Secondary 1}}
    S2{{Secondary 2}}
    T{{Tertiary Job}}
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
    {
      name: 'Grid Background',
      description: 'Retro grid pattern backdrop',
      icon: <Grid className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:2px
    classDef gridBg fill:#0a0a0a,stroke:none`,
      background: 'grid',
    },
    {
      name: 'Thick Borders',
      description: 'Extra chunky brutalist borders',
      icon: <Box className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:6px,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:6px,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:6px,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:6px,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:4px`,
    },
    {
      name: 'Filled Boxes',
      description: 'Solid color fills',
      icon: <Box className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#22d3ee,stroke:#22d3ee,color:#000,rx:0,ry:0
    style S1 fill:#ec4899,stroke:#ec4899,color:#000,rx:0,ry:0
    style S2 fill:#ec4899,stroke:#ec4899,color:#000,rx:0,ry:0
    style T fill:#facc15,stroke:#facc15,color:#000,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
    {
      name: 'Dotted Lines',
      description: 'Thin dotted connections',
      icon: <Grid className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P -.-> S1
    P -.-> S2
    S1 -.-> T
    S2 -.-> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:1px,stroke-dasharray:2 3`,
    },
    {
      name: 'Arrows',
      description: 'Directional flow indicators',
      icon: <ChevronRight className="w-5 h-5" />,
      code: `graph LR
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P ==> S1
    P ==> S2
    S1 ==> T
    S2 ==> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:3px`,
    },
    {
      name: 'Vertical Flow',
      description: 'Top-down layout',
      icon: <ChevronRight className="w-5 h-5 rotate-90" />,
      code: `graph TD
    P[Primary Job]
    S1[Secondary Job 1]
    S2[Secondary Job 2]
    T[Tertiary Job]
    P --> S1
    P --> S2
    S1 --> T
    S2 --> T
    style P fill:#000,stroke:#22d3ee,stroke-width:3px,color:#22d3ee,rx:0,ry:0
    style S1 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style S2 fill:#000,stroke:#ec4899,stroke-width:3px,color:#ec4899,rx:0,ry:0
    style T fill:#000,stroke:#facc15,stroke-width:3px,color:#facc15,rx:0,ry:0
    linkStyle default stroke:#fff,stroke-width:2px`,
    },
  ];

  const getBackgroundStyle = (background) => {
    if (background === 'grid') {
      return {
        backgroundImage: `
          linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      };
    }
    return {};
  };

  return (
    <>
      <PageSEO
        title={`Diagrams - Design Sandbox - ${siteMetadata.title}`}
        description="Fan In/Fan Out diagram variations in different styles"
      />
      <div className="min-h-screen bg-black">
        <div className="border-b-2 border-white bg-black px-4 py-6">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/design-sandbox"
              className="inline-flex items-center gap-2 font-mono text-sm uppercase text-brutalist-cyan hover:text-brutalist-pink"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Sandbox
            </Link>
            <h1 className="mt-4 font-mono text-4xl font-bold uppercase text-white">
              [DIAGRAMS]
            </h1>
            <p className="mt-2 font-mono text-zinc-400">
              {'// Fan In/Fan Out Pattern - 11 style variations'}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-8">
            <h2 className="mb-4 font-mono text-xl font-bold uppercase text-brutalist-cyan">
              &gt; SELECT VARIANT
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {variants.map((variant) => {
                const idx = variants.indexOf(variant);
                return (
                  <button
                    key={variant.name}
                    onClick={() => setActiveVariant(idx)}
                    className={`border-2 p-4 text-left font-mono transition-colors ${
                      activeVariant === idx
                        ? 'border-brutalist-cyan bg-brutalist-cyan/10 text-brutalist-cyan'
                        : 'border-white bg-black text-white hover:border-brutalist-pink hover:text-brutalist-pink'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-bold uppercase">
                      {variant.icon}
                      <span>[{idx + 1}]</span>
                    </div>
                    <div className="mt-2 text-sm font-bold">{variant.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {variant.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-2 border-white bg-black p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-mono text-2xl font-bold uppercase text-white">
                  {variants[activeVariant].name}
                </h2>
                <p className="mt-1 font-mono text-sm text-zinc-400">
                  {variants[activeVariant].description}
                </p>
              </div>
              <div className="font-mono text-sm text-brutalist-cyan">
                [{activeVariant + 1}/{variants.length}]
              </div>
            </div>

            <div
              className="my-8 rounded-lg p-6"
              style={getBackgroundStyle(variants[activeVariant].background)}
            >
              <Diagram
                type="mermaid"
                caption="Job Dependencies - Fan In/Fan Out Pattern"
              >
                {variants[activeVariant].code}
              </Diagram>
            </div>

            <div className="mt-8">
              <h3 className="mb-3 font-mono text-sm font-bold uppercase text-brutalist-yellow">
                $ CODE
              </h3>
              <pre className="overflow-x-auto border-2 border-zinc-800 bg-black p-4 font-mono text-xs text-brutalist-green">
                {variants[activeVariant].code}
              </pre>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() =>
                setActiveVariant(
                  (activeVariant - 1 + variants.length) % variants.length,
                )
              }
              className="flex flex-1 items-center justify-center gap-2 border-2 border-white bg-black px-6 py-3 font-mono text-sm font-bold uppercase text-white hover:bg-white hover:text-black"
            >
              <ChevronLeft className="h-4 w-4" />
              PREV
            </button>
            <button
              onClick={() =>
                setActiveVariant((activeVariant + 1) % variants.length)
              }
              className="flex flex-1 items-center justify-center gap-2 border-2 border-white bg-black px-6 py-3 font-mono text-sm font-bold uppercase text-white hover:bg-white hover:text-black"
            >
              NEXT
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
