import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  DRIFT_OF_FRAME,
  frame,
  lerp,
  mulberry32,
  r2,
  range,
  withAlpha,
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
    const edgeColor = withAlpha(p.accent, 0.35);
    const dotColor = withAlpha(p.accent, 0.95);
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
      lines += `<line x1="${r2(at[i].x)}" y1="${r2(at[i].y)}" x2="${r2(at[j].x)}" y2="${r2(at[j].y)}" stroke="${edgeColor}" stroke-width="${p.strokeWidth}"/>`;
    }
    let dots = '';
    for (const n of at) {
      dots += `<circle cx="${r2(n.x)}" cy="${r2(n.y)}" r="${r2(n.rad)}" fill="${dotColor}"/>`;
    }
    return frame(p, lines + dots);
  },
});
