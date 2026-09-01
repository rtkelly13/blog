import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { renderGraphic } from '../components/graphics/registry';

const base = { width: 1280, height: 720, background: '#0a0a1a', density: 0.5 };
const VARIANTS: [number, number, string[] | undefined][] = [
  [1, 0, undefined],
  [7, 0, undefined],
  [7, 0.25, undefined],
  [42, 0.4, undefined],
  [42, 0.7, ['#22d3ee', '#ec4899']],
  [1, 0.55, undefined],
];

it('vf preview', () => {
  let html =
    '<style>body{background:#111;margin:0;font:12px monospace;color:#888}div{margin:4px}svg{display:block;width:1280px;height:720px}</style>';
  for (const [seed, t, accents] of VARIANTS) {
    const p = { ...base, seed, t, ...(accents ? { accents } : {}) };
    html += `<div>seed=${seed} t=${t} ${accents ? 'ramp' : 'mono'}${renderGraphic('void-field', p)}</div>`;
  }
  writeFileSync('/tmp/vf2/page.html', html);
});
