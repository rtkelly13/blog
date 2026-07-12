import { useReducedMotion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  highlightIndex,
  materialize,
  outLines,
  parseSpans,
  plainText,
  type SpanColor,
  type TerminalEvent,
} from './terminalEngine';

// See terminalEngine.ts for the script event model ({cmd}/{out}/{pause}/
// {clear}) and the {{color|text}} inline markup. The engine is pure and
// unit-tested; this file is the React shell (timers, scrolling, chrome).
export type { TerminalEvent } from './terminalEngine';

interface TerminalProps {
  /** Window title, shown in the chrome bar. */
  title?: string;
  /** Prompt string before commands (default "$"). */
  prompt?: string;
  /** The session script — fixed after mount. */
  script: TerminalEvent[];
  /** Viewport height in px (default 280). */
  height?: number;
  /** Start when scrolled into view (default true); false shows a run button. */
  autoplay?: boolean;
  /** Replay automatically ~2.5s after finishing. */
  loop?: boolean;
  /** ms per typed character (default 28). */
  typingSpeed?: number;
}

const SPAN_CLASS: Record<SpanColor, string> = {
  cyan: 'text-brutalist-cyan',
  pink: 'text-brutalist-pink',
  yellow: 'text-brutalist-yellow',
  white: 'font-bold text-white',
  dim: 'text-zinc-500',
};

/** Render the parsed colour spans as styled JSX. */
function renderSpans(raw: string): ReactNode {
  const spans = parseSpans(raw);
  if (spans.length === 1 && spans[0].color === null) return spans[0].text;
  return spans.map((span, i) =>
    span.color === null ? (
      <span key={`${i}-${span.text}`}>{span.text}</span>
    ) : (
      <span key={`${i}-${span.text}`} className={SPAN_CLASS[span.color]}>
        {span.text}
      </span>
    ),
  );
}

/**
 * A scriptable fake terminal for MDX — the reusable form of the QueryRouter
 * help-window idea. Types commands, streams output, follows the tail like a
 * real terminal (manual scroll-up pauses following), scrolls highlighted
 * output to centre while the rest dims, supports clear/pause/loop, and ships
 * replay/skip controls. prefers-reduced-motion renders the finished session.
 * Loaded via next/dynamic in MDXComponents so pages that don't use it ship
 * none of it.
 */
