import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  countSyllables,
  heuristicSyllables,
  isFiller,
  type Lexicon,
  normaliseWord,
  parseLexicon,
} from '../components/experiments/neanderbonk/syllables';

const lexicon: Lexicon = parseLexicon(
  readFileSync(
    path.join(process.cwd(), 'public', 'neanderbonk', 'syllables.txt'),
    'utf8',
  ),
);

describe('normaliseWord', () => {
  it('lowercases and strips punctuation but keeps apostrophes', () => {
    expect(normaliseWord('Dog,')).toBe('dog');
    expect(normaliseWord("DON'T!")).toBe("don't");
    expect(normaliseWord('don’t')).toBe("don't"); // curly apostrophe
    expect(normaliseWord('...')).toBe('');
  });
});

describe('lexicon', () => {
  it('parses the generated file', () => {
    expect(lexicon.size).toBeGreaterThan(100_000);
  });

  it('knows the counts that decide a round', () => {
    expect(lexicon.get('dog')).toEqual({ min: 1, max: 1 });
    expect(lexicon.get('building')).toEqual({ min: 2, max: 2 });
    expect(lexicon.get('animal')).toEqual({ min: 3, max: 3 });
  });

  it('carries a range for words with more than one pronunciation', () => {
    // The poet gets the benefit of the doubt on all of these.
    for (const word of ['fire', 'hour', 'our']) {
      const range = lexicon.get(word);
      expect(range, word).toBeDefined();
      expect(range?.min, word).toBe(1);
      expect(range?.max, word).toBeGreaterThan(1);
    }
  });
});

describe('countSyllables', () => {
  it('prefers the lexicon and says so', () => {
    expect(countSyllables('building', lexicon)).toEqual({
      min: 2,
      max: 2,
      source: 'lexicon',
    });
  });

  it('falls back to the heuristic for out-of-vocabulary words', () => {
    const estimate = countSyllables('zorblatt', lexicon);
    expect(estimate.source).toBe('heuristic');
    expect(estimate.min).toBe(2);
  });

  it('works with no lexicon loaded at all', () => {
    expect(countSyllables('dog', null)).toEqual({
      min: 1,
      max: 1,
      source: 'heuristic',
    });
  });

  it('rules on contractions the way the game does', () => {
    // Legal.
    for (const word of ["don't", "won't", "can't", "it's", "that's", "i'm"]) {
      expect(countSyllables(word, lexicon).min, word).toBe(1);
    }
    // Bonk.
    for (const word of ["isn't", "didn't", "doesn't", "couldn't", "wasn't"]) {
      expect(countSyllables(word, lexicon).min, word).toBe(2);
    }
    // Forgiven — heard both ways.
    expect(countSyllables("you're", lexicon)).toMatchObject({ min: 1, max: 2 });
  });

  it('handles possessives via the bare plural', () => {
    expect(countSyllables("dog's", lexicon)).toMatchObject({
      min: 1,
      source: 'lexicon',
    });
  });

  it('scores empty tokens as zero rather than one', () => {
    expect(countSyllables('!!!', lexicon).min).toBe(0);
  });
});

describe('isFiller', () => {
  it('exempts caveman noises, which are legitimate clues', () => {
    for (const noise of ['uh', 'um', 'hmm', 'shh', 'ugh', 'Argh!']) {
      expect(isFiller(noise), noise).toBe(true);
    }
    expect(isFiller('dog')).toBe(false);
  });
});

describe('heuristicSyllables', () => {
  it('applies the English ending rules', () => {
    const cases: Array<[string, number]> = [
      ['make', 1], // silent terminal e
      ['there', 1],
      ['square', 1],
      ['table', 2], // -le after a consonant keeps its beat
      ['little', 2],
      ['whole', 1], // -le after a vowel does not
      ['jumped', 1], // silent -ed
      ['walked', 1],
      ['wanted', 2], // -ed after t/d keeps its beat
      ['needed', 2],
      ['makes', 1], // silent -es
      ['boxes', 2], // sibilant keeps its beat
      ['wishes', 2],
      ['going', 2], // -ing after a vowel
      ['being', 2],
      ['trying', 2],
      ['thing', 1], // -ing after a consonant
      ['singing', 2],
      ['player', 2], // -yer
      ['beer', 1], // -eer deliberately excluded
      ['through', 1],
      ['queue', 1],
      ['strength', 1],
    ];
    for (const [word, expected] of cases) {
      expect(heuristicSyllables(word), word).toBe(expected);
    }
  });

  it('scores an empty token as zero', () => {
    expect(heuristicSyllables('')).toBe(0);
  });

  /**
   * The heuristic only ever runs on words the lexicon lacks, so this measures
   * it on the lexicon purely as a proxy for that unseen vocabulary.
   *
   * The number that matters is the second one. Under-counting costs a missed
   * violation, which the table catches anyway; over-counting a genuinely
   * one-syllable word is a false bonk, the one error that ruins the game.
   */
  it('agrees with real pronunciations often, and over-counts rarely', () => {
    let total = 0;
    let inRange = 0;
    let falseBonks = 0;
    let monosyllables = 0;

    for (const [word, range] of lexicon) {
      const n = heuristicSyllables(word);
      total += 1;
      if (n >= range.min && n <= range.max) inRange += 1;
      if (range.max === 1) {
        monosyllables += 1;
        if (n > 1) falseBonks += 1;
      }
    }

    const agreement = inRange / total;
    const falseBonkRate = falseBonks / monosyllables;

    // Printed so a regression shows the actual movement, not just a red test.
    console.log(
      `heuristic: ${(agreement * 100).toFixed(1)}% within range over ${total} words; ` +
        `${(falseBonkRate * 100).toFixed(2)}% of ${monosyllables} monosyllables over-counted`,
    );

    expect(agreement).toBeGreaterThan(0.85);
    expect(falseBonkRate).toBeLessThan(0.05);
  });
});
