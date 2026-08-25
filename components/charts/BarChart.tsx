import { useId, useMemo } from 'react';
import {
  ACCENT_VAR,
  type BarDatum,
  type BarsOptions,
  CHART_COLOR,
  layoutBars,
} from './chartModel';

interface BarChartProps extends BarsOptions {
  data: readonly BarDatum[];
  /** Accessible name for the chart. Also rendered as the SVG <title>. */
  label: string;
  /** Unit suffix appended to value labels, e.g. "KB". */
  unit?: string;
}

/**
 * Horizontal bars, brutalist: hard-edged rects, 2px strokes, mono labels, no
 * fills softer than the accent tokens. `layoutBars` does the arithmetic; every
 * mark below is JSX, so React keeps ownership of the subtree and Storybook's
 * axe pass can see it.
 *
 * Static by construction — no clock, so nothing to pause under
 * `prefers-reduced-motion` and nothing to catch mid-flight in a snapshot.
 */
export default function BarChart({
  data,
  label,
  unit,
  width,
  rowHeight,
  padding,
  labelWidth,
  valueWidth,
  tickCount,
  valueFormat,
  domainMax,
}: BarChartProps) {
  const titleId = `${useId()}-title`;
  // Options are destructured rather than taken as a rest object so the memo can
  // depend on the values themselves — a fresh `{...rest}` literal each render
  // would defeat it.
  const model = useMemo(
    () =>
      layoutBars(data, {
        width,
        rowHeight,
        padding,
        labelWidth,
        valueWidth,
        tickCount,
        valueFormat,
        domainMax,
      }),
    [
      data,
      width,
      rowHeight,
      padding,
      labelWidth,
      valueWidth,
      tickCount,
      valueFormat,
      domainMax,
    ],
  );

  return (
    <svg
      viewBox={`0 0 ${model.width} ${model.height + 22}`}
      width="100%"
      style={{ height: 'auto' }}
      role="img"
      aria-labelledby={titleId}
      className="font-mono"
    >
      <title id={titleId}>{label}</title>

      {/* Gridlines first, so bars sit on top of them. */}
      {model.ticks.map((tick) => (
        <g key={`grid-${tick.value}`}>
          <line
            x1={tick.pos}
            y1={0}
            x2={tick.pos}
            y2={model.height}
            stroke={CHART_COLOR.grid}
            strokeWidth={1}
          />
          <text
            x={tick.pos}
            y={model.height + 16}
            fill={CHART_COLOR.muted}
            fontSize={11}
            textAnchor="middle"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* The value axis itself, at zero. */}
      <line
        x1={model.plotX}
        y1={0}
        x2={model.plotX}
        y2={model.height}
        stroke={CHART_COLOR.ink}
        strokeWidth={2}
      />

      {model.bars.map((bar) => (
        <g key={`${bar.label}-${bar.y}`}>
          <text
            x={model.plotX - 10}
            y={bar.textY}
            fill={CHART_COLOR.ink}
            fontSize={12}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {bar.label}
          </text>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={bar.baseline ? 'none' : ACCENT_VAR[bar.accent]}
            stroke={ACCENT_VAR[bar.accent]}
            strokeWidth={2}
            strokeDasharray={bar.baseline ? '5 4' : undefined}
          />
          <text
            x={bar.x + bar.width + 8}
            y={bar.textY}
            fill={ACCENT_VAR[bar.accent]}
            fontSize={12}
            dominantBaseline="middle"
          >
            {bar.valueLabel}
            {unit ? ` ${unit}` : ''}
            {bar.note ? (
              <tspan fill={CHART_COLOR.muted}> {bar.note}</tspan>
            ) : null}
          </text>
        </g>
      ))}
    </svg>
  );
}
