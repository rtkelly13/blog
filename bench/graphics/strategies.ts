/**
 * The rendering strategies under test.
 *
 * Every strategy is handed the *same* pre-computed array of frame strings, so
 * `project()` is outside all of them and the comparison is purely "what does it
 * cost to get this frame onto the screen". `project()` is measured separately
 * and reported as its own column.
 */
import { learn, type Shape, scanInto } from './scan';

export interface Renderer {
  /** Show frame `i`. Timed. */
  draw(i: number): void;
  /** Force the browser to do the work a naive timer would let it defer. */
  settle(): void;
  teardown(): void;
  /** Anything worth reporting alongside the timings (bytes held, etc.). */
  notes: Record<string, number | string>;
}

export interface Strategy {
  name: string;
  blurb: string;
  setup(host: HTMLElement, frames: string[]): Promise<Renderer> | Renderer;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function elementsOf(root: Element): Element[] {
  const all: Element[] = [root];
  const kids = root.querySelectorAll('*');
  for (let i = 0; i < kids.length; i++) all.push(kids[i]);
  return all;
}

function totalBytes(frames: string[]): number {
  let n = 0;
  for (const f of frames) n += f.length * 2; // JS strings are UTF-16
  return n;
}

/* ── 1. the current renderer ──────────────────────────────────────────────── */

const innerHTMLStrategy: Strategy = {
  name: 'innerHTML',
  blurb:
    'What AnimatedBackground does today: reparse the whole scene per frame.',
  setup(host, frames) {
    return {
      draw(i) {
        host.innerHTML = frames[i];
      },
      settle() {
        void host.getBoundingClientRect();
        void (host.firstElementChild as SVGGraphicsElement | null)?.getBBox?.();
      },
      teardown() {
        host.innerHTML = '';
      },
      notes: { heldBytes: 0 },
    };
  },
};

/* ── 2. retained SVG, attributes mutated in place ─────────────────────────── */

/**
 * Build the DOM once, then write only the values that changed.
 *
 * This variant still receives markup, so it pays to scan the string back into
 * values. `mutate-values` below is the same renderer with that scan lifted out,
 * which is what a `project` that emitted numbers instead of a string would give.
 */
function mutateStrategy(preScanned: boolean): Strategy {
  return {
    name: preScanned ? 'mutate-values' : 'mutate-scan',
    blurb: preScanned
      ? 'Retained SVG DOM, values handed over directly (no string in the loop).'
      : 'Retained SVG DOM, per-frame scan of the emitted string, diffed setAttribute.',
    setup(host, frames) {
      const shape = learn(frames[0]);
      const doc = new DOMParser().parseFromString(frames[0], 'image/svg+xml');
      const root = document.importNode(doc.documentElement, true);
      host.replaceChildren(root);
      const els = elementsOf(root);
      if (els.length !== shape.tags.length) {
        throw new Error(
          `element count mismatch: dom ${els.length} vs scan ${shape.tags.length}`,
        );
      }

      const current: string[] = new Array(shape.total);
      scanInto(frames[0], current);

      // Which flat value index belongs to which element/attribute.
      const elemOf = new Int32Array(shape.total);
      const nameOf: string[] = new Array(shape.total);
      for (let e = 0; e < shape.tags.length; e++) {
        const off = shape.offset[e];
        const names = shape.names[e];
        for (let a = 0; a < names.length; a++) {
          elemOf[off + a] = e;
          nameOf[off + a] = names[a];
        }
      }

      let pre: string[][] | null = null;
      if (preScanned) {
        pre = frames.map((f) => {
          const buf: string[] = new Array(shape.total);
          const n = scanInto(f, buf);
          if (n !== shape.total) {
            throw new Error(
              `value count moved mid-loop: ${n} vs ${shape.total}`,
            );
          }
          return buf;
        });
      }

      const scratch: string[] = new Array(shape.total);
      let writes = 0;
      let draws = 0;

      return {
        draw(i) {
          const next = pre ? pre[i] : scratch;
          if (!pre) scanInto(frames[i], scratch);
          draws++;
          for (let v = 0; v < shape.total; v++) {
            const val = next[v];
            if (val !== current[v]) {
              current[v] = val;
              els[elemOf[v]].setAttribute(nameOf[v], val);
              writes++;
            }
          }
        },
        settle() {
          void host.getBoundingClientRect();
          void (root as unknown as SVGGraphicsElement).getBBox?.();
        },
        teardown() {
          host.replaceChildren();
        },
        notes: {
          elements: shape.tags.length,
          attributes: shape.total,
          get attrWritesPerFrame() {
            return draws ? Math.round(writes / draws) : 0;
          },
          heldBytes: pre ? shape.total * frames.length * 16 : 0,
        } as unknown as Record<string, number | string>,
      };
    },
  };
}

/* ── 3. canvas 2D, immediate mode ─────────────────────────────────────────── */

interface Op {
  tag: string;
  attr: Record<string, number>; // flat index of each attribute we care about
}

/** Attributes the interpreter understands, per tag. */
const CANVAS_ATTRS = new Set([
  'd',
  'points',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'opacity',
  'cx',
  'cy',
  'r',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'viewBox',
  'transform',
]);

function buildOps(shape: Shape): Op[] {
  const ops: Op[] = [];
  for (let e = 0; e < shape.tags.length; e++) {
    const attr: Record<string, number> = {};
    const names = shape.names[e];
    for (let a = 0; a < names.length; a++) {
      if (CANVAS_ATTRS.has(names[a])) attr[names[a]] = shape.offset[e] + a;
    }
    ops.push({ tag: shape.tags[e], attr });
  }
  return ops;
}

function canvasStrategy(preScanned: boolean): Strategy {
  return {
    name: preScanned ? 'canvas-values' : 'canvas-scan',
    blurb: preScanned
      ? 'Canvas 2D immediate mode, values handed over directly.'
      : 'Canvas 2D immediate mode via a generic interpreter over the scanned SVG.',
    setup(host, frames) {
      const shape = learn(frames[0]);
      const ops = buildOps(shape);
      const values: string[] = new Array(shape.total);
      scanInto(frames[0], values);

      const vb = (values[ops[0].attr.viewBox] ?? '0 0 1280 720')
        .split(/\s+/)
        .map(Number);
      const dpr = window.devicePixelRatio || 1;
      const rect = host.getBoundingClientRect();
      const cssW = rect.width || 600;
      const cssH = rect.height || 338;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      host.replaceChildren(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      // `preserveAspectRatio="xMidYMid slice"` — cover.
      const scale = Math.max(canvas.width / vb[2], canvas.height / vb[3]);

      let pre: string[][] | null = null;
      if (preScanned) {
        pre = frames.map((f) => {
          const buf: string[] = new Array(shape.total);
          scanInto(f, buf);
          return buf;
        });
      }

      const paths = new Map<string, Path2D>();
      const scratch: string[] = new Array(shape.total);

      const num = (v: string[], idx: number | undefined, dflt: number) =>
        idx === undefined ? dflt : Number(v[idx]);

      return {
        draw(i) {
          const v = pre ? pre[i] : scratch;
          if (!pre) scanInto(frames[i], scratch);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(
            scale,
            0,
            0,
            scale,
            (canvas.width - vb[2] * scale) / 2,
            (canvas.height - vb[3] * scale) / 2,
          );
          let groupAlpha = 1;
          for (let e = 0; e < ops.length; e++) {
            const op = ops[e];
            const a = op.attr;
            if (op.tag === 'svg') continue;
            if (op.tag === 'g') {
              groupAlpha = num(v, a.opacity, 1);
              continue;
            }
            if (op.tag === 'defs' || op.tag === 'clipPath') continue;
            ctx.globalAlpha = groupAlpha;
            // `transform` is the one attribute a naive interpreter silently
            // gets wrong: the marks land in the right place with the wrong
            // orientation and the picture still looks plausible. Only
            // rotate()/translate() are emitted by these generators.
            const xf = a.transform !== undefined ? v[a.transform] : '';
            if (xf) {
              ctx.save();
              const rot =
                /rotate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+)[\s,]+([-\d.]+))?\s*\)/.exec(
                  xf,
                );
              if (rot) {
                const cx = rot[2] === undefined ? 0 : Number(rot[2]);
                const cy = rot[3] === undefined ? 0 : Number(rot[3]);
                ctx.translate(cx, cy);
                ctx.rotate((Number(rot[1]) * Math.PI) / 180);
                ctx.translate(-cx, -cy);
              }
              const tr =
                /translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/.exec(xf);
              if (tr) ctx.translate(Number(tr[1]), Number(tr[2] ?? 0));
            }
            const fill = a.fill !== undefined ? v[a.fill] : 'none';
            const stroke = a.stroke !== undefined ? v[a.stroke] : 'none';
            const sw = num(v, a['stroke-width'], 1);
            if (a['stroke-linecap'] !== undefined) {
              ctx.lineCap = v[a['stroke-linecap']] as CanvasLineCap;
            } else {
              ctx.lineCap = 'butt';
            }

            let path: Path2D | null = null;
            if (op.tag === 'path') {
              const d = v[a.d];
              path = paths.get(d) ?? null;
              if (!path) {
                path = new Path2D(d);
                // Bounded cache: path data is unique per frame for most
                // generators, so this only helps the static ones.
                if (paths.size < 4000) paths.set(d, path);
              }
            } else if (op.tag === 'polygon') {
              path = new Path2D();
              const pts = v[a.points].split(/[\s,]+/);
              for (let k = 0; k + 1 < pts.length; k += 2) {
                const x = Number(pts[k]);
                const y = Number(pts[k + 1]);
                if (k === 0) path.moveTo(x, y);
                else path.lineTo(x, y);
              }
              path.closePath();
            } else if (op.tag === 'circle') {
              path = new Path2D();
              path.arc(
                num(v, a.cx, 0),
                num(v, a.cy, 0),
                num(v, a.r, 0),
                0,
                Math.PI * 2,
              );
            } else if (op.tag === 'line') {
              path = new Path2D();
              path.moveTo(num(v, a.x1, 0), num(v, a.y1, 0));
              path.lineTo(num(v, a.x2, 0), num(v, a.y2, 0));
            } else if (op.tag === 'rect') {
              path = new Path2D();
              path.rect(
                num(v, a.x, 0),
                num(v, a.y, 0),
                num(v, a.width, 0),
                num(v, a.height, 0),
              );
            }
            if (path) {
              if (fill && fill !== 'none') {
                ctx.fillStyle = fill;
                ctx.fill(path);
              }
              if (stroke && stroke !== 'none') {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = sw;
                ctx.stroke(path);
              }
            }
            if (xf) ctx.restore();
          }
        },
        settle() {
          // Canvas does not lay out. The draw calls above are queued to the
          // context; nothing here forces rasterisation — see the doc's limits.
          void host.getBoundingClientRect();
        },
        teardown() {
          host.replaceChildren();
        },
        notes: {
          elements: shape.tags.length,
          heldBytes: pre ? shape.total * frames.length * 16 : 0,
        },
      };
    },
  };
}

