import { describe, expect, it } from 'vitest';
import {
  highlightIndex,
  materialize,
  outLines,
  parseSpans,
  plainText,
  type Step,
  schedule,
  scrollTarget,
  stateAt,
  type TerminalEvent,
  totalDuration,
} from '../components/interactive/terminalEngine';

describe('parseSpans', () => {
  it('returns a single uncoloured span for plain text', () => {
    expect(parseSpans('hello world')).toEqual([
      { color: null, text: 'hello world' },
    ]);
  });

  it('parses a coloured span with surrounding text', () => {
    expect(parseSpans('a {{cyan|b}} c')).toEqual([
      { color: null, text: 'a ' },
      { color: 'cyan', text: 'b' },
      { color: null, text: ' c' },
    ]);
  });

  it('parses multiple spans and all supported colours', () => {
    expect(parseSpans('{{pink|p}}{{yellow|y}}{{white|w}}{{dim|d}}')).toEqual([
      { color: 'pink', text: 'p' },
      { color: 'yellow', text: 'y' },
      { color: 'white', text: 'w' },
      { color: 'dim', text: 'd' },
    ]);
  });

  it('leaves unknown colours untouched as literal text', () => {
    expect(parseSpans('{{magenta|nope}}')).toEqual([
      { color: null, text: '{{magenta|nope}}' },
    ]);
  });
});

describe('plainText', () => {
  it('strips markup, keeping the visible text', () => {
    expect(plainText('{{cyan|tunnel open}} localhost → {{dim|staging}}')).toBe(
      'tunnel open localhost → staging',
    );
  });

  it('is the identity for unmarked text', () => {
    expect(plainText('db-tunnel  SSH tunnel')).toBe('db-tunnel  SSH tunnel');
  });
});

describe('outLines', () => {
  it('wraps a single string into an array', () => {
    expect(outLines({ out: 'one' })).toEqual(['one']);
  });

  it('passes arrays through', () => {
    expect(outLines({ out: ['a', 'b'] })).toEqual(['a', 'b']);
  });
});

describe('highlightIndex', () => {
  const lines = ['CORE', '  db-tunnel  SSH tunnel', '  {{dim|secrets  creds}}'];

  it('resolves a substring against visible (markup-stripped) text', () => {
    expect(highlightIndex({ highlight: 'db-tunnel' }, lines)).toBe(1);
    expect(highlightIndex({ highlight: 'secrets' }, lines)).toBe(2);
  });

  it('passes numeric indices through', () => {
    expect(highlightIndex({ highlight: 0 }, lines)).toBe(0);
  });

  it('returns -1 for absent or unmatched highlights', () => {
    expect(highlightIndex({}, lines)).toBe(-1);
    expect(highlightIndex({ highlight: 'nope' }, lines)).toBe(-1);
  });
});

describe('scrollTarget', () => {
  // 20 lines × 24px in a 168px (7-line) window → maxOffset 312.
  const LINE = 24;
  const WINDOW = 168;

  it('scrolls to the end when there is no highlight', () => {
    expect(scrollTarget(-1, 20, LINE, WINDOW)).toBe(20 * LINE - WINDOW);
  });

  it('never scrolls when everything fits', () => {
    expect(scrollTarget(-1, 5, LINE, WINDOW)).toBe(0);
    expect(scrollTarget(3, 5, LINE, WINDOW)).toBe(0);
  });

  it('centres a mid-page highlight', () => {
    // line 10 → 10*24 - (168-24)/2 = 240 - 72 = 168
    expect(scrollTarget(10, 20, LINE, WINDOW)).toBe(168);
  });

  it('clamps to the top and bottom of the scroll range', () => {
    expect(scrollTarget(0, 20, LINE, WINDOW)).toBe(0); // near top
    expect(scrollTarget(19, 20, LINE, WINDOW)).toBe(20 * LINE - WINDOW); // near end
  });
});

