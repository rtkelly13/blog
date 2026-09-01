#!/usr/bin/env node
/**
 * Repeatable benchmark for the SVG background renderers.
 *
 *   node bench/graphics/run.mjs
 *   node bench/graphics/run.mjs --generators iso-terrain,contour --frames 96
 *   node bench/graphics/run.mjs --json out.json
 *
 * Bundles the real generator registry with esbuild, serves the harness over
 * http (blob/SVG image decoding needs a real origin), and drives Chromium
 * through every (generator, strategy) pair. Same generator, same frame
 * sequence, same host element for all strategies.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import esbuild from 'esbuild';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

const GENERATORS_ARG = arg(
  'generators',
  'iso-terrain,flow-lines,truchet-arcs,contour',
);
const STRATEGIES = arg(
  'strategies',
  'innerHTML,mutate-scan,mutate-values,canvas-scan,canvas-values,bitmap-cache',
)
  .split(',')
  .filter(Boolean);
const FRAMES = Number(arg('frames', 96));
const REPS = Number(arg('reps', 240));
const LOOP_MS = Number(arg('loop-ms', 2000));
const WIDTH = Number(arg('width', 1280));
const HEIGHT = Number(arg('height', 720));
const JSON_OUT = arg('json', null);
/** Directory to write correctness screenshots into. `--verify <dir>`. */
const VERIFY = arg('verify', null);
/** Tile counts for the gallery scenario. `--tiles 1,2,4,8`, or empty to skip. */
const TILES = arg('tiles', '')
  .split(',')
  .filter(Boolean)
  .map(Number);

