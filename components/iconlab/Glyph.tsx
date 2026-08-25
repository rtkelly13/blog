import type { Glyph } from './packs';

/**
 * Renders a specimen from its published path data.
 *
 * Stroke sets take `stroke-linecap` / `stroke-linejoin` on the root `<svg>`
 * and the child paths inherit it — which is the whole mechanism the cap fix
 * relies on. Fill sets ignore both, because the terminal shape is baked into
 * the outline.
 */
export default function GlyphSpecimen({
  glyph,
  size = 44,
  square = false,
  className = '',
}: {
  glyph: Glyph;
  size?: number;
  square?: boolean;
  className?: string;
}) {
  const stroke = glyph.kind === 'stroke';

  return (
    <svg
      role="img"
      aria-label={`${glyph.label} arrow-up, ${glyph.note}`}
      width={size}
      height={size}
      viewBox={glyph.viewBox}
      fill={stroke ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : undefined}
      strokeWidth={stroke ? glyph.strokeWidth : undefined}
      strokeLinecap={stroke ? (square ? 'square' : 'round') : undefined}
      strokeLinejoin={stroke ? (square ? 'miter' : 'round') : undefined}
      className={className}
    >
      {glyph.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
