/**
 * Turning a talk into a timeline a frame renderer can seek.
 *
 * The decks already carry per-slide timing — this module does not invent it.
 * `slideTiming.ts` parses the `[⏱ 12–34 · LABEL]` ranges the presenter console
 * uses for pacing, and across the six decks in `data/talks/` those ranges are
 * complete and exactly contiguous: no gaps, no overlaps, and a span that equals
 * the deck's own `durationMins` in every case. A talk is already a fully
 * specified timeline; it has just never been read as one.
 *
 * ## The second tag form
 *
 * `parseSlideWindow` is deliberately tolerant and returns null for anything
 * that is not a range. That drops real information, because decks use a second
 * form for slides that sit *inside* a neighbour's window rather than after it:
 *
 *     [⏱ ~1 min · ICEBREAKER 🗳️ · overlaps the intro window]
 *     [⏱ ~1 min · IBM QUOTE · inside the AI window]
 *
 * Both declare a duration; neither declares a position, because the author's
 * intent is that the minute is *carved out of* the surrounding window rather
 * than added to the talk. Reading only the ranges would give those slides no
 * time at all — a contiguous set of ranges leaves no gap for them to occupy —
 * so they would flash past in a render.
 *
 * {@link parseSlideHint} reads both forms, and {@link talkSchedule} honours the
 * distinction: an approximate slide borrows from its host rather than extending
 * the talk. The total therefore still matches `durationMins`, which is the
 * property that makes the schedule trustworthy.
 *
 * Pure — no fs, no React — so the build-time loader, a composition and the
 * tests all read the same timeline.
 */

import { parseSlideWindow } from './slideTiming';

/**
 * A slide's declared timing, in whichever of the two forms the deck used.
 *
 * `window` places the slide absolutely; `approx` only says how long it wants,
 * and leaves placement to the schedule.
 */
export type SlideHint =
  | { kind: 'window'; startMin: number; endMin: number }
  | { kind: 'approx'; minutes: number }
  | null;

/**
 * `[⏱ ~1 min · …]` — the duration-only form. Anchored on `~` so it cannot
 * match the leading number of a range.
 */
const APPROX_RE = /\[\s*⏱\s*~\s*(\d+(?:\.\d+)?)\s*min/u;

/** Read whichever timing form a slide's notes declare, if either. */
export function parseSlideHint(notes: string | null | undefined): SlideHint {
  const window = parseSlideWindow(notes);
  if (window) return { kind: 'window', ...window };

  if (!notes) return null;
  const approx = notes.match(APPROX_RE);
  if (!approx) return null;

  const minutes = Number(approx[1]);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return { kind: 'approx', minutes };
}

/** One slide's place in the rendered timeline. */
export interface SlideCue {
  index: number;
  /** Seconds from the start of the video. */
  atSec: number;
  /** Seconds this slide holds. */
  durationSec: number;
  /**
   * Where the duration came from — worth carrying, because a schedule made
   * mostly of `default` means the deck has not been timed and the video will
   * be evenly paced rather than authored.
   */
  source: 'window' | 'approx' | 'default';
}

export interface ScheduleOpts {
  /** Seconds for a slide that declares no timing at all. Default 20. */
  defaultSec?: number;
  /**
   * Multiplier on every duration. 1 is the talk's real pace.
   *
   * A hundred-minute conference talk is a hundred-minute video, which is
   * correct for a recording and wrong for anything else — so the knob exists,
   * but it scales the whole timeline rather than letting slides drift apart.
   */
  speed?: number;
}

/** A host window never gives up so much that it stops being a beat of its own. */
const MIN_HOST_SEC = 15;

/**
 * Lay a deck out as a seekable timeline.
 *
 * Two passes and then a cumulative sum, because an `approx` slide's time comes
 * *out of* a neighbour rather than being appended: the deduction has to happen
 * before anything is placed, or the borrowed minute would push every later
 * slide off the window its notes claim.
 */
export function talkSchedule(
  hints: SlideHint[],
  opts: ScheduleOpts = {},
): SlideCue[] {
  const defaultSec = opts.defaultSec ?? 20;
  const speed = opts.speed ?? 1;

  // Pass 1 — what each slide asks for, before anyone lends.
  const raw = hints.map((hint) => {
    if (!hint) return { sec: defaultSec, source: 'default' as const };
    if (hint.kind === 'approx') {
      return { sec: hint.minutes * 60, source: 'approx' as const };
    }
    return {
      sec: (hint.endMin - hint.startMin) * 60,
      source: 'window' as const,
    };
  });

  // Pass 2 — every `approx` slide borrows from its host.
  //
  // The host is the nearest ranged slide *before* it, because the notes say
  // "overlaps"/"inside" the window that is already running when the slide
  // appears. Falling forward to the next window covers a deck that opens on an
  // approximate slide, which nothing does today but costs one branch.
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].source !== 'approx') continue;

    let host = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (raw[j].source === 'window') {
        host = j;
        break;
      }
    }
    if (host === -1) {
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j].source === 'window') {
          host = j;
          break;
        }
      }
    }
    if (host === -1) continue; // nothing to borrow from; the slide extends the talk

    const lendable = Math.max(0, raw[host].sec - MIN_HOST_SEC);
    raw[host].sec -= Math.min(raw[i].sec, lendable);
  }

  // Pass 3 — place them.
  let at = 0;
  return raw.map((slide, index) => {
    const durationSec = slide.sec * speed;
    const cue: SlideCue = {
      index,
      atSec: at,
      durationSec,
      source: slide.source,
    };
    at += durationSec;
    return cue;
  });
}

/** Total run time of a scheduled talk, in seconds. */
export const totalSec = (cues: SlideCue[]): number =>
  cues.length === 0
    ? 0
    : cues[cues.length - 1].atSec + cues[cues.length - 1].durationSec;

/**
 * The slide showing at `sec`, by binary search.
 *
 * Before the start, the first slide; at or past the end, the last — a renderer
 * overshooting the final frame holds on the closing slide rather than falling
 * off the deck.
 */
export function cueAt(cues: SlideCue[], sec: number): SlideCue | null {
  if (cues.length === 0) return null;
  if (sec < 0) return cues[0];
  if (sec >= totalSec(cues)) return cues[cues.length - 1];

  let lo = 0;
  let hi = cues.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cues[mid].atSec <= sec) lo = mid;
    else hi = mid - 1;
  }
  return cues[lo];
}
