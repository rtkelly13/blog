import { describe, expect, it } from 'vitest';
import {
  highlightIndex,
  materialize,
  outLines,
  parseSpans,
  plainText,
  scrollTarget,
  type TerminalEvent,
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
