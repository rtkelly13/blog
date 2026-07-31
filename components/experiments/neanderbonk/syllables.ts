/**
 * Syllable counting for the NeanderBonk referee.
 *
 * Two tiers, in order:
 *
 * 1. **Lexicon** — `public/neanderbonk/syllables.txt`, derived from the CMU
 *    Pronouncing Dictionary (see `scripts/generate-neanderbonk-lexicon.mjs`).
 *    117k words with real pronunciation-derived counts, fetched on demand by
 *    the page and never bundled.
 * 2. **Heuristic** — vowel-group counting with the usual English endings, for
 *    anything the lexicon misses (proper nouns, slang, ASR mangling).
 *
 * The error costs here are wildly asymmetric. A missed violation is free — the
 * humans at the table catch it themselves, as they always have. A *false* bonk
 * is the app wrongly accusing someone, which stops the game and makes a person
 * argue with a phone. So every ambiguity resolves in the poet's favour: words
 * with more than one pronunciation carry a range, and the referee judges on the
 * `min`.
 *
 * Pure module — no React, no DOM, no Android. Unit-tested in
 * `tests/neanderbonk-syllables.test.ts`, including a whole-lexicon accuracy
 * measurement for the heuristic.
 */

/** Inclusive syllable range. `min === max` when the pronunciation is settled. */
export type SyllableRange = {
  readonly min: number;
  readonly max: number;
};

export type SyllableSource = 'lexicon' | 'heuristic';

export type SyllableEstimate = SyllableRange & {
  readonly source: SyllableSource;
};

export type Lexicon = ReadonlyMap<string, SyllableRange>;

/** Where the page fetches the generated lexicon from. */
export const LEXICON_URL = '/neanderbonk/syllables.txt';

/**
 * Strips a spoken token down to a lookup key: lowercase letters, apostrophes
 * kept (they distinguish "cant" from "can't" in the lexicon's eyes — see
 * `CONTRACTIONS`), everything else dropped.
 */
export function normaliseWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z']/g, '')
    .replace(/^'+|'+$/g, '');
}

/**
 * Contractions, which neither tier gets right on its own.
 *
 * CMUdict spells them without the apostrophe or not at all, and the heuristic
 * cannot know that "isn't" keeps its second syllable while "don't" doesn't.
 * This is the one hand-maintained table, and it is small and closed.
 *
 * The distinction matters in play: "don't" is a legal clue, "doesn't" is a bonk.
 */
const CONTRACTIONS: Record<string, SyllableRange> = {
  // Legal — one syllable.
  "don't": { min: 1, max: 1 },
  "won't": { min: 1, max: 1 },
  "can't": { min: 1, max: 1 },
  "ain't": { min: 1, max: 1 },
  "i'm": { min: 1, max: 1 },
  "i'd": { min: 1, max: 1 },
  "i'll": { min: 1, max: 1 },
  "i've": { min: 1, max: 1 },
  "it's": { min: 1, max: 1 },
  "he's": { min: 1, max: 1 },
  "she's": { min: 1, max: 1 },
  "that's": { min: 1, max: 1 },
  "what's": { min: 1, max: 1 },
  "let's": { min: 1, max: 1 },
  "there's": { min: 1, max: 1 },
  "here's": { min: 1, max: 1 },
  "who's": { min: 1, max: 1 },
  "we'll": { min: 1, max: 1 },
  "we've": { min: 1, max: 1 },
  "we're": { min: 1, max: 1 },
  "you'll": { min: 1, max: 1 },
  "you've": { min: 1, max: 1 },
  "they'll": { min: 1, max: 1 },
  "they've": { min: 1, max: 1 },
  "he'll": { min: 1, max: 1 },
  "she'll": { min: 1, max: 1 },
  "he'd": { min: 1, max: 1 },
  "she'd": { min: 1, max: 1 },
  "we'd": { min: 1, max: 1 },
  "you'd": { min: 1, max: 1 },
  "they'd": { min: 1, max: 1 },
  // Forgiven — heard as one or two depending on the speaker.
  "you're": { min: 1, max: 2 },
  "they're": { min: 1, max: 2 },
  "aren't": { min: 1, max: 2 },
  "weren't": { min: 1, max: 2 },
  // Bonk — the "n't" keeps its own beat.
  "isn't": { min: 2, max: 2 },
  "wasn't": { min: 2, max: 2 },
  "hasn't": { min: 2, max: 2 },
  "haven't": { min: 2, max: 2 },
  "hadn't": { min: 2, max: 2 },
  "didn't": { min: 2, max: 2 },
  "doesn't": { min: 2, max: 2 },
  "couldn't": { min: 2, max: 2 },
  "wouldn't": { min: 2, max: 2 },
  "shouldn't": { min: 2, max: 2 },
  "mustn't": { min: 2, max: 2 },
};

/**
 * Noises that are not words and must never be judged.
 *
 * The Web Speech API happily transcribes caveman grunting, and grunting is a
 * completely legitimate clue in this game.
 */
