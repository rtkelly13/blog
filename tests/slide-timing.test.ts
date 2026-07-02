import { describe, expect, it } from 'vitest';
import { pacingStatus, parseSlideWindow } from '../lib/slideTiming';

describe('parseSlideWindow', () => {
  it('parses a plain en-dash window tag', () => {
    expect(
      parseSlideWindow('[⏱ 66–69 · THE ROLE OF AI] They will be curious.'),
    ).toEqual({ startMin: 66, endMin: 69 });
  });

  it('parses when extra segments follow the label', () => {
    expect(
      parseSlideWindow('[⏱ 28–46 · TOAST ACTIVITY 🍞 · ~18 min · device-free]'),
    ).toEqual({ startMin: 28, endMin: 46 });
  });

  it('is not confused by a ~N min segment inside the same tag', () => {
    expect(parseSlideWindow('[⏱ 73–82 · EMOJI ACTIVITY 😀 · ~9 min · FLEX]')) //
      .toEqual({ startMin: 73, endMin: 82 });
  });

  it('parses a trailing "+" on the end mark (99–100+)', () => {
    expect(parseSlideWindow('[⏱ 99–100+ · Q&A] Leave real time.')).toEqual({
      startMin: 99,
      endMin: 100,
    });
  });

  it('parses a window starting at 0', () => {
    expect(parseSlideWindow('[⏱ 0–5 · INTRO] Welcome — keep it warm.')).toEqual(
      { startMin: 0, endMin: 5 },
    );
  });

  it.each([
    ['hyphen', '[⏱ 46-52 · BREAK]'],
    ['em dash', '[⏱ 46—52 · BREAK]'],
    ['spaced dash', '[⏱ 46 – 52 · BREAK]'],
  ])('tolerates %s ranges', (_variant, notes) => {
    expect(parseSlideWindow(notes)).toEqual({ startMin: 46, endMin: 52 });
  });

  it('parses a tag with no label (closing bracket right after the range)', () => {
    expect(parseSlideWindow('[⏱ 5–9] Make it human.')).toEqual({
      startMin: 5,
      endMin: 9,
    });
  });

  it('finds the tag even when it is not at the start of the notes', () => {
    expect(
      parseSlideWindow('Remember to breathe.\n\n[⏱ 19–24 · PARENTS] Beat.'),
    ).toEqual({ startMin: 19, endMin: 24 });
  });

  it('treats the ~N min overlap variant as no window', () => {
    expect(
      parseSlideWindow('[⏱ ~1 min · ICEBREAKER 🗳️ · overlaps the intro window]'),
    ).toBeNull();
  });

  it.each([
    ['null notes', null],
    ['undefined notes', undefined],
    ['empty notes', ''],
    ['notes without a tag', 'Just remember the punchline.'],
    ['a bare dash range outside a ⏱ tag', 'Show 4–5 milestones, fast.'],
    ['a single minute mark', '[⏱ 45 · CHECKPOINT]'],
    ['a reversed range', '[⏱ 52–46 · BREAK]'],
    ['a zero-length range', '[⏱ 46–46 · BREAK]'],
    ['a negative-looking start', '[⏱ –5–9 · WAT]'],
  ])('returns null for %s', (_label, notes) => {
    expect(parseSlideWindow(notes)).toBeNull();
  });
});

describe('pacingStatus', () => {
  const win = { startMin: 46, endMin: 52 };

  it('is on track inside the window', () => {
    expect(pacingStatus(48 * 60, win)).toEqual({ kind: 'on-track' });
  });

  it('is on track at the window edges', () => {
    expect(pacingStatus(46 * 60, win)).toEqual({ kind: 'on-track' });
    expect(pacingStatus(52 * 60, win)).toEqual({ kind: 'on-track' });
  });

  it('rounds a sliver outside the window to on track', () => {
    expect(pacingStatus(46 * 60 - 20, win)).toEqual({ kind: 'on-track' });
    expect(pacingStatus(52 * 60 + 20, win)).toEqual({ kind: 'on-track' });
  });

  it('reports ~N min ahead when the slide is reached early', () => {
    expect(pacingStatus(43 * 60, win)).toEqual({ kind: 'ahead', minutes: 3 });
  });

  it('reports ~N min behind when still on the slide past its window', () => {
    expect(pacingStatus(56 * 60 + 30, win)) //
      .toEqual({ kind: 'behind', minutes: 5 });
  });

  it('handles the 0-start window (never "ahead" at 0:00)', () => {
    expect(pacingStatus(0, { startMin: 0, endMin: 5 })) //
      .toEqual({ kind: 'on-track' });
  });
});
