/**
 * The NeanderBonk ruling engine.
 *
 * Poetry for Neanderthals has two rules for the poet giving clues:
 *
 * 1. single-syllable words only;
 * 2. never say the answer, or any part of it.
 *
 * Break either and you get bonked with an inflatable club and forfeit the card.
 * This module decides, per spoken word, whether that happened.
 *
 * ## Why it hedges so much
 *
 * A *missed* violation costs nothing — the table catches it, the way the game
 * has always worked. A *false* bonk is the app wrongly accusing a person, which
 * stops the game dead and makes someone argue with a phone. So the engine emits
 * three verdicts, not two: `bonk` when it is sure, `flag` when it suspects, and
 * `clean` otherwise. Anything short of certain lands on `flag`, where a human
 * decides.
 *
 * Concretely, that means it never bonks on:
 * - a word whose pronunciation genuinely varies ("fire", "hour", "poem");
 * - a word the lexicon has never heard of, where only the heuristic has an
 *   opinion — out-of-vocabulary tokens are disproportionately speech-recognition
 *   garbage, and garbage is where false bonks come from;
 * - caveman noises, which are a completely legitimate clue.
 *
 * Pure module — no React, no DOM. Unit-tested in `tests/neanderbonk-rules.test.ts`.
 */

import {
  countSyllables,
  isFiller,
  type Lexicon,
  normaliseWord,
  type SyllableEstimate,
} from './syllables';

/**
 * How harsh the referee is.
 *
 * This dial is not a nicety. A strict syllable counter structurally punishes
 * non-native speakers, children, and anyone with a speech difference, and a
 * party game that does that isn't fun. It belongs in front of the player, not
 * buried in a settings screen.
 */
export type Strictness = 'kid' | 'lenient' | 'standard' | 'brutal';

export const STRICTNESS_ORDER: readonly Strictness[] = [
  'kid',
  'lenient',
  'standard',
  'brutal',
];

export const STRICTNESS_BLURB: Record<Strictness, string> = {
  kid: 'Three syllables or more. For small Neanderthals.',
  lenient: 'Only bonks words it is certain about. Good for mixed groups.',
  standard: 'The actual rules of the game.',
  brutal: 'Ambiguity counts against you. No mercy, no benefit of the doubt.',
};

export type Verdict = 'clean' | 'flag' | 'bonk';

export type ViolationReason =
  | 'multi-syllable'
  | 'said-the-answer'
  | 'said-part-of-the-answer';

export type Ruling = {
  /** The token as spoken, normalised for display. */
  readonly word: string;
  readonly verdict: Verdict;
  readonly reason?: ViolationReason;
  readonly syllables: SyllableEstimate;
  /** Set when the token was skipped outright (filler, empty). */
  readonly exempt?: boolean;
};

export const REASON_LABEL: Record<ViolationReason, string> = {
  'multi-syllable': 'more than one syllable',
  'said-the-answer': 'said the answer',
  'said-part-of-the-answer': 'said part of the answer',
};

