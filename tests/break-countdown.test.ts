import { describe, expect, it } from 'vitest';
import {
  BREAK_CRITICAL_MS,
  BREAK_OVER_LINGER_MS,
  BREAK_WARN_MS,
  breakView,
  formatBreakMs,
} from '../lib/breakCountdown';

const MIN = 60_000;
const startedAt = 1_000_000;
const endsAt = startedAt + 5 * MIN;
const at = (msBeforeEnd: number) =>
  breakView(endsAt - msBeforeEnd, startedAt, endsAt);

describe('formatBreakMs', () => {
  it('formats M:SS, rounding up to the next second', () => {
    expect(formatBreakMs(5 * MIN)).toBe('5:00');
    expect(formatBreakMs(4 * MIN + 59_001)).toBe('5:00');
    expect(formatBreakMs(61_000)).toBe('1:01');
    expect(formatBreakMs(9_500)).toBe('0:10');
  });

  it('floors at 0:00 for elapsed/negative time', () => {
    expect(formatBreakMs(0)).toBe('0:00');
    expect(formatBreakMs(-5_000)).toBe('0:00');
  });
});

describe('breakView', () => {
  it('starts full, running and cyan', () => {
    const v = at(5 * MIN);
    expect(v).toMatchObject({
      phase: 'running',
      display: '5:00',
      fraction: 1,
      color: '#22d3ee',
    });
  });

  it('turns yellow inside the warning window', () => {
    const v = at(BREAK_WARN_MS);
    expect(v?.phase).toBe('warning');
    expect(v?.color).toBe('#facc15');
  });

  it('turns pink inside the critical window', () => {
    const v = at(BREAK_CRITICAL_MS);
    expect(v?.phase).toBe('critical');
    expect(v?.color).toBe('#f472b6');
  });

  it('hits a clear end state at zero', () => {
    const v = at(0);
    expect(v).toMatchObject({
      phase: 'over',
      remainingMs: 0,
      display: '0:00',
      fraction: 0,
      color: '#f472b6',
    });
  });

  it('keeps the end state visible within the linger window', () => {
    expect(at(-(BREAK_OVER_LINGER_MS - 1))?.phase).toBe('over');
  });

  it('hides itself once the end state has lingered long enough', () => {
    expect(at(-BREAK_OVER_LINGER_MS)).toBeNull();
  });

  it('recomputes against an extended end time (fraction can exceed old total)', () => {
    // 1 min into a 5-min break, extended by 2 min → 6 of 7 minutes remain.
    const extended = breakView(startedAt + MIN, startedAt, endsAt + 2 * MIN);
    expect(extended?.display).toBe('6:00');
    expect(extended?.fraction).toBeCloseTo(6 / 7);
  });

  it('degrades safely when the break has no duration', () => {
    const v = breakView(startedAt, startedAt, startedAt);
    expect(v?.fraction).toBe(0);
    expect(v?.phase).toBe('over');
  });
});
