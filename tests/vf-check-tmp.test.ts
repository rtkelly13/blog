import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import {
  getGenerator,
  graphicDataUri,
  renderGraphic,
  resolveParams,
} from '../components/graphics/registry';

const log = (...a: unknown[]) =>
  appendFileSync(
    '/tmp/vf2/chk.txt',
    `${a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}\n`,
  );
const numbers = (svg: string) => (svg.match(/-?\d+\.?\d*/g) ?? []).map(Number);

it('check', () => {
  writeFileSync('/tmp/vf2/chk.txt', '');
  const g = getGenerator('void-field')!;
  const p = resolveParams('void-field', { seed: 7, density: 0.6 });
  const s = g.sample(p);
  const base = numbers(g.project(s, p, 0));
  let prev = base;
  let peak = 0;
  let worst = 0;
  for (let i = 1; i <= 300; i++) {
    const next = numbers(g.project(s, p, i / 300));
    for (let k = 0; k < base.length; k++) {
      peak = Math.max(peak, Math.abs(next[k] - base[k]));
      worst = Math.max(worst, Math.abs(next[k] - prev[k]));
    }
    prev = next;
  }
  log(
    'peak',
    peak.toFixed(1),
    'worst',
    worst.toFixed(1),
    'ratio',
    (peak / worst).toFixed(2),
  );
  for (const d of [0.2, 0.5, 1]) {
    for (const seed of [1, 7, 42]) {
      const svg = renderGraphic('void-field', { seed, density: d });
      log(
        'density',
        d,
        'seed',
        seed,
        'uri',
        graphicDataUri('void-field', { seed, density: d }).length,
        'svg',
        svg.length,
        'elements',
        (
          svg.match(/<(path|rect|circle|line|polygon|polyline|ellipse)\b/g) ??
          []
        ).length,
      );
    }
  }
});
