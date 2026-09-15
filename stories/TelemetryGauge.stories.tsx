import type { Meta, StoryObj } from '@storybook/react';
import TelemetryGauge from '../components/hud/TelemetryGauge';

const meta = {
  title: 'Terminal/TelemetryGauge',
  component: TelemetryGauge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: ['cruise', 'braking', 'halted', 'spooling', 'idle', 'online'],
    },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    target: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    metricLabel: { control: 'text' },
    barSegments: { control: { type: 'number', min: 4, max: 20 } },
    compact: { control: 'boolean' },
  },
} satisfies Meta<typeof TelemetryGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CruiseSteady: Story = {
  args: {
    state: 'cruise',
    value: 100,
    metricLabel: '52px/s',
    barSegments: 8,
  },
};

export const DeceleratingBraking: Story = {
  args: {
    state: 'braking',
    value: 45,
    metricLabel: '24px/s',
    barSegments: 8,
  },
};

export const HaltedStop: Story = {
  args: {
    state: 'halted',
    value: 0,
    metricLabel: '0px/s',
    barSegments: 8,
  },
};

export const SpoolingFlywheel: Story = {
  args: {
    state: 'spooling',
    value: 70,
    metricLabel: '38px/s',
    barSegments: 8,
  },
};

export const LivePresence: Story = {
  args: {
    state: 'online',
    stateLabel: 'LIVE',
    value: 84,
    metricLabel: '42 USERS',
    barSegments: 6,
  },
};

export const CompactSlotMode: Story = {
  args: {
    state: 'cruise',
    value: 100,
    metricLabel: '100%',
    barSegments: 6,
    compact: true,
  },
};

export const AllStatesShowcase: Story = {
  args: {
    value: 100,
  },
  render: () => (
    <div className="flex flex-col gap-3 p-6 bg-black border-2 border-white">
      <div className="font-mono text-xs font-bold text-zinc-400 mb-2">
        {'// OPERATIONAL TELEMETRY STATES'}
      </div>
      <TelemetryGauge
        state="cruise"
        value={100}
        metricLabel="52px/s"
        barSegments={8}
      />
      <TelemetryGauge
        state="braking"
        value={45}
        metricLabel="24px/s"
        barSegments={8}
      />
      <TelemetryGauge
        state="halted"
        value={0}
        metricLabel="0px/s"
        barSegments={8}
      />
      <TelemetryGauge
        state="spooling"
        value={72}
        metricLabel="38px/s"
        barSegments={8}
      />
      <TelemetryGauge
        state="online"
        stateLabel="BROADCAST"
        value={92}
        metricLabel="p99 12ms"
        barSegments={8}
      />
    </div>
  ),
};