describe('materialize', () => {
  const script: TerminalEvent[] = [
    { cmd: 'uv run help' },
    {
      out: ['CORE', '  db-tunnel  SSH tunnel', '  pkg  feed'],
      highlight: 'db-tunnel',
    },
    { pause: 500 },
    { cmd: 'db-tunnel staging' },
    { out: 'tunnel open' },
  ];

  it('shows a partially typed command while typing', () => {
    const frame = materialize(script, 0, 4);
    expect(frame.typing).toBe('uv r');
    expect(frame.lines).toEqual([]);
  });

  it('commits the command line once fully typed', () => {
    const frame = materialize(script, 0, 'uv run help'.length);
    expect(frame.typing).toBeNull();
    expect(frame.lines).toEqual([
      {
        key: 'e0',
        kind: 'cmd',
        text: 'uv run help',
        highlight: false,
        dim: false,
      },
    ]);
  });

  it('emits out lines up to progress, unfocused before the focus step', () => {
    const frame = materialize(script, 1, 2);
    expect(frame.lines).toHaveLength(3); // cmd + 2 out lines
    const out = frame.lines.filter((l) => l.kind === 'out');
    expect(out.map((l) => l.text)).toEqual(['CORE', '  db-tunnel  SSH tunnel']);
    expect(out.every((l) => !l.highlight && !l.dim)).toBe(true);
  });

  it('applies highlight and dims siblings on the focus step', () => {
    const frame = materialize(script, 1, 4); // 3 lines + 1 = focus step
    const out = frame.lines.filter((l) => l.kind === 'out');
    expect(out.map((l) => l.highlight)).toEqual([false, true, false]);
    expect(out.map((l) => l.dim)).toEqual([true, false, true]);
  });

  it('renders the full session when eventIdx is past the end', () => {
    const frame = materialize(script, script.length, 0);
    expect(frame.typing).toBeNull();
    expect(frame.lines.map((l) => l.text)).toEqual([
      'uv run help',
      'CORE',
      '  db-tunnel  SSH tunnel',
      '  pkg  feed',
      'db-tunnel staging',
      'tunnel open',
    ]);
    // settled highlight state persists
    expect(frame.lines[2].highlight).toBe(true);
    expect(frame.lines[1].dim).toBe(true);
  });

  it('does not dim anything in blocks without a highlight', () => {
    const frame = materialize(script, script.length, 0);
    expect(frame.lines.at(-1)).toMatchObject({
      text: 'tunnel open',
      highlight: false,
      dim: false,
    });
  });

  it('clear resets the buffer and later events render after it', () => {
    const withClear: TerminalEvent[] = [
      { cmd: 'first' },
      { out: ['a', 'b'] },
      { clear: true },
      { cmd: 'second' },
    ];
    const frame = materialize(withClear, withClear.length, 0);
    expect(frame.lines.map((l) => l.text)).toEqual(['second']);
  });

  it('is a pure projection — same inputs, same frame', () => {
    const a = materialize(script, 1, 4);
    const b = materialize(script, 1, 4);
    expect(a).toEqual(b);
  });
});

/* ── the schedule ─────────────────────────────────────────────────────────── */

/**
 * A literal port of the timing branches that used to live in `Terminal`'s clock
 * effect, kept here as the reference `schedule()` is checked against.
 *
 * This is the whole reason the extraction is safe to believe: the durations were
 * previously only observable by mounting the component and letting real time
 * pass, so "no behaviour change" could not be asserted, only asserted *about*.
 * Porting the old branching into the test makes the two comparable.
 */
function simulate(script: TerminalEvent[], typingSpeed = 28): Step[] {
  const out: Step[] = [];
  let eventIdx = 0;
  let progress = 0;
  let at = 0;

  while (eventIdx < script.length) {
    const ev = script[eventIdx];
    let duration: number;
    let advance = false;
    let jumpTo: number | null = null;

    if ('cmd' in ev) {
      if (progress < ev.cmd.length) duration = typingSpeed;
      else {
        duration = 300;
        advance = true;
      }
    } else if ('out' in ev) {
      const ls = outLines(ev);
      const perLine =
        ev.speed === 'instant' ? 0 : ((ev.speed as number | undefined) ?? 70);
      const hasFocus = highlightIndex(ev, ls) >= 0;
      if (progress < ls.length) {
        duration = progress === 0 ? 120 : perLine;
        if (ev.speed === 'instant') jumpTo = ls.length;
      } else if (hasFocus && progress === ls.length) {
        duration = 350;
      } else {
        duration = hasFocus ? 750 : 350;
        advance = true;
      }
    } else if ('pause' in ev) {
      duration = ev.pause;
      advance = true;
    } else {
      duration = 60;
      advance = true;
    }

    out.push({ eventIdx, progress, at, duration });
    at += duration;
    if (advance) {
      eventIdx += 1;
      progress = 0;
    } else if (jumpTo !== null) {
      progress = jumpTo;
    } else {
      progress += 1;
    }
  }
  return out;
}

