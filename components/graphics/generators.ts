import { withAlpha } from './palette';
import { chance, intRange, mulberry32, type Rng, range } from './rng';
import type { GraphicParams, RenderFn } from './types';

/** Linear interpolate — used to map density (0..1) onto per-generator ranges. */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Wrap generator marks in a themed <svg> with optional backdrop + opacity. */
function frame(params: GraphicParams, inner: string): string {
  const { width, height, opacity, background } = params;
  const bg =
    background && background !== 'transparent'
      ? `<rect width="${width}" height="${height}" fill="${background}"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img">${bg}<g opacity="${opacity}">${inner}</g></svg>`;
}

/** Grid of dots with jittered radius; a scatter of them flare to full accent. */
const dotGrid: RenderFn = (p) => {
  const rng = mulberry32(p.seed);
  const spacing = lerp(96, 34, p.density);
  const faint = withAlpha(p.accent, 0.4);
  const bright = withAlpha(p.accent, 0.95);
  let out = '';
  for (let y = spacing / 2; y < p.height; y += spacing) {
    for (let x = spacing / 2; x < p.width; x += spacing) {
      const hot = chance(rng, 0.06 + p.density * 0.14);
      const rad =
        (hot ? range(rng, 2.5, 4.5) : range(rng, 1, 2.4)) * (spacing / 40);
      out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(rad)}" fill="${hot ? bright : faint}"/>`;
    }
  }
  return frame(p, out);
};

/** Parallel 45° rules; a few lines pop to accent, the rest stay ghostly. */
const diagonalHatch: RenderFn = (p) => {
  const rng = mulberry32(p.seed);
  const gap = lerp(70, 20, p.density);
  const faint = withAlpha(p.accent, 0.32);
  const bright = withAlpha(p.accent, 0.9);
  let out = '';
  for (let o = -p.height; o < p.width; o += gap) {
    const hot = chance(rng, 0.12);
    const w = hot ? p.strokeWidth * 2.5 : p.strokeWidth * range(rng, 0.5, 1.1);
    out += `<line x1="${r2(o)}" y1="0" x2="${r2(o + p.height)}" y2="${p.height}" stroke="${hot ? bright : faint}" stroke-width="${r2(w)}"/>`;
  }
  return frame(p, out);
};

/** Constellation / circuit: scattered nodes wired to their nearest neighbours. */
const nodeNetwork: RenderFn = (p) => {
  const rng = mulberry32(p.seed);
  const count = Math.round(lerp(12, 64, p.density));
  const nodes = Array.from({ length: count }, () => ({
    x: range(rng, 0, p.width),
    y: range(rng, 0, p.height),
  }));
  const edge = withAlpha(p.accent, 0.35);
  const dot = withAlpha(p.accent, 0.95);
  let lines = '';
  for (let i = 0; i < nodes.length; i++) {
    const dists = nodes
      .map((n, j) => ({
        j,
        d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2,
      }))
      .filter((n) => n.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j } of dists) {
      if (j > i) {
        lines += `<line x1="${r2(nodes[i].x)}" y1="${r2(nodes[i].y)}" x2="${r2(nodes[j].x)}" y2="${r2(nodes[j].y)}" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
      }
    }
  }
  let dots = '';
  for (const n of nodes) {
    const rad = chance(rng, 0.2) ? range(rng, 4, 7) : range(rng, 2, 3.5);
    dots += `<circle cx="${r2(n.x)}" cy="${r2(n.y)}" r="${r2(rad)}" fill="${dot}"/>`;
  }
  return frame(p, lines + dots);
};

/** Stacked topographic waves; a couple of bands rise to full accent. */
const contourLines: RenderFn = (p) => {
  const rng = mulberry32(p.seed);
  const count = Math.round(lerp(6, 26, p.density));
  const step = p.width / 48;
  let out = '';
  for (let i = 0; i < count; i++) {
    const base = ((i + 0.5) * p.height) / count;
    const amp = range(rng, 6, 30);
    const freq = range(rng, 1.2, 3.2);
    const phase = range(rng, 0, Math.PI * 2);
    const hot = chance(rng, 0.15);
    const stroke = hot ? withAlpha(p.accent, 0.9) : withAlpha(p.accent, 0.32);
    let d = '';
    for (let x = 0; x <= p.width; x += step) {
      const y =
        base + Math.sin((x / p.width) * Math.PI * 2 * freq + phase) * amp;
      d += `${x === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)} `;
    }
    out += `<path d="${d.trim()}" fill="none" stroke="${stroke}" stroke-width="${hot ? p.strokeWidth * 1.8 : p.strokeWidth}"/>`;
  }
  return frame(p, out);
};

/** Isometric lattice of diamonds; some cells fill with faint accent. */
const isoGrid: RenderFn = (p) => {
  const rng = mulberry32(p.seed);
  const cw = lerp(120, 52, p.density);
  const ch = cw * 0.58;
  const line = withAlpha(p.accent, 0.36);
  const fill = withAlpha(p.accent, 0.22);
  const hot = withAlpha(p.accent, 0.85);
  let out = '';
  for (let row = -1; row * ch * 0.5 < p.height + ch; row++) {
    for (let col = -1; col * cw < p.width + cw; col++) {
      const cx = col * cw + (row % 2 ? cw / 2 : 0);
      const cy = (row * ch) / 2;
      const path = `M${r2(cx)} ${r2(cy - ch / 2)} L${r2(cx + cw / 2)} ${r2(cy)} L${r2(cx)} ${r2(cy + ch / 2)} L${r2(cx - cw / 2)} ${r2(cy)} Z`;
      const flare = chance(rng, 0.05 + p.density * 0.1);
      out += `<path d="${path}" fill="${flare ? hot : chance(rng, 0.12) ? fill : 'none'}" stroke="${line}" stroke-width="${p.strokeWidth}"/>`;
    }
  }
  return frame(p, out);
};

/** Brutalist confetti: scattered rotated squares — outlined, faint, or solid. */
const scatterBlocks: RenderFn = (p) => {
  const rng = mulberry32(p.seed);
  const count = Math.round(lerp(14, 76, p.density));
  const outline = withAlpha(p.accent, 0.5);
  const faint = withAlpha(p.accent, 0.22);
  const solid = withAlpha(p.accent, 0.95);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = range(rng, 0, p.width);
    const y = range(rng, 0, p.height);
    const size = range(rng, 8, 46);
    const rot = intRange(rng, 0, 45);
    const roll = rng();
    const style =
      roll < 0.18
        ? `fill="${solid}"`
        : roll < 0.5
          ? `fill="${faint}"`
          : `fill="none" stroke="${outline}" stroke-width="${p.strokeWidth}"`;
    out += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(size)}" height="${r2(size)}" transform="rotate(${rot} ${r2(x + size / 2)} ${r2(y + size / 2)})" ${style}/>`;
  }
  return frame(p, out);
};

export const GENERATORS: Record<string, RenderFn> = {
  'dot-grid': dotGrid,
  'diagonal-hatch': diagonalHatch,
  'node-network': nodeNetwork,
  contour: contourLines,
  'iso-grid': isoGrid,
  'scatter-blocks': scatterBlocks,
};

export type { Rng };