const bundle = await esbuild.build({
  entryPoints: [path.join(here, 'entry.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2022',
  platform: 'browser',
  logLevel: 'warning',
});
const bundleJs = bundle.outputFiles[0].text;
const harness = await readFile(path.join(here, 'harness.html'), 'utf8');

const server = createServer((req, res) => {
  if (req.url.startsWith('/bundle.js')) {
    res.writeHead(200, { 'content-type': 'text/javascript' });
    res.end(bundleJs);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(harness);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  args: [
    // Without this Chromium may throttle or skip compositing in headless,
    // which would flatter every strategy equally but make the rAF numbers
    // meaningless.
    '--disable-frame-rate-limit',
    '--disable-gpu-vsync',
  ],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => !!window.BENCH);

// `--generators all` sweeps every generator in the registry — used for the
// canvas-interpreter coverage question rather than for timings.
const GENERATORS =
  GENERATORS_ARG === 'all'
    ? await page.evaluate(() => window.BENCH.names)
    : GENERATORS_ARG.split(',').filter(Boolean);

const results = [];
for (const generator of GENERATORS) {
  for (const strategy of STRATEGIES) {
    process.stderr.write(`  ${generator} / ${strategy} ... `);
    try {
      const r = await page.evaluate(
        (spec) => window.BENCH.run(spec),
        {
          generator,
          strategy,
          frames: FRAMES,
          reps: REPS,
          loopMs: LOOP_MS,
          width: WIDTH,
          height: HEIGHT,
        },
      );
      results.push(r);
      process.stderr.write(
        `${r.workAvgMs.toFixed(2)}ms avg, ${r.loopFps.toFixed(0)}fps\n`,
      );
    } catch (e) {
      process.stderr.write(`FAILED: ${e.message}\n`);
      results.push({ generator, strategy, error: String(e.message) });
    }
  }
}

/* ── gallery scenario ─────────────────────────────────────────────────────── */

const gallery = [];
if (TILES.length) {
  for (const strategy of STRATEGIES) {
    for (const tiles of TILES) {
      process.stderr.write(`  gallery ${GENERATORS[0]} x${tiles} / ${strategy} ... `);
      try {
        const g = await page.evaluate(
          (spec) => window.BENCH.gallery(spec),
          {
            generator: GENERATORS[0],
            strategy,
            tiles,
            frames: FRAMES,
            fps: 24,
            ms: 2500,
            width: WIDTH,
            height: HEIGHT,
          },
        );
        gallery.push({ strategy, ...g });
        process.stderr.write(
          `${g.avgTickMs.toFixed(2)}ms/tick, ${g.overBudgetPct.toFixed(0)}% over budget\n`,
        );
      } catch (e) {
        process.stderr.write(`FAILED: ${e.message}\n`);
      }
    }
  }
}

/* ── correctness pass ─────────────────────────────────────────────────────── */

/**
 * A fast renderer that draws a different picture is not a result. Screenshot
 * the same frame under every strategy and diff it against the `innerHTML`
 * baseline. Small non-zero differences are expected for the canvas paths:
 * different rasteriser, different antialiasing.
 */
const verify = [];
if (VERIFY) {
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(VERIFY, { recursive: true });
  const host = page.locator('#host');
  for (const generator of GENERATORS) {
    let base = null;
    for (const strategy of STRATEGIES) {
      await page.evaluate(
        (spec) => window.BENCH.show(spec),
        {
          generator,
          strategy,
          frames: FRAMES,
          reps: 1,
          loopMs: 0,
          width: WIDTH,
          height: HEIGHT,
          frame: Math.floor(FRAMES / 3),
        },
      );
      const buf = await host.screenshot();
      await writeFile(path.join(VERIFY, `${generator}--${strategy}.png`), buf);
      const png = PNG.sync.read(buf);
      if (!base) {
        base = png;
        verify.push({ generator, strategy, diffPct: 0 });
        continue;
      }
      const diff = new PNG({ width: png.width, height: png.height });
      const n = pixelmatch(
        base.data,
        png.data,
        diff.data,
        png.width,
        png.height,
        { threshold: 0.1 },
      );
      await writeFile(
        path.join(VERIFY, `${generator}--${strategy}--diff.png`),
        PNG.sync.write(diff),
      );
      verify.push({
        generator,
        strategy,
        diffPct: (n / (png.width * png.height)) * 100,
      });
    }
  }
}

const micro = await page.evaluate(() => window.BENCH.useInstancingMicro(1200));

await browser.close();
server.close();

/* ── report ───────────────────────────────────────────────────────────────── */

const cols = [
  ['generator', 12],
  ['strategy', 15],
  ['els', 6],
  ['KB', 6],
  ['project', 8],
  ['setup', 8],
  ['avg', 8],
  ['p95', 8],
  ['worst', 8],
  ['rAF fps', 8],
  ['gap', 8],
  ['held MB', 9],
];
const pad = (s, n) => String(s).padStart(n);
console.log(cols.map(([h, n]) => pad(h, n)).join(''));
console.log(cols.map(([, n]) => '-'.repeat(n - 1).padStart(n)).join(''));
for (const r of results) {
  if (r.error) {
    console.log(`${pad(r.generator, 12)}${pad(r.strategy, 15)}  ${r.error}`);
    continue;
  }
  const held = Number(r.notes.heldBytes ?? 0) / 1048576;
  console.log(
    [
      pad(r.generator, 12),
      pad(r.strategy, 15),
      pad(r.elements, 6),
      pad((r.frameBytes / 1024).toFixed(0), 6),
      pad(r.projectAvgMs.toFixed(2), 8),
      pad(r.setupMs.toFixed(0), 8),
      pad(r.workAvgMs.toFixed(2), 8),
      pad(r.workP95Ms.toFixed(2), 8),
      pad(r.workMaxMs.toFixed(2), 8),
      pad(r.loopFps.toFixed(0), 8),
      pad(r.loopWorstGapMs.toFixed(1), 8),
      pad(held.toFixed(1), 9),
    ].join(''),
  );
}
if (gallery.length) {
  console.log(
    `\ngallery: ${GENERATORS[0]} tiles at 300x169, one shared rAF capped at 24fps,` +
      ` layout forced once per tick`,
  );
  console.log(
    `  ${'strategy'.padEnd(16)}${'tiles'.padStart(6)}${'avg/tick'.padStart(10)}${'worst'.padStart(9)}${'>16.7ms'.padStart(10)}`,
  );
  for (const g of gallery) {
    console.log(
      `  ${g.strategy.padEnd(16)}${String(g.tiles).padStart(6)}${g.avgTickMs.toFixed(2).padStart(10)}${g.maxTickMs.toFixed(1).padStart(9)}${`${g.overBudgetPct.toFixed(0)}%`.padStart(10)}`,
    );
  }
}

if (verify.length) {
  console.log('\ncorrectness vs the innerHTML baseline (same frame, pixel diff):');
  for (const v of verify) {
    console.log(
      `  ${v.generator.padEnd(14)}${v.strategy.padEnd(16)}${v.diffPct.toFixed(2)}% of pixels differ`,
    );
  }
}

console.log(
  `\n<use> instancing micro-benchmark (1200 marks, median of 40 parses):\n` +
    `  expanded <path>: ${micro.expandedMs.toFixed(2)}ms\n` +
    `  <use> of <defs>: ${micro.useMs.toFixed(2)}ms`,
);

if (JSON_OUT) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(
    JSON_OUT,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        spec: { FRAMES, REPS, LOOP_MS, WIDTH, HEIGHT },
        results,
        gallery,
        verify,
        micro,
      },
      null,
      2,
    ),
  );
  console.error(`\nwrote ${JSON_OUT}`);
}
