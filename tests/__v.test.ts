import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { renderGraphic } from '../components/graphics/registry';
import type { GraphicParams } from '../components/graphics/types';
const P=(o:Partial<GraphicParams>={}):GraphicParams=>({width:1280,height:720,seed:7,accent:'#22d3ee',background:'#000000',density:0.55,opacity:1,strokeWidth:2,t:0,occlusion:'#0a0a1a',disorder:0,contrast:1,originX:0.5,originY:0.5,...o});
test('v',()=>{const names=(process.env.LOOK??'').split(',').filter(Boolean);
const rows=names.flatMap(n=>[0,0.3].map(t=>
 `<div style="padding:3px 6px;color:#888;font:11px monospace">${n} t=${t}</div><div style="width:600px;height:338px">${renderGraphic(n,P({t}))}</div>`)).join('');
writeFileSync('/tmp/v.html',`<body style="margin:0;background:#000">${rows}</body>`);});