/* ── 4. pre-rasterised loop, replayed ─────────────────────────────────────── */

/**
 * Rasterise the whole loop once into ImageBitmaps and `drawImage` per frame.
 * The per-frame cost floor, at a memory cost that is the actual finding.
 */
const bitmapStrategy: Strategy = {
  name: 'bitmap-cache',
  blurb:
    'Pre-rasterise every frame of the loop to an ImageBitmap; drawImage per frame.',
  async setup(host, frames) {
    const dpr = window.devicePixelRatio || 1;
    const rect = host.getBoundingClientRect();
    const cssW = rect.width || 600;
    const cssH = rect.height || 338;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    host.replaceChildren(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');

    const bitmaps: ImageBitmap[] = [];
    for (const f of frames) {
      const blob = new Blob([f], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.decoding = 'sync';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('svg image decode failed'));
        img.src = url;
      });
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) throw new Error('no offscreen 2d context');
      octx.drawImage(img, 0, 0, w, h);
      bitmaps.push(await createImageBitmap(off));
      URL.revokeObjectURL(url);
    }

    return {
      draw(i) {
        ctx.drawImage(bitmaps[i], 0, 0);
      },
      settle() {
        void host.getBoundingClientRect();
      },
      teardown() {
        for (const b of bitmaps) b.close();
        host.replaceChildren();
      },
      notes: {
        frames: frames.length,
        heldBytes: w * h * 4 * frames.length,
        bitmapPx: `${w}x${h}`,
        stringBytes: totalBytes(frames),
      },
    };
  },
};

export const STRATEGIES: Strategy[] = [
  innerHTMLStrategy,
  mutateStrategy(false),
  mutateStrategy(true),
  canvasStrategy(false),
  canvasStrategy(true),
  bitmapStrategy,
];
