import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import TelemetryGauge, {
  type TelemetryMachineState,
} from '../components/hud/TelemetryGauge';
import TickerTape from '../components/TickerTape';

const sampleItems = [
  'PARQUET_TYPE_PROVIDER // ZERO-ALLOCATION GENERATION',
  'DISTRIBUTED_SYSTEMS // RAFT CONSENSUS LOG PROTOCOL',
  'PERFORMANCE // MICRO-BENCHMARKS HIT 12.4 GB/s',
  'CONVEX_BACKEND // LIVE TALK REALTIME Q&A ACTIVE',
  'BRUTALIST_UI // ZERO BORDER RADIUS ENFORCED',
];

const meta = {
  title: 'Terminal/TickerTape',
  component: TickerTape,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    pixelsPerSecond: { control: { type: 'range', min: 10, max: 150, step: 2 } },
    sticky: { control: 'boolean' },
    title: { control: 'text' },
    brakeDuration: {
      control: { type: 'range', min: 0.1, max: 2.0, step: 0.1 },
    },
    spoolDuration: {
      control: { type: 'range', min: 0.1, max: 2.0, step: 0.1 },
    },
  },
} satisfies Meta<typeof TickerTape>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultCruise: Story = {
  args: {
    items: sampleItems,
    pixelsPerSecond: 52,
    title: 'TERMINAL // LATEST_DISPATCHES',
  },
};

export const WithDockedTelemetryHUD: Story = {
  args: {
    items: sampleItems,
    pixelsPerSecond: 52,
    title: 'TELEMETRY // LIVE_FEED',
  },
  render: (args) => {
    const [rate, setRate] = useState(1.0);

    let state: TelemetryMachineState = 'cruise';
    if (rate === 0) state = 'halted';
    else if (rate < 1.0) state = 'braking';

    const pct = Math.round(rate * 100);

    return (
      <div className="p-8">
        <TickerTape
          {...args}
          onVelocityChange={(currentRate) => setRate(currentRate)}
          endAddon={
            <TelemetryGauge
              state={state}
              value={pct}
              metricLabel={`${Math.round(rate * (args.pixelsPerSecond ?? 52))}px/s`}
              barSegments={8}
            />
          }
        />
        <div className="mt-8 font-mono text-xs text-zinc-400">
          * Hover over the marquee to observe smooth momentum braking into a
          stop, and leave to observe flywheel spooling back up.
        </div>
      </div>
    );
  },
};

export const WithSubscribeAction: Story = {
  args: {
    items: sampleItems,
    pixelsPerSecond: 52,
    title: 'COMMUNITY // DISPATCH',
    endAddon: (
      <a
        href="#subscribe"
        className="inline-flex items-center gap-2 px-3 py-1 font-mono text-xs font-bold text-accent-primary hover:bg-accent-primary hover:text-black transition-colors"
      >
        <span>SUBSCRIBE</span>
        <span className="inline-block w-1.5 h-3 bg-accent-primary animate-pulse" />
      </a>
    ),
  },
};

export const StickyHeaderMode: Story = {
  args: {
    items: sampleItems,
    pixelsPerSecond: 52,
    sticky: true,
    title: 'STICKY_STATUS // PINNED',
  },
  render: (args) => (
    <div className="min-h-[120vh] pt-16 p-8">
      <TickerTape {...args} />
      <div className="max-w-2xl mx-auto font-mono text-sm space-y-4 text-zinc-300">
        <h2 className="text-xl font-bold text-white">
          Sticky Marquee Simulation
        </h2>
        <p>
          Scroll down to verify that the marquee remains pinned to the top of
          the viewport with a solid background and hard shadow elevation.
        </p>
        <div className="h-96 border border-zinc-800 p-4 bg-zinc-950 flex items-center justify-center text-zinc-500">
          [ SCROLLABLE ESSAY CONTENT CONTAINER ]
        </div>
        <div className="h-96 border border-zinc-800 p-4 bg-zinc-950 flex items-center justify-center text-zinc-500">
          [ SCROLLABLE ESSAY CONTENT CONTAINER 2 ]
        </div>
      </div>
    </div>
  ),
};
