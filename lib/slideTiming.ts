/**
 * Per-slide timing windows, parsed from the `[⏱ start–end · LABEL]` tags that
 * talk decks embed in their presenter notes (minutes from talk start), e.g.
 *
 *   [⏱ 66–69 · THE ROLE OF AI]
 *   [⏱ 28–46 · TOAST ACTIVITY 🍞 · ~18 min · device-free]
 *   [⏱ 99–100+ · Q&A]
 *
 * Pure module (no fs / React) so it's usable from the build-time deck loader
 * (lib/talks.ts), client components, and unit tests alike.
 *
 * Deliberately tolerant: notes whose tag isn't a range from talk start (e.g.
 * `[⏱ ~1 min · ICEBREAKER · overlaps the intro window]`) parse as null —
 * "no window" — and the console simply shows nothing extra for that slide.
 */

export type SlideWindow = {
  /** Window opens N minutes after talk start. */
  startMin: number;
  /** Window closes N minutes after talk start. */
  endMin: number;
};

// `[⏱ 12–34 …]` — en dash, em dash or hyphen between the minute marks; an
// optional trailing `+` on the end mark (`99–100+`); then either the label
// separator `·` or the closing bracket. Anchoring on `⏱ <digits>` is what
// rejects the `~N min` overlap variants.
const WINDOW_RE =
  /\[\s*⏱\s*(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*\+?\s*[·\]]/u;

/**
 * Extract the timing window from a slide's raw presenter notes. Returns null
 * for missing notes, notes without a `⏱` tag, and unparseable/nonsensical
 * variants (non-range tags, reversed ranges) — treat null as "no window".
 */
export function parseSlideWindow(
  notes: string | null | undefined,
): SlideWindow | null {
  if (!notes) return null;

  const match = notes.match(WINDOW_RE);
  if (!match) return null;

  const startMin = Number(match[1]);
  const endMin = Number(match[2]);
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return null;
  if (startMin < 0 || endMin <= startMin) return null;

  return { startMin, endMin };
}

export type Pacing =
  | { kind: 'on-track' }
  | { kind: 'ahead' | 'behind'; minutes: number };

/**
 * Where the talk clock sits relative to the current slide's window: inside it
 * (or within rounding distance of it) is on track; reaching the slide before
 * its window opens is ahead; still on it after the window closes is behind.
 */
export function pacingStatus(
  elapsedSeconds: number,
  window: SlideWindow,
): Pacing {
  const elapsedMin = elapsedSeconds / 60;

  if (elapsedMin < window.startMin) {
    const minutes = Math.round(window.startMin - elapsedMin);
    return minutes > 0 ? { kind: 'ahead', minutes } : { kind: 'on-track' };
  }
  if (elapsedMin > window.endMin) {
    const minutes = Math.round(elapsedMin - window.endMin);
    return minutes > 0 ? { kind: 'behind', minutes } : { kind: 'on-track' };
  }
  return { kind: 'on-track' };
}
