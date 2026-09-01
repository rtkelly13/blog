/**
 * In-page measurement driver. Two modes, deliberately:
 *
 * - `work`   — a synchronous loop over frames, timing `draw()` plus a forced
 *              layout. Isolates the renderer's own cost. Paint and raster are
 *              deferred by the browser and are *not* in this number.
 * - `loop`   — the same renderer driven from `requestAnimationFrame` for a
 *              fixed wall-clock window, reporting achieved frame rate and the
 *              worst gap between presented frames. Paint and composite *are* in
 *              this number, because the browser cannot present without them.
 *
 * Neither number alone is honest; together they bracket the truth.
 */
import {
  getGenerator,
  resolveParams,
} from '../../components/graphics/registry';
import { type Renderer, STRATEGIES } from './strategies';

export interface RunSpec {
  generator: string;
  strategy: string;
  /** Frames in the pre-computed loop. */
  frames: number;
  /** Frames timed in `work` mode. */
  reps: number;
  /** Wall-clock window for `loop` mode, ms. */
  loopMs: number;
  width: number;
  height: number;
  density?: number;
}

export interface RunResult {
  generator: string;
  strategy: string;
  elements: number;
  frameBytes: number;
  projectAvgMs: number;
  projectMaxMs: number;
  setupMs: number;
  workAvgMs: number;
  workP95Ms: number;
  workMaxMs: number;
  loopFps: number;
  loopWorstGapMs: number;
  notes: Record<string, number | string>;
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  const sum = xs.reduce((a, b) => a + b, 0);
  return {
    avg: sum / xs.length,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    max: sorted[sorted.length - 1],
  };
}

function countElements(svg: string): number {
  return (svg.match(/<[a-zA-Z]/g) ?? []).length;
}

