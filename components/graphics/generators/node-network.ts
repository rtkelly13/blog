import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
  chance,
  cycles,
  DRIFT_OF_FRAME,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  wobble,
} from './shared';

/* ── node-network ─────────────────────────────────────────────────────────── */

interface Node {
  x: number;
  y: number;
  rad: number;
}

interface Network {
  nodes: Node[];
  /** Index pairs, sampled once from the *base* positions. */
  edges: [number, number][];
}

/** Constellation / circuit: scattered nodes wired to their nearest neighbours. */

export default defineGenerator<Network>({
  name: 'node-network',
  label: 'Node Network',
  description: 'Constellation of nodes wired to their nearest neighbours.',
  group: 'field',
  sketch: true,
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(12, 64, p.density));
    const base = Array.from({ length: count }, () => ({
      x: range(rng, 0, p.width),
      y: range(rng, 0, p.height),
    }));

    // Topology is sampled from the base positions and then frozen. Recomputing
    // nearest neighbours per frame would rewire the graph as nodes drift, which
    // is incoherent in exactly the way this split exists to prevent — the
    // constellation would flicker between wirings rather than move.
    const edges: [number, number][] = [];
    for (let i = 0; i < base.length; i++) {
      const nearest = base
        .map((n, j) => ({
          j,
          d: (n.x - base[i].x) ** 2 + (n.y - base[i].y) ** 2,
        }))
        .filter((n) => n.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of nearest) {
        if (j > i) edges.push([i, j]);
      }
    }

    // Radii are drawn after the edge pass in the original, and the edge pass
    // consumes no randomness, so this ordering reproduces the stream exactly.
    const nodes = base.map((n) => ({
      ...n,
      rad: chance(rng, 0.2) ? range(rng, 4, 7) : range(rng, 2, 3.5),
    }));

    return { nodes, edges };
  },
  project: ({ nodes, edges }, p, t) => {
    // A constellation has no depth and no ordering, so the one axis it is
    // already about is *reach*: how far out from the origin a node sits. Radius
    // from the centre, normalised by the half-diagonal, so the core takes one
    // end of the ramp and the outliers the other and the graph reads as
    // spreading outwards. Edges take the position of their midpoint, which puts
    // a wire between the colours of the two nodes it joins.
    const [ox, oy] = centre(p);
    const maxR = Math.hypot(p.width / 2, p.height / 2);
    const reach = (x: number, y: number) => Math.hypot(x - ox, y - oy) / maxR;
    const drift = Math.min(p.width, p.height) * DRIFT_OF_FRAME;

    // Each node orbits its sampled position. Edges are then drawn between the
    // *displaced* positions, so the wires follow the nodes instead of detaching.
    const at = nodes.map((n) => {
      const phase = (n.x + n.y) * 0.01;
      const k = cycles(n.rad, 2);
      return {
        x: n.x + drift * wobble(t, k, phase),
        y: n.y + drift * wobble(t, k, phase + Math.PI / 2),
        rad: n.rad,
      };
    });

    let lines = '';
    for (const [i, j] of edges) {
      const mx = (at[i].x + at[j].x) / 2;
      const my = (at[i].y + at[j].y) / 2;
      const edgeColor = ink(p, reach(mx, my), 0.35);
      lines += `<line x1="${r2(at[i].x)}" y1="${r2(at[i].y)}" x2="${r2(at[j].x)}" y2="${r2(at[j].y)}" stroke="${edgeColor}" stroke-width="${p.strokeWidth}"/>`;
    }
    let dots = '';
    for (const n of at) {
      const dotColor = ink(p, reach(n.x, n.y), 0.95);
      dots += `<circle cx="${r2(n.x)}" cy="${r2(n.y)}" r="${r2(n.rad)}" fill="${dotColor}"/>`;
    }
    return frame(p, lines + dots);
  },
});