const SCRIPTS: Record<string, TerminalEvent[]> = {
  empty: [],
  singleCommand: [{ cmd: 'ls' }],
  commandThenLine: [{ cmd: 'ls' }, { out: 'a.txt' }],
  multiLineOutput: [{ cmd: 'ls' }, { out: ['a.txt', 'b.txt', 'c.txt'] }],
  stringHighlight: [{ out: ['one', 'two', 'three'], highlight: 'two' }],
  indexHighlight: [{ out: ['one', 'two', 'three'], highlight: 1 }],
  unmatchedHighlight: [{ out: ['one', 'two'], highlight: 'nope' }],
  instant: [{ out: ['a', 'b', 'c', 'd'], speed: 'instant' }],
  instantHighlighted: [
    { out: ['a', 'b', 'c'], speed: 'instant', highlight: 'b' },
  ],
  customSpeed: [{ out: ['a', 'b'], speed: 200 }],
  zeroSpeed: [{ out: ['a', 'b'], speed: 0 }],
  pause: [{ cmd: 'x' }, { pause: 900 }, { out: 'done' }],
  clear: [{ out: 'a' }, { clear: true }, { out: 'b' }],
  emptyOutputArray: [{ out: [] }],
  everything: [
    { cmd: 'tvs queue process' },
    { out: ['scanning…', 'found 12 items'], speed: 40 },
    { pause: 400 },
    { out: ['keep: 9', 'drop: 3', 'review: 0'], highlight: 'drop' },
    { clear: true },
    { cmd: 'tvs queue promote --apply' },
    { out: ['promoted 9'], speed: 'instant' },
  ],
};

