/**
 * A talk as a seekable timeline, and the live machinery left out of it.
 *
 * The schedule tests run against the real decks in `data/talks/` rather than
 * fixtures, because the interesting claim is about the content: the decks are
 * already timed, the timings already tile the talk, and the total already
 * matches what the frontmatter says. Fixtures would prove the arithmetic and
 * miss all three.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LIVE_COMPONENT_NAMES,
  withoutLiveComponents,
} from '../components/talks/liveComponents';
import {
  cueAt,
  parseSlideHint,
  type SlideHint,
  talkSchedule,
  totalSec,
} from '../lib/talkVideo';

/* ── the real decks ───────────────────────────────────────────────────────── */

const TALK_DIR = join(__dirname, '..', 'data', 'talks');

interface Deck {
  slug: string;
  durationMins: number | null;
  hints: SlideHint[];
}

/**
 * Split a deck the way `lib/talks.ts` does — frontmatter, then `---` between
 * slides, then `???` between body and notes. Deliberately a plain parse rather
 * than importing the loader, which compiles MDX through the whole pipeline to
 * answer a question about text.
 */
function loadDecks(): Deck[] {
  return readdirSync(TALK_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const src = readFileSync(join(TALK_DIR, file), 'utf8');
      // Strip the frontmatter block first rather than splitting the whole file
      // on `---`: the slide separator is the same token, so a plain split
      // returns the frontmatter *and* every slide as siblings, and taking
      // index 2 silently yields only the first slide.
      const frontmatter = src.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
      const body = src.replace(/^---\n[\s\S]*?\n---\n/, '');
      const declared = frontmatter.match(/^durationMins:\s*(\d+)/m);
      return {
        slug: file.replace(/\.mdx$/, ''),
        durationMins: declared ? Number(declared[1]) : null,
        hints: body
          .split(/^---$/m)
          .map((slide) => parseSlideHint(slide.split('???')[1] ?? null)),
      };
    });
}

const DECKS = loadDecks();

describe('parseSlideHint', () => {
  it('reads the ranged form the presenter console already uses', () => {
    expect(parseSlideHint('[⏱ 12–34 · SOME LABEL] notes')).toEqual({
      kind: 'window',
      startMin: 12,
      endMin: 34,
    });
  });

  it('reads the duration-only form, which the range parser drops', () => {
    // The gap this module exists to close. `parseSlideWindow` returns null for
    // both of these, which would leave the slides with no time at all.
    expect(
      parseSlideHint('[⏱ ~1 min · ICEBREAKER 🗳️ · overlaps the intro window]'),
    ).toEqual({ kind: 'approx', minutes: 1 });
    expect(
      parseSlideHint('[⏱ ~2.5 min · IBM QUOTE · inside the AI window]'),
    ).toEqual({ kind: 'approx', minutes: 2.5 });
  });

  it('prefers a range when a slide somehow declares both', () => {
    expect(parseSlideHint('[⏱ 5–9 · X] and later [⏱ ~1 min · Y]')).toEqual({
      kind: 'window',
      startMin: 5,
      endMin: 9,
    });
  });

  it('returns null for notes with no timing, and for nonsense', () => {
    expect(parseSlideHint(null)).toBeNull();
    expect(parseSlideHint('just some speaker notes')).toBeNull();
    expect(parseSlideHint('[⏱ ~0 min · nothing]')).toBeNull();
    expect(parseSlideHint('[⏱ 9–5 · reversed]')).toBeNull();
  });
});