const FILLERS = new Set([
  'uh',
  'um',
  'umm',
  'uhh',
  'er',
  'erm',
  'ah',
  'ahh',
  'aah',
  'oh',
  'ooh',
  'ow',
  'eh',
  'hm',
  'hmm',
  'mm',
  'mmm',
  'mhm',
  'huh',
  'sh',
  'shh',
  'psst',
  'argh',
  'ugh',
  'grr',
  'yeah',
  'yep',
  'nope',
  'nah',
  'ok',
  'okay',
]);

/** True for tokens the referee ignores entirely. */
export function isFiller(word: string): boolean {
  return FILLERS.has(normaliseWord(word));
}

const VOWEL_GROUP = /[aeiouy]+/g;

/**
 * Vowel-group syllable estimate, used only when the lexicon has no entry.
 *
 * The adjustments are the standard English ones, each chosen to avoid
 * *over*-counting (which would produce a false bonk) even at the cost of
 * under-counting:
 *
 * - a trailing `e` is silent (`make` → 1), unless the word ends `-le` after a
 *   consonant (`table` → 2);
 * - `-ed` is silent unless it follows `d`/`t` (`jumped` → 1, `wanted` → 2);
 * - `-es` is silent unless it follows a sibilant (`makes` → 1, `boxes` → 2);
 * - `-ing` after a vowel adds a beat (`going` → 2, `thing` → 1);
 * - `-yer` adds a beat (`player` → 2), which `-eer` deliberately does not
 *   (`beer` stays 1).
 */
export function heuristicSyllables(word: string): number {
  const w = normaliseWord(word).replace(/'/g, '');
  if (!w) return 0;
  // Short words are effectively always monosyllabic, and the ending rules below
  // misfire on them ("the", "she", "ice").
  if (w.length <= 3) return 1;

  let count = (w.match(VOWEL_GROUP) ?? []).length;

  if (/[aeiouy]ing$/.test(w)) {
    // going, being, trying — the "ing" is its own beat.
    count += 1;
  } else if (/yer$/.test(w) && w.length > 4) {
    // player, lawyer, buyer.
    count += 1;
  }

  // `-lle`, `-gue` and `-que` hide their terminal e behind a vowel or a doubled
  // l, so the general rule below misses them: belle, vogue, cheque are all one
  // syllable. These three endings were 70% of the heuristic's over-counting.
  const silentTerminalE =
    /(?:lle|gue|que)$/.test(w) ||
    (/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w));

  if (silentTerminalE) {
    // make, there, square, belle, vogue. "table" and "little" are excluded.
    count -= 1;
  } else if (/[^dt]ed$/.test(w)) {
    // Silent -ed: jumped, walked. "wanted"/"needed" keep theirs.
    count -= 1;
  } else if (/[^sxzcgh]es$/.test(w)) {
    // Silent -es: makes, names. Sibilants keep theirs: boxes, wishes, houses.
    count -= 1;
  }

  return Math.max(1, count);
}

/**
 * Best available syllable estimate for one spoken token.
 *
 * @param lexicon omit (or pass `null`) before the lexicon has loaded — the
 *   heuristic answers alone, and callers can see that in `source`.
 */
export function countSyllables(
  word: string,
  lexicon?: Lexicon | null,
): SyllableEstimate {
  const key = normaliseWord(word);
  if (!key) return { min: 0, max: 0, source: 'heuristic' };

  const contraction = CONTRACTIONS[key];
  if (contraction) return { ...contraction, source: 'lexicon' };

  const direct = lexicon?.get(key);
  if (direct) return { ...direct, source: 'lexicon' };

  // Possessives and contracted forms the lexicon spells bare: "dog's" → "dogs",
  // which CMUdict does have. Only safe for the `'s` case; other apostrophes are
  // covered by CONTRACTIONS above.
  if (key.endsWith("'s")) {
    const bare = lexicon?.get(`${key.slice(0, -2)}s`);
    if (bare) return { ...bare, source: 'lexicon' };
  }

  const stripped = key.replace(/'/g, '');
  const withoutApostrophe =
    stripped === key ? undefined : lexicon?.get(stripped);
  if (withoutApostrophe) return { ...withoutApostrophe, source: 'lexicon' };

  const n = heuristicSyllables(key);
  return { min: n, max: n, source: 'heuristic' };
}

/**
 * Parses the generated lexicon file.
 *
 * Deliberately tolerant: a malformed line is skipped rather than thrown on, so
 * a bad deploy of the data file degrades the referee to heuristic-only instead
 * of breaking the page.
 */
export function parseLexicon(text: string): Lexicon {
  const lexicon = new Map<string, SyllableRange>();

  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;

    const firstSpace = line.indexOf(' ');
    if (firstSpace < 1) continue;

    const [minRaw, maxRaw] = line.slice(0, firstSpace).split('-');
    const min = Number(minRaw);
    const max = maxRaw === undefined ? min : Number(maxRaw);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1) continue;

    const range: SyllableRange = { min, max: Math.max(min, max) };
    for (const word of line.slice(firstSpace + 1).split(' ')) {
      if (word) lexicon.set(word, range);
    }
  }

  return lexicon;
}

/** Fetches and parses the lexicon. Callers treat failure as heuristic-only. */
export async function loadLexicon(
  signal?: AbortSignal,
  url: string = LEXICON_URL,
): Promise<Lexicon> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`lexicon fetch failed: ${response.status}`);
  }
  return parseLexicon(await response.text());
}
