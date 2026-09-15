import type { HTMLAttributes } from 'react';
import AsciiGauge, { type AsciiGaugeVariant } from '../AsciiGauge';

export type TelemetryMachineState =
  | 'cruise'
  | 'braking'
  | 'halted'
  | 'spooling'
  | 'idle'
  | 'online';

export interface TelemetryGaugeProps extends HTMLAttributes<HTMLDivElement> {
  /** Current machine operating state. */
  state?: TelemetryMachineState;
  /** Custom label override for state pill. Defaults to uppercase state name. */
  stateLabel?: string;
  /** Current value between min and max (0..100). */
  value: number;
  /** Target or benchmark value. */
  target?: number;
  /** Human-readable metric text (e.g. "52px/s", "100%", "4.2 MB/s"). */
  metricLabel?: string;
  /** Total character length of inner ASCII meter (default 8). */
  barSegments?: number;
  /** Visual glyph variant for underlying AsciiGauge. */
  gaugeVariant?: AsciiGaugeVariant;
  /** Responsive compact mode hiding the status pill on narrow viewports. */
  compact?: boolean;
}

const STATE_BADGE_STYLES: Record<
  TelemetryMachineState,
  {
    bg: string;
    text: string;
    label: string;
    accent:
      | 'primary'
      | 'secondary'
      | 'tertiary'
      | 'success'
      | 'warning'
      | 'danger';
  }
> = {
  cruise: {
    bg: 'bg-intent-success',
    text: 'text-black',
    label: 'CRUISE',
    accent: 'success',
  },
  braking: {
    bg: 'bg-intent-warning',
    text: 'text-black',
    label: 'BRAKING',
    accent: 'warning',
  },
  halted: {
    bg: 'bg-intent-danger',
    text: 'text-white',
    label: 'HALTED',
    accent: 'danger',
  },
  spooling: {
    bg: 'bg-accent-primary',
    text: 'text-black',
    label: 'SPOOLING',
    accent: 'primary',
  },
  idle: {
    bg: 'bg-zinc-700',
    text: 'text-zinc-200',
    label: 'IDLE',
    accent: 'primary',
  },
  online: {
    bg: 'bg-intent-success',
    text: 'text-black',
    label: 'ONLINE',
    accent: 'success',
  },
};

/**
 * Composite terminal telemetry instrument HUD.
 *
 * Combines machine operational status pills, live numeric metric readouts,
 * and an embedded AsciiGauge. Designed for header docking, ticker tape end-slots,
 * and real-time talk presence widgets.
 */
export default function TelemetryGauge({
  state = 'cruise',
  stateLabel,
  value,
  target,
  metricLabel,
  barSegments = 8,
  gaugeVariant = 'block',
  compact = false,
  className = '',
  ...props
}: TelemetryGaugeProps) {
  const badgeConfig = STATE_BADGE_STYLES[state] ?? STATE_BADGE_STYLES.cruise;
  const displayLabel = stateLabel ?? badgeConfig.label;
  const displayMetric = metricLabel ?? `${Math.round(value)}%`;

  return (
    <div
      data-slot="telemetry-gauge"
      className={`inline-flex items-center gap-2.5 px-2.5 py-1 border border-white/20 bg-zinc-950 font-mono text-xs select-none shadow-hard-sm ${className}`}
      {...props}
    >
      {/* State badge pill */}
      {!compact && (
        <span
          className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeConfig.bg} ${badgeConfig.text}`}
        >
          {displayLabel}
        </span>
      )}

      {/* Numeric readout */}
      <span className="font-mono text-xs font-bold text-white min-w-[32px] text-right">
        {displayMetric}
      </span>

      {/* ASCII meter */}
      <AsciiGauge
        value={value}
        target={target}
        length={barSegments}
        variant={gaugeVariant}
        accent={badgeConfig.accent}
        className="text-xs"
      />
    </div>
  );
}
