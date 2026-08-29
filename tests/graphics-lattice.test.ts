/**
 * The tiling maths, tested on its own — which is the point of extracting it.
 *
 * `iso-grid` computes an equivalent lattice inline and has never had a test for
 * it, because there was nothing to import. The properties below are the ones
 * that are easy to get subtly wrong and invisible when you do: a half-step
 * offset in the wrong direction still looks like a tiling, just a broken one.
 */
import { describe, expect, it } from 'vitest';
import {
  type LatticeKind,
  lattice,
  scaledPath,
} from '../components/graphics/lattice';

const FRAME = { width: 1280, height: 720 };
const KINDS: LatticeKind[] = ['hex', 'triangle'];
const r2 = (n: number) => Math.round(n * 100) / 100;

describe.each(KINDS)('lattice(%s)', (kind) => {
  const cells = lattice(kind, { ...FRAME, size: 60 });

  it('is deterministic', () => {
    expect(lattice(kind, { ...FRAME, size: 60 })).toEqual(cells);
  });

  it('covers the frame past every edge', () => {
    // Bleed is the whole reason this is a module: a tiling that stops at the
    // frame shows a ragged margin the moment anything moves, and every
    // generator built on it moves.
    //
    // Measured on vertices rather than centroids, which is the property that
    // matters and not the same thing — the bottom hex row centres exactly on
    // the frame edge and covers well past it.
    const xs = cells.flatMap((c) => c.points.map(([x]) => x));
    const ys = cells.flatMap((c) => c.points.map(([, y]) => y));
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(FRAME.width);
    expect(Math.min(...ys)).toBeLessThan(0);
    expect(Math.max(...ys)).toBeGreaterThan(FRAME.height);
  });

  it('gives every cell a distinct centroid', () => {
    // Catches an offset applied to the wrong axis, which silently stacks cells
    // on top of each other while still looking like a tiling.
    const keys = new Set(cells.map((c) => `${r2(c.cx)}:${r2(c.cy)}`));
    expect(keys.size).toBe(cells.length);
  });

  it('centres every cell on its own vertices', () => {
    for (const c of cells.slice(0, 200)) {
      const mx = c.points.reduce((a, [x]) => a + x, 0) / c.points.length;
      const my = c.points.reduce((a, [, y]) => a + y, 0) / c.points.length;
      expect(mx).toBeCloseTo(c.cx, 6);
      expect(my).toBeCloseTo(c.cy, 6);
    }
  });

  it('scales more cells in as density rises', () => {
    const coarse = lattice(kind, { ...FRAME, size: 120 }).length;
    const fine = lattice(kind, { ...FRAME, size: 40 }).length;
    expect(fine).toBeGreaterThan(coarse);
  });
});

describe('lattice(hex)', () => {
  const R = 60;
  const cells = lattice('hex', { ...FRAME, size: R });

  it('gives six vertices at the circumradius', () => {
    for (const c of cells.slice(0, 100)) {
      expect(c.points).toHaveLength(6);
      for (const [x, y] of c.points) {
        expect(Math.hypot(x - c.cx, y - c.cy)).toBeCloseTo(R, 6);
      }
    }
  });

  it('offsets odd rows by half a step, which is what interlocks them', () => {
    const stepX = Math.sqrt(3) * R;
    const row = (n: number) =>
      cells.filter((c) => c.row === n).sort((a, b) => a.cx - b.cx);
    const even = row(0);
    const odd = row(1);
    expect(even.length).toBeGreaterThan(1);
    expect(odd.length).toBeGreaterThan(1);
    // Neighbouring rows sit half a horizontal step apart — the property that
    // makes it a honeycomb rather than a brick wall.
    const offset = Math.abs((odd[0].cx - even[0].cx) % stepX);
    expect(Math.min(offset, stepX - offset)).toBeCloseTo(stepX / 2, 6);
  });

  it('stacks rows at 3/4 of the hex height', () => {
    // 1.5R, not 2R: the rows overlap by a quarter, which is the interlock.
    const a = cells.find((c) => c.row === 0);
    const b = cells.find((c) => c.row === 1);
    expect(b?.cy ?? 0).toBeCloseTo((a?.cy ?? 0) + 1.5 * R, 6);
  });
});

describe('lattice(triangle)', () => {
  const S = 60;
  const cells = lattice('triangle', { ...FRAME, size: S });

  it('gives three vertices with equal sides', () => {
    for (const c of cells.slice(0, 100)) {
      expect(c.points).toHaveLength(3);
      const [a, b, d] = c.points;
      const sides = [
        Math.hypot(a[0] - b[0], a[1] - b[1]),
        Math.hypot(b[0] - d[0], b[1] - d[1]),
        Math.hypot(d[0] - a[0], d[1] - a[1]),
      ];
      for (const side of sides) expect(side).toBeCloseTo(S, 6);
    }
  });

  it('alternates orientation along a row', () => {
    const row = cells.filter((c) => c.row === 0).sort((a, b) => a.col - b.col);
    for (let i = 1; i < Math.min(row.length, 12); i++) {
      expect(row[i].flipped).toBe(!row[i - 1].flipped);
    }
  });

  it('pairs each orientation on a shared left edge', () => {
    // An up and a down triangle share x, which is what makes a row self-tiling
    // and why rows need no offset between them.
    const row = cells.filter((c) => c.row === 0).sort((a, b) => a.col - b.col);
    const up = row.find((c) => !c.flipped);
    const down = row.find((c) => c.flipped);
    expect(up?.cx).toBeCloseTo(down?.cx ?? -1, 6);
    // …and the two centroids sit either side of the row's midline.
    expect(up?.cy ?? 0).toBeGreaterThan(down?.cy ?? 0);
  });

  it('stacks rows at the triangle height', () => {
    const h = (S * Math.sqrt(3)) / 2;
    const a = cells.find((c) => c.row === 0 && !c.flipped);
    const b = cells.find((c) => c.row === 1 && !c.flipped);
    expect(b?.cy ?? 0).toBeCloseTo((a?.cy ?? 0) + h, 6);
  });
});

describe('paths', () => {
  const cell = lattice('hex', { ...FRAME, size: 60 })[10];

  it('closes the polygon', () => {
    expect(scaledPath(cell, 1, r2)).toMatch(
      /^M[\d.-]+ [\d.-]+( L[\d.-]+ [\d.-]+){5} Z$/,
    );
  });

  it('scales about the centroid, so cells never cross into each other', () => {
    // The one transform a tiling survives: every cell shrinks toward its own
    // centre, so gaps open evenly and no cell reaches its neighbour.
    const half = scaledPath(cell, 0.5, r2);
    const coords = (half.match(/-?\d+\.?\d*/g) ?? []).map(Number);
    for (let i = 0; i < coords.length; i += 2) {
      const [x, y] = [coords[i], coords[i + 1]];
      const full = cell.points[i / 2];
      expect(x).toBeCloseTo(cell.cx + (full[0] - cell.cx) * 0.5, 1);
      expect(y).toBeCloseTo(cell.cy + (full[1] - cell.cy) * 0.5, 1);
    }
  });

  it('is the identity at scale 1', () => {
    const path = scaledPath(cell, 1, r2);
    for (const [x, y] of cell.points) {
      expect(path).toContain(`${r2(x)} ${r2(y)}`);
    }
  });
});
