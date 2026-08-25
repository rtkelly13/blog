import { describe, expect, it } from 'vitest';
import {
  type BarDatum,
  type GraphLink,
  type GraphNode,
  layoutBars,
  layoutForce,
  layoutSeries,
} from '../components/charts/chartModel';

const BARS: BarDatum[] = [
  { label: 'd3-quadtree', value: 1.9 },
  { label: 'd3-force', value: 4.9, accent: 'pink' },
  { label: 'd3-scale', value: 13.0 },
];

describe('layoutBars', () => {
  it('scales bar length in proportion to value', () => {
    const { bars } = layoutBars(BARS);
    const [quadtree, force] = bars;
    // 4.9 / 1.9 ≈ 2.579 — the same ratio must survive the scale.
    expect(force.width / quadtree.width).toBeCloseTo(4.9 / 1.9, 5);
  });

  it('keeps rows inside the plot and in order, without overlapping', () => {
    const { bars, height } = layoutBars(BARS);
    for (const bar of bars) {
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.y + bar.height).toBeLessThanOrEqual(height);
    }
    expect(bars[0].y).toBeLessThan(bars[1].y);
    expect(bars[0].y + bars[0].height).toBeLessThanOrEqual(bars[1].y);
  });

  it('gives duplicate labels distinct rows', () => {
    const dupes: BarDatum[] = [
      { label: 'same', value: 1 },
      { label: 'same', value: 2 },
    ];
    const { bars } = layoutBars(dupes);
    expect(bars[0].y).not.toBe(bars[1].y);
    expect(bars[0].height).toBeGreaterThan(0);
  });

  it('formats values and ticks with the given specifier', () => {
    const { bars, ticks } = layoutBars(BARS, { valueFormat: '.2f' });
    expect(bars[2].valueLabel).toBe('13.00');
    expect(ticks.every((t) => /^\d+\.\d{2}$/.test(t.label))).toBe(true);
  });

  it('defaults the accent to cyan but honours an explicit one', () => {
    const { bars } = layoutBars(BARS);
    expect(bars[0].accent).toBe('cyan');
    expect(bars[1].accent).toBe('pink');
  });

  it('survives an empty series and an all-zero domain', () => {
    expect(layoutBars([]).bars).toEqual([]);
    const zeroed = layoutBars([{ label: 'zero', value: 0 }]);
    expect(Number.isFinite(zeroed.bars[0].width)).toBe(true);
    expect(zeroed.bars[0].width).toBe(0);
  });

  it('respects a pinned domain maximum', () => {
    const { bars, plotWidth } = layoutBars(BARS, { domainMax: 26 });
    // 13 of a pinned 26 is exactly half the plot; `.nice()` leaves 26 alone.
    expect(bars[2].width).toBeCloseTo(plotWidth / 2, 5);
  });
});

describe('layoutSeries', () => {
  const data: [number, number][] = [
    [0, 1],
    [1, 4],
    [2, 2],
    [3, 5],
  ];

  it('builds a path that starts with a moveto and holds no NaN', () => {
    const { path } = layoutSeries(data);
    expect(path.startsWith('M')).toBe(true);
    expect(path).not.toContain('NaN');
  });

  it('emits more vertices for a step curve than a linear one', () => {
    const linear = layoutSeries(data, { curve: 'linear' }).path;
    const step = layoutSeries(data, { curve: 'step' }).path;
    expect(countCommands(step)).toBeGreaterThan(countCommands(linear));
  });

  it('closes the path for linearClosed', () => {
    expect(layoutSeries(data, { curve: 'linearClosed' }).path).toContain('Z');
  });

  it('keeps points inside the viewBox', () => {
    const { points, width, height } = layoutSeries(data, {
      width: 200,
      height: 80,
    });
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(height);
    }
  });

  it('does not divide by zero on a flat series', () => {
    const flat = layoutSeries([
      [0, 5],
      [1, 5],
    ]);
    expect(flat.path).not.toContain('NaN');
    expect(flat.points.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});

const NODES: GraphNode[] = [
  { id: 'app' },
  { id: 'a' },
  { id: 'b' },
  { id: 'lib-v1' },
  { id: 'lib-v2' },
];
const LINKS: GraphLink[] = [
  { source: 'app', target: 'a' },
  { source: 'app', target: 'b' },
  { source: 'a', target: 'lib-v1' },
  { source: 'b', target: 'lib-v2' },
];

describe('layoutForce', () => {
  it('is deterministic — the whole reason it is allowed here', () => {
    const first = layoutForce(NODES, LINKS);
    const second = layoutForce(NODES, LINKS);
    expect(second.digest).toBe(first.digest);
    expect(second.nodes).toEqual(first.nodes);
  });

  it('stays deterministic across differing tick counts', () => {
    const a = layoutForce(NODES, LINKS, { ticks: 50 });
    const b = layoutForce(NODES, LINKS, { ticks: 50 });
    expect(b.digest).toBe(a.digest);
    // A different tick count is a different layout — otherwise the ticks are
    // doing nothing and the determinism check above proves nothing.
    expect(layoutForce(NODES, LINKS, { ticks: 300 }).digest).not.toBe(a.digest);
  });

  it("does not mutate the caller's nodes", () => {
    const nodes: GraphNode[] = [{ id: 'x' }, { id: 'y' }];
    layoutForce(nodes, [{ source: 'x', target: 'y' }]);
    for (const n of nodes) {
      expect(Object.keys(n)).toEqual(['id']);
    }
  });

  it('fits every node inside the viewBox, label gutter included', () => {
    const { nodes, width, height } = layoutForce(NODES, LINKS, {
      width: 300,
      height: 200,
      padding: 20,
      labelWidth: 60,
    });
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(20);
      // Labels are drawn to the right of the marker, so the gutter is what
      // keeps them inside the viewBox rather than clipped by it.
      expect(n.x).toBeLessThanOrEqual(width - 20 - 60);
      expect(n.y).toBeGreaterThanOrEqual(20);
      expect(n.y).toBeLessThanOrEqual(height - 20);
    }
  });

  it('never inverts the x range when the gutter exceeds the width', () => {
    const { nodes } = layoutForce(NODES, LINKS, {
      width: 80,
      padding: 20,
      labelWidth: 200,
    });
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(n.x).toBeGreaterThanOrEqual(20);
    }
  });

  it('resolves link endpoints and drops links naming a missing node', () => {
    const { links } = layoutForce(NODES, [
      ...LINKS,
      { source: 'app', target: 'nope' },
    ]);
    expect(links).toHaveLength(LINKS.length);
    expect(
      links.every((l) => Number.isFinite(l.x1) && Number.isFinite(l.y2)),
    ).toBe(true);
  });

  it('handles a single node with no links', () => {
    const { nodes, links } = layoutForce([{ id: 'lonely' }], []);
    expect(links).toEqual([]);
    expect(Number.isFinite(nodes[0].x)).toBe(true);
  });
});

/** Count SVG path commands, as a proxy for how many segments a curve emitted. */
function countCommands(path: string): number {
  return (path.match(/[A-Za-z]/g) ?? []).length;
}
