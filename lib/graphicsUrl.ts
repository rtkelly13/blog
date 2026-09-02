/**
 * The backgrounds gallery, addressable by URL.
 *
 * Every control on `/experiments/backgrounds` can be set from the query string,
 * which exists for one reason: a visual regression test needs a *deterministic*
 * page, and clicking through a UI to reach one is neither deterministic nor
 * durable. A URL is both — it survives refactors of the controls, it can be
 * pasted into a bug report, and it is the whole test fixture in one line.
 *
 * Two params carry most of that weight:
 *
 * - `t` with `playing=0` freezes a specific frame. Screenshotting an animation
 *   is otherwise a race, and the usual workarounds (wait, then hope) produce
 *   snapshots that fail for reasons unrelated to what changed.
 * - `chrome=0` drops the header and controls, so the snapshot contains the
 *   graphics and nothing else. A diff then cannot be triggered by a slider
 *   moving a pixel.
 *
 * Unknown params are ignored and malformed ones fall back to the default, so a
 * stale link degrades to the default gallery rather than to a blank page.
 */

/** Everything the gallery can be told, with the defaults it uses when not told. */
export interface GraphicsUrlState {
  /** Site theme to force on load. Omitted leaves whatever the visitor has. */
  theme?: 'dark' | 'dim' | 'sketch';
  /** Force the drawing surface. Omitted follows the theme. */
  paper?: boolean;
  /** Only these generators, in this order. Empty means all of them. */
  only: string[];
  /** Only this family. */
  group?: string;
  accent?: string;
  /** Two or more colours makes a ramp; one or none is a single accent. */
  accents?: string[];
  seed: number;
  density: number;
  opacity: number;
  contrast: number;
  disorder: number;
  speed: number;
  fps: number;
  originX: number;
  originY: number;
  /** Frozen loop position. Only meaningful with `playing=0`. */
  t: number;
  playing: boolean;
  /** Show the header and controls. `chrome=0` for a bare grid. */
  chrome: boolean;
  /** Tiles per row in bare mode. */
  cols: number;
}

export const GRAPHICS_URL_DEFAULTS: GraphicsUrlState = {
  only: [],
  seed: 7,
  density: 0.55,
  opacity: 1,
  contrast: 1,
  disorder: 0,
  speed: 1,
  fps: 24,
  originX: 0.5,
  originY: 0.5,
  t: 0,
  playing: true,
  chrome: true,
  cols: 2,
};

type Query = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/** A number in range, or the fallback. Rejects NaN rather than propagating it. */
function num(
  v: string | string[] | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = one(v);
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** `0`, `false` and `no` are false; anything else present is true. */
function bool(v: string | string[] | undefined, fallback: boolean): boolean {
  const raw = one(v)?.toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(raw);
}

/** `#rrggbb`, with the hash optional so a URL need not escape it. */
function colour(v: string | string[] | undefined): string | undefined {
  const raw = one(v);
  if (!raw) return undefined;
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : undefined;
}

function list(v: string | string[] | undefined): string[] {
  const raw = one(v);
  return raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

const THEMES = ['dark', 'dim', 'sketch'] as const;

export function parseGraphicsUrl(query: Query): GraphicsUrlState {
  const d = GRAPHICS_URL_DEFAULTS;
  const themeRaw = one(query.theme) as (typeof THEMES)[number] | undefined;
  const accents = list(query.accents)
    .map((c) => colour(c))
    .filter((c): c is string => !!c);

  return {
    theme: themeRaw && THEMES.includes(themeRaw) ? themeRaw : undefined,
    // Distinguished from "absent" deliberately: absent follows the theme, and
    // `paper=0` is a caller insisting on the dark surface in a light theme.
    paper:
      one(query.paper) === undefined ? undefined : bool(query.paper, false),
    only: list(query.only),
    group: one(query.group),
    accent: colour(query.accent),
    accents: accents.length > 0 ? accents : undefined,
    seed: Math.round(num(query.seed, d.seed, 0, 999_999)),
    density: num(query.density, d.density, 0.05, 1),
    opacity: num(query.opacity, d.opacity, 0.05, 1),
    contrast: num(query.contrast, d.contrast, 0.1, 3),
    disorder: num(query.disorder, d.disorder, 0, 1),
    speed: num(query.speed, d.speed, 0.05, 4),
    fps: Math.round(num(query.fps, d.fps, 1, 60)),
    originX: num(query.originX, d.originX, 0, 1),
    originY: num(query.originY, d.originY, 0, 1),
    t: num(query.t, d.t, 0, 1),
    playing: bool(query.playing, d.playing),
    chrome: bool(query.chrome, d.chrome),
    cols: Math.round(num(query.cols, d.cols, 1, 6)),
  };
}

/** The inverse, for building a shareable link from the current controls. */
export function buildGraphicsUrl(
  state: Partial<GraphicsUrlState>,
  path = '/experiments/backgrounds',
): string {
  const d = GRAPHICS_URL_DEFAULTS;
  const q = new URLSearchParams();
  const put = (k: string, v: string | undefined) => {
    if (v !== undefined && v !== '') q.set(k, v);
  };
  put('theme', state.theme);
  if (state.paper !== undefined) put('paper', state.paper ? '1' : '0');
  if (state.only?.length) put('only', state.only.join(','));
  put('group', state.group);
  // The hash is dropped: it is legal in a query value but survives copy-paste
  // and shell quoting far less reliably, and the parser puts it back.
  put('accent', state.accent?.replace('#', ''));
  if (state.accents?.length)
    put('accents', state.accents.map((c) => c.replace('#', '')).join(','));
  for (const k of [
    'seed',
    'density',
    'opacity',
    'contrast',
    'disorder',
    'speed',
    'fps',
    'originX',
    'originY',
    't',
  ] as const) {
    const v = state[k];
    if (v !== undefined && v !== d[k]) put(k, String(v));
  }
  if (state.playing === false) put('playing', '0');
  if (state.chrome === false) put('chrome', '0');
  if (state.cols !== undefined && state.cols !== d.cols)
    put('cols', String(state.cols));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
