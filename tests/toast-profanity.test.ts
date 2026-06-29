import { describe, expect, it } from 'vitest';
import { cleanSteps, cleanText } from '../convex/lib/profanity';

describe('toast activity profanity filter', () => {
  it('leaves clean text untouched and unflagged', () => {
    const result = cleanText('put the bread in the toaster');
    expect(result.flagged).toBe(false);
    expect(result.text).toBe('put the bread in the toaster');
  });

  it('masks and flags plain profanity', () => {
    const result = cleanText('this is shit');
    expect(result.flagged).toBe(true);
    expect(result.text).not.toContain('shit');
    // The non-profane words survive.
    expect(result.text).toContain('this is');
  });

  it('catches deliberate obfuscation (leetspeak)', () => {
    // obscenity's recommended transformers normalise leetspeak before matching.
    const result = cleanText('what a sh1t toaster');
    expect(result.flagged).toBe(true);
    expect(result.text).not.toContain('sh1t');
  });

  it('flags the whole submission if any step is profane', () => {
    const { steps, flagged } = cleanSteps([
      'get the bread',
      'press the shit button',
      'eat the toast',
    ]);
    expect(flagged).toBe(true);
    expect(steps[0]).toBe('get the bread');
    expect(steps[1]).not.toContain('shit');
    expect(steps[2]).toBe('eat the toast');
  });

  it('does not flag a fully clean submission', () => {
    const { flagged } = cleanSteps(['get the bread', 'toast it', 'eat it']);
    expect(flagged).toBe(false);
  });
});
