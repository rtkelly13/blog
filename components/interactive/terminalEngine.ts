/**
 * Pure engine behind the <Terminal> component: script types, inline colour
 * markup parsing, highlight matching, the (script, event, progress) → lines
 * projection, and the focus-scroll target maths. No React — unit-testable in
 * a plain node environment (tests/terminal-engine.test.ts).
 */

export type TerminalEvent =
  | { cmd: string }
  | {
      out: string | string[];
      speed?: number | 'instant';
      highlight?: string | number;
    }
  | { pause: number }
  | { clear: true };

export type SpanColor = 'cyan' | 'pink' | 'yellow' | 'white' | 'dim';

export interface Span {
  color: SpanColor | null;
  text: string;
}

const SPAN_RE = /\{\{(cyan|pink|yellow|white|dim)\|(.*?)\}\}/g;

/** Parse `{{color|text}}` markup into a flat list of coloured spans. */
export function parseSpans(raw: string): Span[] {
  if (!raw.includes('{{')) return [{ color: null, text: raw }];
  const spans: Span[] = [];
  let last = 0;
  for (const m of raw.matchAll(SPAN_RE)) {
    if (m.index > last)
      spans.push({ color: null, text: raw.slice(last, m.index) });
    spans.push({ color: m[1] as SpanColor, text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) spans.push({ color: null, text: raw.slice(last) });
  return spans;
}

/** Strip the colour markup — what the reader actually sees on the line. */
export const plainText = (raw: string): string => raw.replace(SPAN_RE, '$2');

export const outLines = (ev: { out: string | string[] }): string[] =>
  Array.isArray(ev.out) ? ev.out : [ev.out];

/**
 * Resolve an out-event's `highlight` to a line index. Substrings match against
 * the markup-stripped text; unmatched substrings and absent highlights → -1.
 */
export function highlightIndex(
  ev: { highlight?: string | number },
  lines: string[],
): number {
  if (typeof ev.highlight === 'number') return ev.highlight;
  if (ev.highlight) {
    const needle = ev.highlight;
    return lines.findIndex((l) => plainText(l).includes(needle));
  }
  return -1;
}

/**
 * Where the viewport should scroll for a block: centre the highlighted line,
 * clamped to [0, maxOffset]; with no highlight, scroll to the end.
 */
export function scrollTarget(
  hIdx: number,
  lineCount: number,
  lineHeight: number,
  windowHeight: number,
): number {
  const maxOffset = Math.max(0, lineCount * lineHeight - windowHeight);
  if (hIdx < 0) return maxOffset;
  return Math.min(
    maxOffset,
    Math.max(0, hIdx * lineHeight - (windowHeight - lineHeight) / 2),
  );
}

export interface RenderLine {
  key: string;
  kind: 'cmd' | 'out';
  text: string;
  highlight: boolean;
  dim: boolean;
}

export interface MaterializedFrame {
  lines: RenderLine[];
  /** Partially-typed command at the prompt, or null when not typing. */
  typing: string | null;
}

/**
 * Pure projection of (script, eventIdx, progress) → visible lines. No
 * append-style side effects, so replays, skips and re-renders are idempotent.
 * For the current `out` event, `progress` counts emitted lines; one extra
 * tick past the end is the "focus" step where the highlight applies.
 * `eventIdx >= script.length` renders the fully finished session.
 */
export function materialize(
  script: TerminalEvent[],
  eventIdx: number,
  progress: number,
): MaterializedFrame {
  let lines: RenderLine[] = [];
  let typing: string | null = null;

  for (let i = 0; i <= Math.min(eventIdx, script.length - 1); i++) {
    const ev = script[i];
    const isCurrent = i === eventIdx;

    if ('cmd' in ev) {
      if (isCurrent && progress < ev.cmd.length) {
        typing = ev.cmd.slice(0, progress);
      } else {
        lines.push({
          key: `e${i}`,
          kind: 'cmd',
          text: ev.cmd,
          highlight: false,
          dim: false,
        });
      }
    } else if ('out' in ev) {
      const ls = outLines(ev);
      const count = isCurrent ? Math.min(progress, ls.length) : ls.length;
      const focused = !isCurrent || progress > ls.length;
      const hIdx = highlightIndex(ev, ls);
      for (let j = 0; j < count; j++) {
        lines.push({
          key: `e${i}l${j}`,
          kind: 'out',
          text: ls[j],
          highlight: focused && j === hIdx,
          dim: focused && hIdx >= 0 && j !== hIdx,
        });
      }
    } else if ('clear' in ev) {
      lines = [];
    }
    // pause: nothing to render
  }
  return { lines, typing };
}

/* ── the schedule ─────────────────────────────────────────────────────────── */

/**
 * The dwell times that make up a session, named rather than inlined.
 *
 * These eight numbers *are* the animation. They used to live as literals inside
 * the branches of `Terminal`'s clock effect, which meant the only way to observe
 * them was to let real time pass — untested, unreachable from any other
 * renderer, and only discoverable by reading a `useEffect`.
 */
export const TIMING = {
  /** ms per typed character. Overridable per-component. */
  typing: 28,
  /** Hold after a command finishes typing, before its output starts. */
  afterCmd: 300,
  /** Beat before the first line of an output block appears. */
  beforeFirstLine: 120,
  /** Per subsequent output line, when the event does not set `speed`. */
  perLine: 70,
  /** The focus step: highlight lands and the viewport centres it. */
  focus: 350,
  /** Hold on a highlighted block before moving on. */
  holdHighlight: 750,
  /** Hold at the end of an unhighlighted block. */
  holdBlock: 350,
  /** A `clear` is near-instant but not free. */
  clear: 60,
} as const;

/**
 * One (eventIdx, progress) state, and how long the session rests there.
 *
 * `at` is cumulative from session start, so this is a seekable index: the state
 * at any time is a lookup rather than a replay.
 */
export interface Step {
  eventIdx: number;
  progress: number;
  /** ms from session start at which this step begins. */
  at: number;
  /** ms the session holds this step before moving to the next. */
  duration: number;
}

/**
 * Expand a script into the full sequence of states it passes through.
 *
 * Pure, and total: every state the component can be in appears exactly once, in
 * order. That is what lets the same script drive a wall-clock shell (dwell
 * `duration`, then move to the next step) and a frame-based one (look up
 * {@link stateAt} for this frame's time) without the two being able to disagree.
 */
export function schedule(
  script: TerminalEvent[],
  typingSpeed: number = TIMING.typing,
): Step[] {
  const steps: Step[] = [];
  let at = 0;
  const push = (eventIdx: number, progress: number, duration: number) => {
    steps.push({ eventIdx, progress, at, duration });
    at += duration;
  };

  for (let i = 0; i < script.length; i++) {
    const ev = script[i];

    if ('cmd' in ev) {
      for (let p = 0; p < ev.cmd.length; p++) push(i, p, typingSpeed);
      push(i, ev.cmd.length, TIMING.afterCmd);
      continue;
    }

    if ('out' in ev) {
      const ls = outLines(ev);
      const instant = ev.speed === 'instant';
      const perLine = instant
        ? 0
        : ((ev.speed as number | undefined) ?? TIMING.perLine);
      const hasFocus = highlightIndex(ev, ls) >= 0;

      if (instant) {
        // One tick reveals the whole block, so there is a single pre-reveal
        // state rather than one per line.
        push(i, 0, TIMING.beforeFirstLine);
      } else {
        for (let p = 0; p < ls.length; p++) {
          push(i, p, p === 0 ? TIMING.beforeFirstLine : perLine);
        }
      }
      // The focus step is a real state — the highlight applies one tick after
      // the last line lands, which is what gives the eye time to arrive.
      if (hasFocus) push(i, ls.length, TIMING.focus);
      push(
        i,
        hasFocus ? ls.length + 1 : ls.length,
        hasFocus ? TIMING.holdHighlight : TIMING.holdBlock,
      );
      continue;
    }

    if ('pause' in ev) {
      push(i, 0, ev.pause);
      continue;
    }

    push(i, 0, TIMING.clear);
  }

  return steps;
}

/** Total run time of a scheduled session, in ms. */
export const totalDuration = (steps: Step[]): number =>
  steps.length === 0
    ? 0
    : steps[steps.length - 1].at + steps[steps.length - 1].duration;

/**
 * The state in effect at `ms`, by binary search.
 *
 * Before the session starts, the first state; at or past the end, `eventIdx`
 * beyond the script, which {@link materialize} already renders as the finished
 * session. A frame renderer calls this once per frame with
 * `(frame / fps) * 1000` and needs nothing else.
 */
export function stateAt(
  steps: Step[],
  ms: number,
): { eventIdx: number; progress: number } {
  if (steps.length === 0) return { eventIdx: 0, progress: 0 };
  if (ms < 0)
    return { eventIdx: steps[0].eventIdx, progress: steps[0].progress };
  if (ms >= totalDuration(steps)) {
    return { eventIdx: steps[steps.length - 1].eventIdx + 1, progress: 0 };
  }

  let lo = 0;
  let hi = steps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (steps[mid].at <= ms) lo = mid;
    else hi = mid - 1;
  }
  return { eventIdx: steps[lo].eventIdx, progress: steps[lo].progress };
}
