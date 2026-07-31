import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  explainRuling,
  judgeTranscript,
  judgeWord,
  type Strictness,
  tokenize,
} from '../components/experiments/neanderbonk/rules';
import {
  type Lexicon,
  parseLexicon,
} from '../components/experiments/neanderbonk/syllables';

const lexicon: Lexicon = parseLexicon(
  readFileSync(
    path.join(process.cwd(), 'public', 'neanderbonk', 'syllables.txt'),
    'utf8',
  ),
);

const verdict = (
  word: string,
  target = '',
  strictness: Strictness = 'standard',
) => judgeWord(word, target, strictness, lexicon).verdict;

describe('tokenize', () => {
  it('splits on punctuation but keeps contractions whole', () => {
    expect(tokenize("It's a big, round thing — don't you know?")).toEqual([
      "it's",
      'a',
      'big',
      'round',
      'thing',
      "don't",
      'you',
      'know',
    ]);
  });

  it('splits hyphenated compounds into their parts', () => {
    expect(tokenize('dog-house')).toEqual(['dog', 'house']);
  });

  it('drops empty tokens', () => {
    expect(tokenize('  ...  ')).toEqual([]);
  });
});

describe('the syllable rule', () => {
  it('lets single-syllable clues through', () => {
    for (const word of ['dog', 'big', 'round', 'thing', 'run', 'squeeze']) {
      expect(verdict(word), word).toBe('clean');
    }
  });

  it('bonks words the lexicon is certain about', () => {
    for (const word of ['building', 'animal', 'water', 'money', 'people']) {
      expect(verdict(word), word).toBe('bonk');
    }
  });

  it('flags rather than bonks words whose pronunciation varies', () => {
    // One syllable to some speakers, two to others. Bonking these is how an
    // automated referee starts an argument.
    for (const word of ['fire', 'hour', 'our']) {
      expect(verdict(word), word).toBe('flag');
    }
  });

  it('flags rather than bonks words it has never heard of', () => {
    // Out-of-vocabulary tokens are mostly speech-recognition garbage.
    const ruling = judgeWord('zorblatt', '', 'standard', lexicon);
    expect(ruling.syllables.source).toBe('heuristic');
    expect(ruling.verdict).toBe('flag');
  });

  it('exempts caveman noises', () => {
    for (const noise of ['uh', 'umm', 'hmm', 'argh', 'shh']) {
      const ruling = judgeWord(noise, '', 'standard', lexicon);
      expect(ruling.exempt, noise).toBe(true);
      expect(ruling.verdict, noise).toBe('clean');
    }
  });

  it('rules on contractions the way the game does', () => {
    expect(verdict("don't")).toBe('clean');
    expect(verdict("can't")).toBe('clean');
    expect(verdict("isn't")).toBe('bonk');
    expect(verdict("didn't")).toBe('bonk');
    // Heard both ways, so forgiven.
    expect(verdict("you're")).toBe('flag');
  });

  it('only flags before the lexicon has loaded', () => {
    // The page is playable while the lexicon is still in flight, but it does not
    // get to punish anyone on the heuristic's word alone.
    expect(judgeWord('building', '', 'standard', null).verdict).toBe('flag');
    expect(judgeWord('dog', '', 'standard', null).verdict).toBe('clean');
  });
});

