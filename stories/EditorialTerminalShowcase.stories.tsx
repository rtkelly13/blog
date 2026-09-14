import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ArticleMetadataGrid from '../components/ArticleMetadataGrid';
import AuthorColophon from '../components/AuthorColophon';
import ColossalFooter from '../components/ColossalFooter';
import ArchitectureDiagram from '../components/diagrams/ArchitectureDiagram';
import TelemetryGauge, {
  type TelemetryMachineState,
} from '../components/hud/TelemetryGauge';
import SeriesTrackCard from '../components/SeriesTrackCard';
import TickerTape from '../components/TickerTape';

const meta = {
  title: 'Showcase/EditorialTerminalArticle',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const sampleTickerItems = [
  'NEW: DISTRIBUTED COMMIT LOG IN .NET 10',
  'BENCHMARK: 12.8M MSGS/SEC ZERO-ALLOCATION',
  'ARCHITECTURE: RAFT PARTITION REPLICATION',
  'ESTATE: DESIGN-SYSTEM 0.6.0 DUAL-MODE PARITY',
];

const sampleSeriesItems = [
  {
    id: 'step-1',
    number: '01',
    title: 'The Storage Engine: Binary Log Format & CRC32',
    summary:
      'Disk layout, pre-allocated log segments, zero-copy socket transfers.',
    duration: '14 min',
    status: 'completed' as const,
    href: '#part-1',
  },
  {
    id: 'step-2',
    number: '02',
    title: 'Partition Replication & Raft Consensus State Machine',
    summary: 'Leader election, heartbeat timeouts, quorum replication.',
    duration: '22 min',
    status: 'completed' as const,
    href: '#part-2',
  },
  {
    id: 'step-3',
    number: '03',
    title: 'Zero-Copy Vectorized Batching with SIMD',
    summary: 'Vector256 batch processing and memory-mapped ring buffers.',
    duration: '18 min',
    status: 'current' as const,
    href: '#part-3',
  },
  {
    id: 'step-4',
    number: '04',
    title: 'Consumer Group Rebalancing Protocols',
    summary: 'Cooperative sticky assignment and offset commit barriers.',
    duration: '16 min',
    status: 'upcoming' as const,
  },
];

export const FullEditorialArticle: Story = {
  render: () => {
    const [rate, setRate] = useState(1.0);

    let state: TelemetryMachineState = 'cruise';
    if (rate === 0) state = 'halted';
    else if (rate < 1.0) state = 'braking';

    const pct = Math.round(rate * 100);

    return (
      <div className="min-h-screen bg-black text-white selection:bg-accent-primary selection:text-black">
        {/* 1. TickerTape with Docked Telemetry HUD */}
        <TickerTape
          items={sampleTickerItems}
          pixelsPerSecond={52}
          onVelocityChange={(currentRate) => setRate(currentRate)}
          endAddon={
            <TelemetryGauge
              state={state}
              value={pct}
              metricLabel={`${Math.round(rate * 52)}px/s`}
              barSegments={8}
            />
          }
        />

        {/* Site Header Shell */}
        <div className="border-b-2 border-white bg-zinc-950 px-6 py-4 font-mono text-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-accent-primary text-black font-black">
                &gt;_
              </span>
              <span className="font-bold tracking-widest text-white">
                RYAN KELLY
              </span>
            </div>
            <nav className="flex items-center gap-6 text-zinc-400 font-bold">
              <span className="text-white hover:text-accent-primary cursor-pointer">
                ESSAYS
              </span>
              <span className="hover:text-accent-primary cursor-pointer">
                TRACKS
              </span>
              <span className="hover:text-accent-primary cursor-pointer">
                SCHEMATICS
              </span>
              <span className="hover:text-accent-primary cursor-pointer">
                ABOUT
              </span>
            </nav>
          </div>
        </div>

        {/* Article Container */}
        <article className="max-w-4xl mx-auto px-6 pt-12 pb-16 space-y-10">
          {/* Headline Display Scale */}
          <div className="space-y-4">
            <div className="font-mono text-xs font-bold text-accent-primary">
              {'// DISPATCH 042 // DISTRIBUTED LOG INTERNALS'}
            </div>
            <h1
              className="font-black uppercase tracking-[-0.035em] text-white"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.75rem)',
                lineHeight: 0.9,
              }}
            >
              Building a Distributed Log Engine in Modern .NET
            </h1>
            <p className="font-sans text-lg text-zinc-300 leading-relaxed max-w-3xl">
              How we built a partition-replicated streaming commit log achieving
              12.8 million messages per second on commodity NVMe hardware with
              zero garbage collection overhead.
            </p>
          </div>

          {/* 2. Article Metadata Grid */}
          <ArticleMetadataGrid
            published="SEPTEMBER 14, 2026"
            readTime="18 MIN READ (~4,200 WORDS)"
            series={{
              name: 'DISTRIBUTED ARCHITECTURE',
              part: 3,
              totalParts: 4,
              href: '#track',
            }}
            tags={['parquet', 'dotnet', 'distributed', 'concurrency', 'simd']}
          />

          {/* Section 1 Prose */}
          <div className="font-sans text-base text-zinc-300 leading-relaxed space-y-4 pt-4">
            <p>
              When designing distributed streaming storage, the file system
              boundary is your first performance barrier. Standard synchronous
              I/O forces kernel transitions that throttle throughput under
              multi-client concurrency. By decoupling incoming network frames
              from sequential disk flushes via pre-allocated ring buffers and
              asynchronous batching, we saturate PCIe 4.0 storage pipelines
              without lock contention.
            </p>
          </div>

          {/* 3. Monospace Architecture Diagram */}
          <div className="pt-4">
            <ArchitectureDiagram
              title="CLUSTER_TOPOLOGY // PARTITION_0_REPLICATION"
              caption="Figure 1.1: Partition 0 Leader handling TCP append requests and fanning out sync log segments to in-sync followers via Raft."
            />
          </div>

          {/* Section 2 Prose */}
          <div className="font-sans text-base text-zinc-300 leading-relaxed space-y-4 pt-4">
            <p>
              Leader election and log consistency are enforced using a modified
              Raft state machine. Rather than transmitting discrete message
              records, the leader broadcasts compressed byte-span segments.
              Followers verify CRC32 headers in hardware before updating their
              local commit watermark.
            </p>
          </div>

          {/* 4. Series Track Card */}
          <div className="pt-4" id="track">
            <SeriesTrackCard
              trackNumber="01"
              title="DISTRIBUTED STORAGE INTERNALS CURRICULUM"
              description="A hands-on architecture guide building high-throughput distributed commit logs from bare sockets to SIMD vector compression."
              items={sampleSeriesItems}
            />
          </div>

          {/* 5. Author Colophon */}
          <div className="pt-8">
            <AuthorColophon
              authorName="RYAN KELLY"
              authorRole="STAFF ENGINEER // DISTRIBUTED SYSTEMS & COMPILERS"
              bio="I design high-throughput data engines and retro-brutalist developer tooling. Author of Parquet.SourceGenerator, Parquet.TypeProvider, and Resultful."
              sectionMarker="§"
            />
          </div>
        </article>

        {/* 6. Colossal Footer */}
        <ColossalFooter />
      </div>
    );
  },
};