/** Splits a transcript into judgeable tokens. Hyphens split; apostrophes don't. */
export function tokenize(text: string): string[] {
  return text
    .split(/[^\p{L}']+/u)
    .map(normaliseWord)
    .filter((word) => word.length > 0);
}

/**
 * Suffixes that make a word a plausible inflection of another.
 *
 * Used so that "running" counts as giving away "run" while "catch" does not
 * count as giving away "cat" — a bare prefix test flags both.
 */
const INFLECTIONS = [
  '',
  's',
  'es',
  'd',
  'ed',
  'ing',
  'er',
  'ers',
  'est',
  'y',
  'ies',
  'ly',
  'n',
  'en',
  // Doubled final consonant before the suffix: run → running, stop → stopped.
  'ning',
  'ping',
  'ting',
  'ging',
  'ming',
  'bing',
  'ling',
  'ned',
  'ped',
  'ted',
  'ged',
  'med',
  'bed',
  'led',
];

/** True when `longer` looks like an inflected form of `shorter`. */
function isInflectionOf(longer: string, shorter: string): boolean {
  if (!longer.startsWith(shorter) || longer === shorter) return false;
  return INFLECTIONS.includes(longer.slice(shorter.length));
}

/** True when the two words are the same word for the purposes of the rule. */
function sharesRoot(spoken: string, target: string): boolean {
  if (spoken === target) return true;
  // Only compare roots once there is enough word to compare. Below three
  // letters, inflection matching produces nonsense.
  if (spoken.length < 3 || target.length < 3) return false;
  return isInflectionOf(spoken, target) || isInflectionOf(target, spoken);
}

/**
 * Checks a spoken word against the answer.
 *
 * The card's answer may be a phrase ("dog house"), and saying any one of its
 * words is a violation — that is the actual rule, not an over-reach.
 */
function answerViolation(
  spoken: string,
  target: string,
): ViolationReason | undefined {
  const targetWords = tokenize(target);
  if (targetWords.length === 0) return undefined;

  for (const targetWord of targetWords) {
    if (!sharesRoot(spoken, targetWord)) continue;
    return targetWords.length === 1
      ? 'said-the-answer'
      : 'said-part-of-the-answer';
  }
  return undefined;
}

/** Syllable threshold at which a word stops being a legal clue. */
function threshold(strictness: Strictness): number {
  return strictness === 'kid' ? 3 : 2;
}

/**
 * Rules on a single spoken word.
 *
 * @param target the answer being clued — pass an empty string to check syllables
 *   only (e.g. while nobody is holding a card).
 */
export function judgeWord(
  word: string,
  target: string,
  strictness: Strictness,
  lexicon?: Lexicon | null,
): Ruling {
  const spoken = normaliseWord(word);
  const syllables = countSyllables(spoken, lexicon);

  if (!spoken || syllables.max === 0 || isFiller(spoken)) {
    return { word: spoken, verdict: 'clean', syllables, exempt: true };
  }

  // The answer rule outranks the syllable rule: "dog" is a perfectly legal
  // single-syllable word right up until the card says DOG.
  const answer = answerViolation(spoken, target);
  if (answer) {
    // Kid mode forgives near-misses and only calls the word itself.
    const soften = strictness === 'kid' && answer !== 'said-the-answer';
    return {
      word: spoken,
      verdict: soften ? 'flag' : 'bonk',
      reason: answer,
      syllables,
    };
  }

  const limit = threshold(strictness);

  // Brutal takes the longest pronunciation and trusts the heuristic. Everyone
  // else takes the shortest, so variable words like "fire" survive.
  const count = strictness === 'brutal' ? syllables.max : syllables.min;
  if (count < limit) {
    // Below the line on the charitable reading, but over it on the other one:
    // suspicious, not punishable.
    const couldBeOver = syllables.max >= limit;
    return {
      word: spoken,
      verdict: couldBeOver ? 'flag' : 'clean',
      reason: couldBeOver ? 'multi-syllable' : undefined,
      syllables,
    };
  }

  // Over the line. Whether that is a bonk or a flag comes down to how much the
  // count can be trusted.
  const trustworthy =
    strictness === 'brutal' ||
    (syllables.source === 'lexicon' &&
      (strictness !== 'lenient' || syllables.min === syllables.max));

  return {
    word: spoken,
    verdict: trustworthy ? 'bonk' : 'flag',
    reason: 'multi-syllable',
    syllables,
  };
}

/** Rules on every word in a transcript. Convenience for tests and replays. */
export function judgeTranscript(
  text: string,
  target: string,
  strictness: Strictness,
  lexicon?: Lexicon | null,
): Ruling[] {
  return tokenize(text).map((word) =>
    judgeWord(word, target, strictness, lexicon),
  );
}

/** Human-readable explanation of a ruling, for the UI and the replay log. */
export function explainRuling(ruling: Ruling): string {
  if (ruling.verdict === 'clean') return 'legal';

  const { syllables, reason } = ruling;
  if (reason && reason !== 'multi-syllable') return REASON_LABEL[reason];

  const range =
    syllables.min === syllables.max
      ? `${syllables.min}`
      : `${syllables.min}–${syllables.max}`;
  const guess = syllables.source === 'heuristic' ? ', guessed' : '';
  return `${range} syllables${guess}`;
}
