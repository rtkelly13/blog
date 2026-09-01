import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { graphicDataUri, renderGraphic } from '../components/graphics/registry';

const base = {
  width: 1280,
  height: 720,
  seed: 1,
  accent: '#22d3ee',
  background: '#0a0a1a',
  density: 0.5,
  opacity: 1,
  strokeWidth: 2,
  t: 0,
  occlusion: '#0a0a1a',
  disorder: 0,
  contrast: 1,
  originX: 0.5,
  originY: 0.5,
};

const VARIANTS = [[1,0,undefined],[7,0,['#22d3ee','#ec4899']],[42,0.4,undefined],[7,0.55,['#22d3ee','#ec4899']]];

it('vf preview', () => {
  let html = '<style>body{background:#111;margin:0;font:12px monospace;color:#888}div{margin:4px}svg{display:block;width:1280px;height:720px}</style>';
  for (const [seed, t, accents] of VARIANTS as [number, number, string[] | undefined][]) {
    {
      {
        const p = { ...base, seed, t, ...(accents ? { accents } : {}) };
        html += `<div>seed=${seed} t=${t} ${accents ? 'ramp' : 'mono'}${renderGraphic('void-field', p)}</div>`;
      }
    }
  }
  writeFileSync('/tmp/vfprev/page.html', html);
  const uri = graphicDataUri('void-field', { ...base, density: 1 });
  writeFileSync('/tmp/vfprev/size.txt', `dataURI density1 bytes: ${uri.length}\nsvg bytes: ${renderGraphic('void-field', { ...base, density: 1 }).length}\n`);
});