describe('the answer rule', () => {
  it('bonks the answer itself', () => {
    expect(verdict('dog', 'dog')).toBe('bonk');
    expect(judgeWord('dog', 'dog', 'standard', lexicon).reason).toBe(
      'said-the-answer',
    );
  });

  it('bonks any word of a multi-word answer', () => {
    expect(judgeWord('dog', 'dog house', 'standard', lexicon).reason).toBe(
      'said-part-of-the-answer',
    );
    expect(judgeWord('house', 'dog house', 'standard', lexicon).reason).toBe(
      'said-part-of-the-answer',
    );
  });

  it('catches inflected forms', () => {
    expect(verdict('dogs', 'dog')).toBe('bonk');
    expect(verdict('running', 'run')).toBe('bonk');
    expect(verdict('run', 'running')).toBe('bonk');
    expect(verdict('houses', 'house')).toBe('bonk');
  });

  it('does not treat a shared prefix as a shared root', () => {
    // "catch" is not a clue for CAT, and flagging it would be a false bonk.
    expect(verdict('catch', 'cat')).toBe('clean');
    expect(verdict('carpet', 'car')).toBe('bonk'); // still multi-syllable…
    expect(judgeWord('carpet', 'car', 'standard', lexicon).reason).toBe(
      'multi-syllable', // …but not for giving the answer away
    );
  });

  it('outranks the syllable rule', () => {
    // "dog" is a legal word until the card says DOG.
    expect(verdict('dog', 'cat')).toBe('clean');
    expect(verdict('dog', 'dog')).toBe('bonk');
  });

  it('ignores the answer when no card is in play', () => {
    expect(verdict('dog', '')).toBe('clean');
  });
});

describe('strictness', () => {
  it('kid mode only calls three syllables or more', () => {
    expect(verdict('building', '', 'kid')).toBe('clean');
    expect(verdict('animal', '', 'kid')).toBe('bonk');
  });

  it('kid mode softens near-misses on the answer', () => {
    expect(verdict('dog', 'dog', 'kid')).toBe('bonk');
    expect(verdict('dog', 'dog house', 'kid')).toBe('flag');
  });

  it('lenient mode only bonks unambiguous counts', () => {
    expect(verdict('building', '', 'lenient')).toBe('bonk');
    // "every" is two syllables or three — certainly a violation, but the count
    // is unsettled, so lenient mode leaves it to the table.
    expect(verdict('every', '', 'lenient')).toBe('flag');
    expect(verdict('every', '', 'standard')).toBe('bonk');
  });

  it('brutal mode takes the longest pronunciation and trusts its guesses', () => {
    expect(verdict('fire', '', 'brutal')).toBe('bonk');
    expect(verdict('zorblatt', '', 'brutal')).toBe('bonk');
    // Still cannot manufacture a violation out of a genuine one-syllable word.
    expect(verdict('dog', '', 'brutal')).toBe('clean');
  });
});

describe('judgeTranscript', () => {
  it('rules on a whole clue', () => {
    const rulings = judgeTranscript(
      'big grey thing with a long nose, it is an animal',
      'elephant',
      'standard',
      lexicon,
    );
    const bonked = rulings.filter((r) => r.verdict === 'bonk');
    expect(bonked.map((r) => r.word)).toEqual(['animal']);
  });

  it('catches the answer leaking out mid-clue', () => {
    const rulings = judgeTranscript(
      'it is a big dog and it lives in a shed',
      'dog',
      'standard',
      lexicon,
    );
    expect(rulings.find((r) => r.verdict === 'bonk')?.reason).toBe(
      'said-the-answer',
    );
  });

  it('leaves a clean caveman clue alone', () => {
    const rulings = judgeTranscript(
      'uh, big cat, has spots, runs fast, grr',
      'cheetah',
      'standard',
      lexicon,
    );
    expect(rulings.every((r) => r.verdict === 'clean')).toBe(true);
  });
});

describe('explainRuling', () => {
  it('explains why a word was called', () => {
    expect(explainRuling(judgeWord('building', '', 'standard', lexicon))).toBe(
      '2 syllables',
    );
    expect(explainRuling(judgeWord('fire', '', 'standard', lexicon))).toBe(
      '1–2 syllables',
    );
    expect(explainRuling(judgeWord('zorblatt', '', 'standard', lexicon))).toBe(
      '2 syllables, guessed',
    );
    expect(explainRuling(judgeWord('dog', 'dog', 'standard', lexicon))).toBe(
      'said the answer',
    );
    expect(explainRuling(judgeWord('dog', '', 'standard', lexicon))).toBe(
      'legal',
    );
  });
});
