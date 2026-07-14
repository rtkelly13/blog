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