describe('talkSchedule', () => {
  it('gives a window slide exactly its window', () => {
    const cues = talkSchedule([{ kind: 'window', startMin: 0, endMin: 5 }]);
    expect(cues[0].durationSec).toBe(300);
    expect(cues[0].source).toBe('window');
  });

  it('borrows an approximate slide out of its host, not out of the talk', () => {
    // The whole point of the second tag form. The author wrote "overlaps the
    // intro window", so the minute comes from the intro — the talk does not
    // get a minute longer, and every later slide stays on the window its own
    // notes claim.
    const cues = talkSchedule([
      { kind: 'window', startMin: 0, endMin: 5 },
      { kind: 'approx', minutes: 1 },
      { kind: 'window', startMin: 5, endMin: 9 },
    ]);
    expect(cues[0].durationSec).toBe(240); // 5 min, less the borrowed minute
    expect(cues[1].durationSec).toBe(60);
    expect(cues[2].durationSec).toBe(240);
    expect(totalSec(cues)).toBe(9 * 60); // unchanged
    expect(cues[2].atSec).toBe(5 * 60); // still lands on its own window
  });

  it('leaves a host with a beat of its own rather than borrowing it flat', () => {
    const cues = talkSchedule([
      { kind: 'window', startMin: 0, endMin: 0.5 },
      { kind: 'approx', minutes: 10 },
    ]);
    expect(cues[0].durationSec).toBe(15);
  });

  it('falls forward when a deck opens on an approximate slide', () => {
    const cues = talkSchedule([
      { kind: 'approx', minutes: 1 },
      { kind: 'window', startMin: 0, endMin: 5 },
    ]);
    expect(cues[1].durationSec).toBe(240);
    expect(totalSec(cues)).toBe(300);
  });

  it('gives an untimed slide the default, and says so', () => {
    const cues = talkSchedule([null, null], { defaultSec: 12 });
    expect(cues.map((c) => c.durationSec)).toEqual([12, 12]);
    expect(cues.map((c) => c.source)).toEqual(['default', 'default']);
  });

  it('scales the whole timeline together', () => {
    const hints: SlideHint[] = [
      { kind: 'window', startMin: 0, endMin: 4 },
      { kind: 'window', startMin: 4, endMin: 10 },
    ];
    const real = talkSchedule(hints);
    const quick = talkSchedule(hints, { speed: 0.25 });
    expect(totalSec(quick)).toBe(totalSec(real) * 0.25);
    // Proportions hold — a speed knob that let slides drift apart would be a
    // different deck, not a faster one.
    expect(quick[1].durationSec / quick[0].durationSec).toBeCloseTo(
      real[1].durationSec / real[0].durationSec,
      10,
    );
  });

  it('is contiguous: every slide starts where the last one ended', () => {
    for (const deck of DECKS) {
      const cues = talkSchedule(deck.hints);
      let expected = 0;
      for (const cue of cues) {
        expect(cue.atSec, deck.slug).toBeCloseTo(expected, 6);
        expected += cue.durationSec;
      }
    }
  });

  it('gives every slide a positive duration', () => {
    // The failure the second tag form prevents: with only ranges parsed, the
    // two `~1 min` slides in so-you-want-to-build-software would sit inside a
    // contiguous set of windows with no room, and flash past.
    for (const deck of DECKS) {
      for (const cue of talkSchedule(deck.hints)) {
        expect(
          cue.durationSec,
          `${deck.slug} slide ${cue.index}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('the decks are already a timeline', () => {
  it('finds timing on every slide of every authored deck', () => {
    // e2e-debug-deck is a test fixture with no notes at all, so it is the one
    // deck that legitimately schedules on defaults.
    for (const deck of DECKS.filter((d) => d.slug !== 'e2e-debug-deck')) {
      const untimed = deck.hints.filter((h) => h === null).length;
      expect(untimed, `${deck.slug} has ${untimed} untimed slides`).toBe(0);
    }
  });

  it('runs for as long as the frontmatter says it will', () => {
    // The claim that makes the schedule trustworthy: the windows an author
    // wrote for pacing already add up to the talk they declared. Nothing
    // enforced that before — this test is the first thing that does.
    for (const deck of DECKS.filter((d) => d.slug !== 'e2e-debug-deck')) {
      if (deck.durationMins === null) continue;
      expect(totalSec(talkSchedule(deck.hints)) / 60, deck.slug).toBeCloseTo(
        deck.durationMins,
        6,
      );
    }
  });

  it('covers a real deck end to end without a gap', () => {
    const deck = DECKS.find((d) => d.slug === 'so-you-want-to-build-software');
    if (!deck) throw new Error('deck missing');
    const cues = talkSchedule(deck.hints);
    expect(cues).toHaveLength(deck.hints.length);
    expect(cues.filter((c) => c.source === 'approx')).toHaveLength(2);
    expect(totalSec(cues)).toBe(100 * 60);
  });
});

describe('cueAt', () => {
  const cues = talkSchedule([
    { kind: 'window', startMin: 0, endMin: 2 },
    { kind: 'window', startMin: 2, endMin: 5 },
    { kind: 'window', startMin: 5, endMin: 6 },
  ]);

  it('returns each slide at its start and last moment', () => {
    for (const cue of cues) {
      expect(cueAt(cues, cue.atSec)).toEqual(cue);
      expect(cueAt(cues, cue.atSec + cue.durationSec - 0.001)).toEqual(cue);
    }
  });

  it('seeking anywhere equals playing there', () => {
    // The property a frame renderer needs: a jump mid-render must produce the
    // frame playback would have shown.
    for (let sec = 0; sec < totalSec(cues); sec += 1 / 30) {
      const seek = cueAt(cues, sec);
      expect(seek).not.toBeNull();
      expect(sec).toBeGreaterThanOrEqual(seek?.atSec ?? -1);
      expect(sec).toBeLessThan((seek?.atSec ?? 0) + (seek?.durationSec ?? 0));
    }
  });

  it('holds the last slide past the end rather than falling off the deck', () => {
    expect(cueAt(cues, totalSec(cues))).toEqual(cues[2]);
    expect(cueAt(cues, 1e6)).toEqual(cues[2]);
    expect(cueAt(cues, -50)).toEqual(cues[0]);
    expect(cueAt([], 5)).toBeNull();
  });
});

/* ── live components ──────────────────────────────────────────────────────── */

describe('live components are left out of a render', () => {
  it('blanks each one, and leaves everything else alone', () => {
    type Stub = (props: Record<string, unknown>) => unknown;
    const map: Record<string, Stub> = {
      LivePoll: () => 'poll',
      Diagram: () => 'diagram',
      NoteBlock: () => 'note',
    };
    const rendered = withoutLiveComponents(map);
    expect(rendered.LivePoll({})).toBeNull();
    expect(rendered.Diagram({})).toBe('diagram');
    expect(rendered.NoteBlock({})).toBe('note');
  });

  it('does not add components a map never had', () => {
    expect(Object.keys(withoutLiveComponents({ Diagram: () => null }))).toEqual(
      ['Diagram'],
    );
  });

  it('covers every realtime component the talks module exports', () => {
    // The guard that matters. A new live widget added to the barrel and not to
    // the list would render its loading state into a video, silently — so the
    // list is checked against the source rather than against memory.
    const dir = join(__dirname, '..', 'components', 'talks');
    const barrel = readFileSync(join(dir, 'index.ts'), 'utf8');
    const exported = [...barrel.matchAll(/from '\.\/(\w+)'/g)].map((m) => m[1]);
    expect(exported.length).toBeGreaterThan(0);

    const realtime = exported.filter((name) => {
      const src = readFileSync(join(dir, `${name}.tsx`), 'utf8');
      return /useQuery|useMutation|convex/i.test(src);
    });
    expect(realtime.length).toBeGreaterThan(0);

    const missing = realtime.filter(
      (name) => !(LIVE_COMPONENT_NAMES as readonly string[]).includes(name),
    );
    expect(missing, `not blanked for video: ${missing.join(', ')}`).toEqual([]);
  });

  it('names nothing that does not exist', () => {
    const dir = join(__dirname, '..', 'components', 'talks');
    const files = readdirSync(dir);
    for (const name of LIVE_COMPONENT_NAMES) {
      expect(files, name).toContain(`${name}.tsx`);
    }
  });
});
