/** The SVG wrapper every generator's `project` returns. */
import type { GraphicParams } from '../../types';

/** Wrap generator marks in a themed <svg> with optional backdrop + opacity. */
export function frame(params: GraphicParams, inner: string): string {
  const { width, height, opacity, background } = params;
  const bg =
    background && background !== 'transparent'
      ? `<rect width="${width}" height="${height}" fill="${background}"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img">${bg}<g opacity="${opacity}">${inner}</g></svg>`;
}
