import { useId, useMemo } from 'react';
import {
  ACCENT_VAR,
  CHART_COLOR,
  type ForceOptions,
  type GraphLink,
  type GraphNode,
  layoutForce,
} from './chartModel';

interface ForceGraphProps extends ForceOptions {
  nodes: readonly GraphNode[];
  links: readonly GraphLink[];
  label: string;
  /** Render the coordinate digest under the graph — the determinism receipt. */
  showDigest?: boolean;
}

/**
 * A force-directed graph rendered once, from settled coordinates.
 *
 * There is no simulation running here: `layoutForce` ticks d3-force to
 * completion during render and hands back final positions, so this is as
 * static as the bar chart. That is only sound because d3-force@3 is
 * deterministic — see the note on `layoutForce`.
 */
export default function ForceGraph({
  nodes,
  links,
  label,
  showDigest = false,
  width,
  height,
  padding,
  ticks,
  charge,
  linkDistance,
  labelWidth,
}: ForceGraphProps) {
  const titleId = `${useId()}-title`;
  // 300 force ticks per render is real work, so this memo matters — and the
  // options are destructured so it can actually depend on their values.
  const model = useMemo(
    () =>
      layoutForce(nodes, links, {
        width,
        height,
        padding,
        ticks,
        charge,
        linkDistance,
        labelWidth,
      }),
    [
      nodes,
      links,
      width,
      height,
      padding,
      ticks,
      charge,
      linkDistance,
      labelWidth,
    ],
  );

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        width="100%"
        style={{ height: 'auto' }}
        role="img"
        aria-labelledby={titleId}
        className="font-mono"
      >
        <title id={titleId}>{label}</title>
        {model.links.map((l) => (
          <line
            key={`${l.source}->${l.target}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={CHART_COLOR.grid}
            strokeWidth={2}
          />
        ))}
        {model.nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x - 6}
              y={n.y - 6}
              width={12}
              height={12}
              fill={ACCENT_VAR[n.accent]}
              stroke={CHART_COLOR.ink}
              strokeWidth={2}
            />
            <text
              x={n.x + 12}
              y={n.y}
              fill={CHART_COLOR.ink}
              fontSize={11}
              dominantBaseline="middle"
            >
              {n.id}
            </text>
          </g>
        ))}
      </svg>
      {showDigest && (
        <figcaption className="mt-2 break-all font-mono text-[10px] leading-relaxed text-zinc-500">
          {'>'} digest: {model.digest}
        </figcaption>
      )}
    </figure>
  );
}