describe('schedule', () => {
  it.each(Object.keys(SCRIPTS))(
    '%s: reproduces the original clock effect exactly',
    (name) => {
      expect(schedule(SCRIPTS[name])).toEqual(simulate(SCRIPTS[name]));
    },
  );

  it.each([1, 12, 28, 90])('honours a typingSpeed of %ims', (speed) => {
    for (const script of Object.values(SCRIPTS)) {
      expect(schedule(script, speed)).toEqual(simulate(script, speed));
    }
  });

  it('starts at zero and is contiguous — no gaps, no overlaps', () => {
    for (const script of Object.values(SCRIPTS)) {
      const steps = schedule(script);
      let expected = 0;
      for (const s of steps) {
        expect(s.at).toBe(expected);
        expected += s.duration;
      }
    }
  });

  it('visits every state exactly once', () => {
    for (const script of Object.values(SCRIPTS)) {
      const keys = schedule(script).map((s) => `${s.eventIdx}:${s.progress}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('gives a session length, which the component could not previously answer', () => {
    expect(totalDuration(schedule(SCRIPTS.empty))).toBe(0);
    expect(totalDuration(schedule(SCRIPTS.singleCommand))).toBe(2 * 28 + 300);
    const steps = schedule(SCRIPTS.everything);
    expect(totalDuration(steps)).toBe(
      steps.reduce((sum, s) => sum + s.duration, 0),
    );
  });
});

describe('stateAt', () => {
  it('returns each step at its own start and at its last millisecond', () => {
    for (const script of Object.values(SCRIPTS)) {
      // Zero-duration steps (`speed: 0`) occupy no time, so no instant belongs
      // to them — see the dedicated test below.
      const steps = schedule(script).filter((s) => s.duration > 0);
      for (const s of steps) {
        expect(stateAt(steps, s.at)).toEqual({
          eventIdx: s.eventIdx,
          progress: s.progress,
        });
        expect(stateAt(steps, s.at + s.duration - 0.001)).toEqual({
          eventIdx: s.eventIdx,
          progress: s.progress,
        });
      }
    }
  });

  it('seeking anywhere equals stepping there — the property a frame renderer needs', () => {
    // Random access must agree with sequential playback, or a seek mid-render
    // produces a frame the wall-clock shell would never have shown.
    for (const script of Object.values(SCRIPTS)) {
      const steps = schedule(script);
      const total = totalDuration(steps);
      for (const s of steps.filter((x) => x.duration > 0)) {
        // Jumping straight to a step's start must give that step, exactly as
        // playing forward into it would.
        expect(stateAt(steps, s.at)).toEqual({
          eventIdx: s.eventIdx,
          progress: s.progress,
        });
      }
      expect(stateAt(steps, total)).toEqual({
        eventIdx: script.length,
        progress: 0,
      });
    }
  });

  it('skips zero-duration steps, because no instant belongs to them', () => {
    // `speed: 0` schedules a state with no dwell. The wall-clock shell passes
    // through it on a 0ms timeout; a frame renderer never samples it, because
    // there is no time at which it is current. Both end up showing the same
    // frames, which is the point — but it is worth pinning rather than
    // discovering as an off-by-one.
    const steps = schedule(SCRIPTS.zeroSpeed);
    const zero = steps.filter((s) => s.duration === 0);
    expect(zero.length).toBeGreaterThan(0);
    for (const s of zero) {
      expect(stateAt(steps, s.at)).not.toEqual({
        eventIdx: s.eventIdx,
        progress: s.progress,
      });
    }
  });

  it('clamps outside the session rather than throwing', () => {
    const steps = schedule(SCRIPTS.everything);
    expect(stateAt(steps, -5000)).toEqual({ eventIdx: 0, progress: 0 });
    expect(stateAt(steps, totalDuration(steps) + 10_000)).toEqual({
      eventIdx: SCRIPTS.everything.length,
      progress: 0,
    });
    expect(stateAt([], 123)).toEqual({ eventIdx: 0, progress: 0 });
  });

  it('is deterministic when sampled as frames', () => {
    // The actual video use: same fps, same frames, same states — twice.
    const steps = schedule(SCRIPTS.everything);
    const frames = Math.ceil((totalDuration(steps) / 1000) * 30);
    const run = () =>
      Array.from({ length: frames }, (_, f) =>
        JSON.stringify(stateAt(steps, (f / 30) * 1000)),
      );
    expect(run()).toEqual(run());
  });

  it('never skips a state at 30fps on a script with no sub-frame steps', () => {
    // A step shorter than a frame (33.3ms) can legitimately be skipped — that is
    // what a frame rate means. With every dwell above that, sampling must visit
    // every state, or the video drops content the web shell shows.
    const steps = schedule(SCRIPTS.everything, 40);
    expect(steps.every((s) => s.duration === 0 || s.duration > 1000 / 30)).toBe(
      true,
    );
    const seen = new Set<string>();
    const total = totalDuration(steps);
    for (let ms = 0; ms < total; ms += 1000 / 30) {
      const { eventIdx, progress } = stateAt(steps, ms);
      seen.add(`${eventIdx}:${progress}`);
    }
    expect(seen.size).toBe(steps.length);
  });
});

describe('schedule + materialize', () => {
  it('renders every frame of a session without throwing', () => {
    const script = SCRIPTS.everything;
    const steps = schedule(script);
    const total = totalDuration(steps);
    for (let ms = 0; ms <= total; ms += 1000 / 30) {
      const { eventIdx, progress } = stateAt(steps, ms);
      expect(() => materialize(script, eventIdx, progress)).not.toThrow();
    }
  });

  it('ends on the finished session', () => {
    const script = SCRIPTS.everything;
    const steps = schedule(script);
    const { eventIdx, progress } = stateAt(steps, totalDuration(steps));
    const frame = materialize(script, eventIdx, progress);
    expect(frame.typing).toBeNull();
    // `clear` wipes what came before, so only the tail of the script survives.
    expect(frame.lines.map((l) => l.text)).toEqual([
      'tvs queue promote --apply',
      'promoted 9',
    ]);
  });
});
