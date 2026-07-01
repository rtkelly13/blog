import { describe, expect, it } from 'vitest';
import { getAllTalksFrontMatter, validateTalkFrontMatter } from '../lib/talks';
import type { TalkFrontMatter } from '../types/TalkFrontMatter';

const base: TalkFrontMatter = {
  title: 'Test Talk',
  date: '2026-01-01',
  event: 'Test',
  summary: 'x',
  tags: [],
  slug: 'test',
};

describe('validateTalkFrontMatter', () => {
  it('accepts valid metadata', () => {
    expect(() =>
      validateTalkFrontMatter({ ...base, durationMins: 100 }, 'ok'),
    ).not.toThrow();
  });

  it('accepts a missing (optional) durationMins', () => {
    expect(() => validateTalkFrontMatter(base, 'ok')).not.toThrow();
  });

  it.each([
    0,
    -5,
    601,
    Number.NaN,
    'abc' as unknown as number,
  ])('rejects invalid durationMins: %s', (bad) => {
    expect(() =>
      validateTalkFrontMatter({ ...base, durationMins: bad }, 't'),
    ).toThrow(/durationMins/);
  });

  it('rejects an unparseable date', () => {
    expect(() =>
      validateTalkFrontMatter({ ...base, date: 'not-a-date' }, 't'),
    ).toThrow(/date/);
  });

  it('rejects a missing title', () => {
    expect(() =>
      validateTalkFrontMatter(
        { ...base, title: undefined as unknown as string },
        't',
      ),
    ).toThrow(/title/);
  });
});

describe('real talks', () => {
  it('all talk frontmatter is valid (build would fail otherwise)', () => {
    // getAllTalksFrontMatter runs normalizeFrontMatter -> validate on each file.
    expect(() => getAllTalksFrontMatter()).not.toThrow();
    for (const t of getAllTalksFrontMatter()) {
      if (t.durationMins != null) {
        expect(t.durationMins).toBeGreaterThan(0);
        expect(t.durationMins).toBeLessThanOrEqual(600);
      }
    }
  });
});
