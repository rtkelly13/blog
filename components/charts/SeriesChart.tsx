import { useId, useMemo } from 'react';
import {
  ACCENT_VAR,
  type Accent,
  CHART_COLOR,
  type CurveName,
  layoutSeries,
} from './chartModel';

interface SeriesChartProps {
  data: readonly (readonly [number, number])[];
  label: string;
  curve?: CurveName;
  accent?: Accent;
  width?: number;
  height?: number;
  /** Draw a square at each data vertex. */
  vertices?: boolean;
}

/**
 * A single series, drawn with one of the five curves this design system
 * permits (see `CURVES` in chartModel). Vertices are squares, not circles —
 * `borderRadius: 0` is a global rule and it applies to marks too.
 */
export default function SeriesChart({
  data,
  label,
  curve = 'linear',
  accent = 'cyan',
  width = 320,
  height = 120,
  vertices = true,
}: SeriesChartProps) {
  const titleId = `${useId()}-title`;
  const model = useMemo(
    () => layoutSeries(data, { curve, width, height }),
    [data, curve, width, height],
  );

  return (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      width="100%"
      style={{ height: 'auto' }}
      role="img"
      aria-labelledby={titleId}
      className="font-mono"
    >
      <title id={titleId}>{label}</title>
      <rect
        x={0}
        y={0}
        width={model.width}
        height={model.height}
        fill="none"
        stroke={CHART_COLOR.grid}
        strokeWidth={1}
      />
      <path
        d={model.path}
        fill="none"
        stroke={ACCENT_VAR[accent]}
        strokeWidth={2}
      />
      {vertices &&
        model.points.map((p) => (
          <rect
            key={`${p.x}-${p.y}`}
            x={p.x - 2.5}
            y={p.y - 2.5}
            width={5}
            height={5}
            fill={CHART_COLOR.ink}
          />
        ))}
    </svg>
  );
}
