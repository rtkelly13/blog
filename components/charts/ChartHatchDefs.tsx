import { hatchAngle, hatchId } from '@/lib/charts/hatch';
import { CHART_PALETTE } from '@/lib/charts/palette';

/**
 * Hidden SVG `<defs>` holding one hatch pattern per palette slot.
 *
 * Each pattern strokes `var(--ts-chart-N)` rather than a hex, so the texture
 * re-themes with everything else — CSS variables inherit into the pattern from
 * `:root`, where the palette is defined.
 *
 * Sized 0×0 and positioned out of flow rather than `display: none`: a paint
 * server in a fully hidden subtree is not reliably resolvable across browsers,
 * while a zero-size absolutely-positioned `<svg>` always is.
 *
 * `prefix` must be unique per mount (pass React's `useId()`), because pattern
 * ids are document-global and two charts on one page would otherwise collide.
 */
export default function ChartHatchDefs({ prefix }: { prefix: string }) {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {CHART_PALETTE.map((color, slot) => (
          <pattern
            key={hatchId(prefix, slot)}
            id={hatchId(prefix, slot)}
            width={8}
            height={8}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${hatchAngle(slot)})`}
          >
            {/* A washed ground keeps the bar readable as a filled shape; the
                stripe carries the identity. Both use the same slot colour. */}
            <rect width={8} height={8} fill={color} fillOpacity={0.28} />
            <line x1={0} y1={0} x2={0} y2={8} stroke={color} strokeWidth={4} />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