export async function run(spec: RunSpec): Promise<RunResult> {
  const gen = getGenerator(spec.generator);
  if (!gen) throw new Error(`no generator ${spec.generator}`);
  const params = resolveParams(spec.generator, {
    width: spec.width,
    height: spec.height,
    seed: 7,
    density: spec.density,
    accent: '#22d3ee',
    background: '#0b1120',
  });
  const structure = gen.sample(params);

  // Pre-compute the loop, timing `project` on the way through.
  const frames: string[] = [];
  const projectMs: number[] = [];
  for (let i = 0; i < spec.frames; i++) {
    const t0 = performance.now();
    const svg = gen.project(structure, params, i / spec.frames);
    projectMs.push(performance.now() - t0);
    frames.push(svg);
  }
  const proj = stats(projectMs);

  const strategy = STRATEGIES.find((s) => s.name === spec.strategy);
  if (!strategy) throw new Error(`no strategy ${spec.strategy}`);

  const host = document.getElementById('host');
  if (!host) throw new Error('no host');
  host.innerHTML = '';

  const setupStart = performance.now();
  const renderer = await strategy.setup(host, frames);
  const setupMs = performance.now() - setupStart;

  // Warm-up: first frames pay for style resolution and JIT, and are not
  // representative of a loop that has been running for ten seconds.
  for (let i = 0; i < 30; i++) {
    renderer.draw(i % frames.length);
    renderer.settle();
  }

  const work: number[] = [];
  for (let i = 0; i < spec.reps; i++) {
    const f = i % frames.length;
    const t0 = performance.now();
    renderer.draw(f);
    renderer.settle();
    work.push(performance.now() - t0);
  }
  const w = stats(work);

  // rAF mode.
  const gaps: number[] = [];
  let drawn = 0;
  await new Promise<void>((resolve) => {
    let last = performance.now();
    const start = last;
    let f = 0;
    const tick = () => {
      const now = performance.now();
      gaps.push(now - last);
      last = now;
      renderer.draw(f++ % frames.length);
      drawn++;
      if (now - start < spec.loopMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  // Drop the first few gaps: they include the transition out of the work loop.
  const steady = gaps.slice(5);
  const elapsed = steady.reduce((a, b) => a + b, 0);

  const notes = { ...renderer.notes };
  renderer.teardown();

  return {
    generator: spec.generator,
    strategy: spec.strategy,
    elements: countElements(frames[0]),
    frameBytes: frames[0].length,
    projectAvgMs: proj.avg,
    projectMaxMs: proj.max,
    setupMs,
    workAvgMs: w.avg,
    workP95Ms: w.p95,
    workMaxMs: w.max,
    loopFps: (steady.length / elapsed) * 1000,
    loopWorstGapMs: Math.max(...steady),
    notes,
  };
}

/**
 * The scenario the problem was reported from: a gallery page with several tiles
 * animating at once, all sharing one main thread.
 *
 * Driven from a single rAF at the capped rate, as `AnimatedBackground` would be
 * if the tiles were coordinated — which flatters the current renderer slightly,
 * since today each tile owns its own rAF loop and they cannot cooperate. What
 * this reports is the share of animation ticks whose total work overruns a
 * 16.7ms budget, which is what "stutters" means.
 */
export async function gallery(spec: {
  generator: string;
  strategy: string;
  tiles: number;
  frames: number;
  fps: number;
  ms: number;
  width: number;
  height: number;
}): Promise<{
  tiles: number;
  ticks: number;
  avgTickMs: number;
  maxTickMs: number;
  overBudgetPct: number;
}> {
  const gen = getGenerator(spec.generator);
  if (!gen) throw new Error(`no generator ${spec.generator}`);
  const strategy = STRATEGIES.find((s) => s.name === spec.strategy);
  if (!strategy) throw new Error(`no strategy ${spec.strategy}`);

  const stage = document.getElementById('stage');
  if (!stage) throw new Error('no stage');
  stage.innerHTML = '';

  const renderers: Renderer[] = [];
  for (let n = 0; n < spec.tiles; n++) {
    const host = document.createElement('div');
    host.className = 'tile';
    stage.appendChild(host);
    // A different seed per tile, as a real gallery has: shared frame strings
    // would let the engine reuse work no real page could.
    const params = resolveParams(spec.generator, {
      width: spec.width,
      height: spec.height,
      seed: 7 + n,
      accent: '#22d3ee',
      background: '#0b1120',
    });
    const structure = gen.sample(params);
    const frames: string[] = [];
    for (let i = 0; i < spec.frames; i++) {
      frames.push(gen.project(structure, params, i / spec.frames));
    }
    renderers.push(await strategy.setup(host, frames));
  }

  const ticks: number[] = [];
  await new Promise<void>((resolve) => {
    const start = performance.now();
    let last = -Infinity;
    let f = 0;
    const minGap = 1000 / spec.fps;
    const tick = () => {
      const now = performance.now();
      if (now - last >= minGap) {
        last = now;
        const t0 = performance.now();
        for (const r of renderers) r.draw(f % spec.frames);
        // One forced layout for the whole page, as the browser would do once
        // per frame rather than once per tile.
        void document.body.getBoundingClientRect();
        void document.body.offsetHeight;
        ticks.push(performance.now() - t0);
        f++;
      }
      if (now - start < spec.ms) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  for (const r of renderers) r.teardown();
  stage.innerHTML = '';

  const warm = ticks.slice(3);
  const over = warm.filter((x) => x > 16.7).length;
  return {
    tiles: spec.tiles,
    ticks: warm.length,
    avgTickMs: warm.reduce((a, b) => a + b, 0) / warm.length,
    maxTickMs: Math.max(...warm),
    overBudgetPct: (over / warm.length) * 100,
  };
}

/**
 * Set a strategy up and leave one frame on screen, so the runner can screenshot
 * it. Correctness first: a renderer that is fast and draws the wrong picture is
 * not a result.
 */
export async function show(spec: RunSpec & { frame: number }): Promise<void> {
  const gen = getGenerator(spec.generator);
  if (!gen) throw new Error(`no generator ${spec.generator}`);
  const params = resolveParams(spec.generator, {
    width: spec.width,
    height: spec.height,
    seed: 7,
    density: spec.density,
    accent: '#22d3ee',
    background: '#0b1120',
  });
  const structure = gen.sample(params);
  const frames: string[] = [];
  for (let i = 0; i < spec.frames; i++) {
    frames.push(gen.project(structure, params, i / spec.frames));
  }
  const strategy = STRATEGIES.find((s) => s.name === spec.strategy);
  if (!strategy) throw new Error(`no strategy ${spec.strategy}`);
  const host = document.getElementById('host');
  if (!host) throw new Error('no host');
  host.innerHTML = '';
  const renderer = await strategy.setup(host, frames);
  renderer.draw(spec.frame);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

/**
 * Question 2 in isolation: does `<use>` of a shared `<defs>` symbol cost less
 * to parse and lay out than the same number of expanded shapes?
 */
export function useInstancingMicro(n: number): {
  expandedMs: number;
  useMs: number;
} {
  const host = document.getElementById('host');
  if (!host) throw new Error('no host');
  const poly = 'M0 0L12 0L12 12L0 12Z';
  let expanded =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">';
  let used = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs><path id="u" d="${poly}"/></defs>`;
  for (let i = 0; i < n; i++) {
    const x = (i % 40) * 32;
    const y = Math.floor(i / 40) * 18;
    expanded += `<path d="${poly}" transform="translate(${x} ${y})" fill="#22d3ee"/>`;
    used += `<use href="#u" x="${x}" y="${y}" fill="#22d3ee"/>`;
  }
  expanded += '</svg>';
  used += '</svg>';

  const once = (html: string) => {
    host.innerHTML = '';
    void host.getBoundingClientRect();
    const t0 = performance.now();
    host.innerHTML = html;
    void (host.firstElementChild as SVGGraphicsElement).getBBox();
    return performance.now() - t0;
  };

  // Interleaved, not one batch after the other: measured sequentially the
  // second form inherits whatever heap state the first left behind, which was
  // worth a factor of two on its own.
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < 10; i++) once(i % 2 ? expanded : used); // warm
  for (let i = 0; i < 40; i++) {
    a.push(once(expanded));
    b.push(once(used));
  }
  const median = (xs: number[]) => {
    xs.sort((x, y) => x - y);
    return xs[Math.floor(xs.length / 2)];
  };
  host.innerHTML = '';
  return { expandedMs: median(a), useMs: median(b) };
}
