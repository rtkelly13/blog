/**
 * Tiling lattices — pure geometry, no randomness and no React.
 *
 * `iso-grid` computes its lattice inline: cell width, cell height, the
 * `row % 2` half-step, and the diamond path, all inside its `sample`. That is
 * fine for one tiling and a liability for four, because the interesting part of
 * a tiling is exactly the part that is easy to get subtly wrong — the offset
 * between rows, the bleed that keeps the frame from showing a bare edge, and
 * the order the vertices come out in.
 *
 * So this module owns that arithmetic and nothing else. A generator built on it
 * is then only two decisions: which cells are interesting, and how they move.
 *
 * ## Why `iso-grid` does not use it
 *
 * Its output is pinned by a committed golden. Routing it through here would
 * change those bytes to produce the same picture, so the duplication stays and
 * this module is for new generators. Worth revisiting only if `iso-grid` is
 * being re-baselined for some other reason.
 *
 * ## Bleed
 *
 * Every lattice is generated past all four edges. A tiling that stops at the
 * frame leaves a ragged margin the moment anything moves, and every generator
 * here moves. `bleed` is in cells, not pixels, because that is the unit the
 * ragged edge is measured in.
 */

/** The tilings this module knows how to lay out. */
export type LatticeKind = 'hex' | 'triangle';

export interface LatticeCell {
  /** Centroid — what a generator rotates, scales or phases about. */
  cx: number;
  cy: number;
  /** Absolute vertices in draw order. The caller closes the path. */
  points: [number, number][];
  /** Lattice indices, for deriving a phase or a wave direction. */
  row: number;
  col: number;
  /**
   * Triangles only: `true` for a downward-pointing cell.
   *
   * A triangular tiling is two interleaved orientations, and most of what makes
   * one look alive is treating them differently — so the distinction is carried
   * rather than left for the caller to re-derive from `col % 2`.
   */
  flipped: boolean;
}

export interface LatticeOpts {
  width: number;
  height: number;
  /**
   * Circumradius for `hex`; side length for `triangle`.
   *
   * One number rather than a width/height pair, because both tilings are
   * regular — their proportions are fixed by the shape, not chosen.
   */
  size: number;
  /** Rows and columns generated beyond each edge. Default 1. */
  bleed?: number;
}

/** √3, written once — it is the whole of hex geometry. */
const SQRT3 = Math.sqrt(3);

/**
 * Pointy-top hexagons.
 *
 * Horizontal spacing is `√3·R` and vertical spacing `1.5·R` — the rows overlap
 * by a quarter of the hex's height, which is what interlocks them. Odd rows
 * shift half a step right.
 */
function hexLattice(o: LatticeOpts): LatticeCell[] {
  const R = o.size;
  const bleed = o.bleed ?? 1;
  const stepX = SQRT3 * R;
  const stepY = 1.5 * R;

  const rows = Math.ceil(o.height / stepY) + bleed * 2;
  const cols = Math.ceil(o.width / stepX) + bleed * 2;

  const cells: LatticeCell[] = [];
  for (let row = -bleed; row < rows - bleed; row++) {
    for (let col = -bleed; col < cols - bleed; col++) {
      const cx = col * stepX + (row & 1 ? stepX / 2 : 0);
      const cy = row * stepY;
      const points: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        // Pointy-top: first vertex straight up, then every 60 degrees.
        const a = (Math.PI / 3) * i - Math.PI / 2;
        points.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      cells.push({ cx, cy, points, row, col, flipped: false });
    }
  }
  return cells;
}

/**
 * Equilateral triangles, alternating up and down.
 *
 * Rows need no offset: the downward triangles fill exactly the gaps the upward
 * ones leave, so a row is self-tiling and the next row stacks directly on it.
 * Within a row, cell `k` starts at `floor(k / 2) · s` — both orientations of a
 * pair share a left edge.
 */
function triangleLattice(o: LatticeOpts): LatticeCell[] {
  const s = o.size;
  const bleed = o.bleed ?? 1;
  const h = (s * SQRT3) / 2;

  const rows = Math.ceil(o.height / h) + bleed * 2;
  const cols = Math.ceil(o.width / s) * 2 + bleed * 2;

  const cells: LatticeCell[] = [];
  for (let row = -bleed; row < rows - bleed; row++) {
    const y = row * h;
    for (let col = -bleed * 2; col < cols; col++) {
      const x = Math.floor(col / 2) * s;
      const flipped = (col & 1) === 1;
      const points: [number, number][] = flipped
        ? [
            [x, y],
            [x + s, y],
            [x + s / 2, y + h],
          ]
        : [
            [x, y + h],
            [x + s, y + h],
            [x + s / 2, y],
          ];
      cells.push({
        cx: x + s / 2,
        // Centroid is a third of the way from the base toward the apex.
        cy: flipped ? y + h / 3 : y + (2 * h) / 3,
        points,
        row,
        col,
        flipped,
      });
    }
  }
  return cells;
}

/** Lay out a tiling across the frame, with bleed past every edge. */
export function lattice(kind: LatticeKind, opts: LatticeOpts): LatticeCell[] {
  return kind === 'hex' ? hexLattice(opts) : triangleLattice(opts);
}

/**
 * A cell's vertices as SVG path data, scaled about its own centroid.
 *
 * Scaling about the centroid is the one transform a tiling survives: every cell
 * shrinks toward its own centre, so the gaps open evenly and no cell ever
 * crosses into another. Pass `1` for the untransformed polygon — there is no
 * separate plain-path helper because nothing wanted one.
 */
export function scaledPath(
  cell: LatticeCell,
  scale: number,
  round: (n: number) => number,
): string {
  let d = '';
  for (let i = 0; i < cell.points.length; i++) {
    const [x, y] = cell.points[i];
    const sx = cell.cx + (x - cell.cx) * scale;
    const sy = cell.cy + (y - cell.cy) * scale;
    d += `${i === 0 ? 'M' : 'L'}${round(sx)} ${round(sy)} `;
  }
  return `${d.trim()} Z`;
}
