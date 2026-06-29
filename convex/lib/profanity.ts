import {
  asteriskCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
  TextCensor,
} from 'obscenity';

// A single shared matcher/censor built from obscenity's English dataset plus the
// recommended transformers, which catch deliberate obfuscation (leetspeak,
// spacing, unicode confusables) — exactly the tricks a room of teenagers will
// try. Pure JS with no Node built-ins, so this runs inside a Convex mutation
// without the `"use node"` runtime.
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Replace each matched region with asterisks, e.g. "f**k", so the audience wall
// stays clean while the submission is still readable.
const censor = new TextCensor().setStrategy(asteriskCensorStrategy());

export interface CleanResult {
  /** The input with any profanity masked. */
  steps: string[];
  /** True if profanity was detected anywhere in the input. */
  flagged: boolean;
}

/** Mask profanity in a single string. Returns the masked text and whether anything matched. */
export function cleanText(text: string): { text: string; flagged: boolean } {
  const matches = matcher.getAllMatches(text);
  if (matches.length === 0) return { text, flagged: false };
  return { text: censor.applyTo(text, matches), flagged: true };
}

/**
 * Mask profanity across an ordered list of steps. `flagged` is true if any step
 * contained profanity, so the moderation screen can highlight the whole entry.
 */
export function cleanSteps(input: string[]): CleanResult {
  let flagged = false;
  const steps = input.map((step) => {
    const result = cleanText(step);
    if (result.flagged) flagged = true;
    return result.text;
  });
  return { steps, flagged };
}