export default function Terminal({
  title,
  prompt = '$',
  script: scriptProp,
  height = 280,
  autoplay = true,
  loop = false,
  typingSpeed = 28,
}: TerminalProps) {
  // The script is captured once — inline MDX arrays get a fresh identity per
  // parent render, which must not restart the session.
  const script = useRef(scriptProp).current;

  const [started, setStarted] = useState(false);
  const [eventIdx, setEventIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const reduceMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  const { lines, typing } = useMemo(
    () => materialize(script, finished ? script.length : eventIdx, progress),
    [script, eventIdx, progress, finished],
  );

  const skip = useCallback(() => {
    setEventIdx(script.length);
    setProgress(0);
    setFinished(true);
  }, [script.length]);

  const replay = useCallback(() => {
    followRef.current = true;
    setEventIdx(0);
    setProgress(0);
    setFinished(false);
    setStarted(true);
  }, []);

  // Autoplay when the window scrolls into view.
  useEffect(() => {
    if (!autoplay || started) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay, started]);

  // Reduced motion: render the finished session, never animate or loop.
  useEffect(() => {
    if (reduceMotion) {
      setStarted(true);
      skip();
    }
  }, [reduceMotion, skip]);

  // The clock: one timeout per tick, derived state only.
  useEffect(() => {
    if (!started || finished || reduceMotion) return;
    const ev = script[eventIdx];
    if (!ev) {
      setFinished(true);
      return;
    }
    const advance = () => {
      setEventIdx((i) => i + 1);
      setProgress(0);
    };

    let t: ReturnType<typeof setTimeout>;
    if ('cmd' in ev) {
      t =
        progress < ev.cmd.length
          ? setTimeout(() => setProgress((p) => p + 1), typingSpeed)
          : setTimeout(advance, 300);
    } else if ('out' in ev) {
      const ls = outLines(ev);
      const perLine = ev.speed === 'instant' ? 0 : (ev.speed ?? 70);
      const hasFocus = highlightIndex(ev, ls) >= 0;
      if (progress < ls.length) {
        t = setTimeout(
          () => setProgress(ev.speed === 'instant' ? ls.length : (p) => p + 1),
          progress === 0 ? 120 : perLine,
        );
      } else if (hasFocus && progress === ls.length) {
        // focus step: apply highlight + centre it
        t = setTimeout(() => setProgress((p) => p + 1), 350);
      } else {
        t = setTimeout(
          () => {
            // The focus scroll paused tail-following to hold the highlight in
            // view; resume it so the rest of the session stays on screen.
            if (hasFocus) followRef.current = true;
            advance();
          },
          hasFocus ? 750 : 350,
        );
      }
    } else if ('pause' in ev) {
      t = setTimeout(advance, ev.pause);
    } else {
      t = setTimeout(advance, 60); // clear
    }
    return () => clearTimeout(t);
  }, [
    started,
    finished,
    eventIdx,
    progress,
    script,
    typingSpeed,
    reduceMotion,
  ]);

  // Loop.
  useEffect(() => {
    if (!loop || !finished || reduceMotion) return;
    const t = setTimeout(replay, 2500);
    return () => clearTimeout(t);
  }, [loop, finished, reduceMotion, replay]);

  // Tail-follow: keep the newest line visible unless the reader scrolled up.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll reacts to output growth
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !followRef.current) return;
    body.scrollTop = body.scrollHeight;
  }, [lines.length, typing]);

  // Focus scroll: when a highlight lands, ease it to the centre of the window.
  const highlightKey = lines.find((l) => l.highlight)?.key;
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !highlightKey) return;
    const el = body.querySelector<HTMLElement>(`[data-k="${highlightKey}"]`);
    if (!el) return;
    followRef.current = false;
    body.scrollTo({
      top: Math.max(0, el.offsetTop - body.clientHeight / 2),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [highlightKey, reduceMotion]);

  const onScroll = () => {
    const body = bodyRef.current;
    if (!body) return;
    followRef.current =
      body.scrollHeight - body.scrollTop - body.clientHeight < 24;
  };

  const status = !started ? 'ready' : finished ? 'done' : 'running…';

  return (
    <section
      ref={containerRef}
      className="not-prose my-6 border-2 border-white bg-black font-mono"
      aria-label={title ?? 'Terminal session'}
    >
      <div className="flex items-center justify-between gap-4 border-b-2 border-white bg-zinc-900 px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-brutalist-yellow">
          [ {title ?? 'terminal'} ]
        </p>
        <div className="flex items-center gap-3">
          <output className="text-xs text-zinc-400">{status}</output>
          {started && !finished && (
            <button
              type="button"
              onClick={skip}
              className="border-2 border-zinc-600 px-2 py-0.5 text-xs font-bold uppercase text-zinc-300 transition-colors hover:border-white hover:text-white"
            >
              skip ≫
            </button>
          )}
          {finished && !reduceMotion && (
            <button
              type="button"
              onClick={replay}
              className="border-2 border-zinc-600 px-2 py-0.5 text-xs font-bold uppercase text-zinc-300 transition-colors hover:border-white hover:text-white"
            >
              replay ▶
            </button>
          )}
        </div>
      </div>

      <div
        ref={bodyRef}
        onScroll={onScroll}
        className="relative overflow-y-auto px-4 py-3 text-xs leading-6"
        style={{ height }}
      >
        {!started && !autoplay && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="border-2 border-brutalist-cyan px-3 py-1 font-bold uppercase text-brutalist-cyan transition-colors hover:bg-brutalist-cyan hover:text-black"
          >
            ▶ run
          </button>
        )}

        {lines.map((line) =>
          line.kind === 'cmd' ? (
            <p key={line.key} data-k={line.key} className="whitespace-pre-wrap">
              <span className="font-bold text-brutalist-cyan">{prompt}</span>{' '}
              <span className="text-white">{line.text}</span>
            </p>
          ) : (
            <p
              key={line.key}
              data-k={line.key}
              className={`truncate whitespace-pre transition-colors duration-300 ${
                line.highlight
                  ? '-mx-1 bg-brutalist-cyan px-1 font-bold text-black'
                  : line.dim
                    ? 'text-zinc-600'
                    : 'text-zinc-300'
              }`}
            >
              {line.highlight || line.dim
                ? plainText(line.text)
                : renderSpans(line.text)}
            </p>
          ),
        )}

        {typing !== null && (
          <p className="whitespace-pre-wrap">
            <span className="font-bold text-brutalist-cyan">{prompt}</span>{' '}
            <span className="text-white">{typing}</span>
            <span className="animate-pulse text-brutalist-cyan">▌</span>
          </p>
        )}

        {started && finished && (
          <p>
            <span className="font-bold text-brutalist-cyan">{prompt}</span>{' '}
            <span className="animate-pulse text-brutalist-cyan">▌</span>
          </p>
        )}
      </div>
    </section>
  );
}
