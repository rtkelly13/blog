import { expect, test } from '@playwright/test';

/**
 * End-to-end cover for the NeanderBonk referee.
 *
 * Headless Chromium has no working speech recognition — the constructor exists
 * but the service behind it does not — so the tests install a fake
 * `SpeechRecognition` before the page loads and drive transcripts through it
 * directly. That is the point rather than a compromise: it makes the pipeline
 * from transcript to ruling to bonk dialog deterministic, which real speech
 * never would be.
 */

const ROUTE = '/experiments/neanderbonk';

/**
 * Installs a fake recogniser and exposes `window.__say(text)` to push a final
 * transcript through it.
 */
async function stubSpeechRecognition(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;

      start() {
        (window as unknown as { __live?: FakeRecognition }).__live = this;
        this.onstart?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }

    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      FakeRecognition;

    // Utterances accumulate, because that is what the real API does: each final
    // result keeps its own index and the list only grows. The app relies on it —
    // it tracks how many words of each index it has already judged so a word is
    // never ruled on twice.
    const spoken: Array<{ transcript: string }[]> = [];

    (window as unknown as { __say: (text: string) => void }).__say = (text) => {
      const live = (window as unknown as { __live?: FakeRecognition }).__live;
      if (!live) throw new Error('recognition not started');

      // Final results are judged in full; interim ones hold back their last
      // word, which would make the assertions depend on padding.
      spoken.push(
        Object.assign([{ transcript: text }], { length: 1, isFinal: true }),
      );
      live.onresult?.({
        resultIndex: spoken.length - 1,
        results: Object.assign(spoken, { length: spoken.length }),
      });
    };
  });
}

/** Opens the page, waits for the lexicon, and starts a live round with `target`. */
async function startRound(
  page: import('@playwright/test').Page,
  target: string,
) {
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });

  // The referee only bonks once the real lexicon is in; before that it flags.
  await expect(page.getByText(/WORDS$/)).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder(/.+/).first().fill(target);
  await page.getByRole('button', { name: /Start .+ round/ }).click();
  // Open mic hands microphone control to the round, so the fake starts itself.
  await page.getByRole('button', { name: 'Open mic' }).click();
  await expect(page.getByText('LISTENING')).toBeVisible();
}

test.describe('NeanderBonk', () => {
  test('renders and loads the syllable lexicon', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1')).toContainText('NEANDERBONK');
    // 117k words, fetched as a static asset rather than bundled.
    await expect(page.getByText(/WORDS$/)).toBeVisible({ timeout: 20_000 });
  });

  test('is listed on the experiments index', async ({ page }) => {
    await page.goto('/experiments', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`a[href="${ROUTE}"]`)).toBeVisible();
  });

  test('is excluded from search indexing', async ({ page }) => {
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });

  test('grants itself the microphone, and no other page does', async ({
    request,
  }) => {
    const experiment = await request.get(ROUTE);
    expect(experiment.headers()['permissions-policy']).toContain(
      'microphone=(self)',
    );

    const home = await request.get('/');
    expect(home.headers()['permissions-policy']).toContain('microphone=()');
  });

  test('bonks a multi-syllable clue', async ({ page }) => {
    await stubSpeechRecognition(page);
    await startRound(page, 'cat');

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say(
        'big grey building',
      ),
    );

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    // "Bonk" in the DOM; the shouting is a CSS text-transform.
    await expect(dialog).toContainText('Bonk');
    await expect(dialog).toContainText('building');
    await expect(dialog).toContainText('2 syllables');
  });

  test('bonks the answer word', async ({ page }) => {
    await stubSpeechRecognition(page);
    await startRound(page, 'dog');

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say(
        'it is a dog',
      ),
    );

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('said the answer');
  });

  test('leaves a legal caveman clue alone', async ({ page }) => {
    await stubSpeechRecognition(page);
    await startRound(page, 'cat');

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say(
        'uh, small thing, has fur, drinks milk, goes mew',
      ),
    );

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByText('mew')).toBeVisible();
  });

  test('overruling a bonk dismisses it and keeps the round going', async ({
    page,
  }) => {
    await stubSpeechRecognition(page);
    await startRound(page, 'cat');

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say(
        'big grey building',
      ),
    );
    await expect(page.getByRole('alertdialog')).toBeVisible();

    await page.getByRole('button', { name: /Overrule/ }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    // Nothing was logged against the team: an overruled call never happened.
    await expect(page.getByText('[ RULING LOG ]')).toHaveCount(0);
  });

  test('accepting a bonk forfeits the card and logs it', async ({ page }) => {
    await stubSpeechRecognition(page);
    await startRound(page, 'cat');

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say(
        'big grey building',
      ),
    );
    await page.getByRole('button', { name: /Fair/ }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByText('[ RULING LOG ]')).toBeVisible();
    await expect(page.getByText(/2 syllables/)).toBeVisible();
  });

  test('kid mode lets two syllables through', async ({ page }) => {
    await stubSpeechRecognition(page);
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/WORDS$/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'kid', exact: true }).click();
    await page.getByPlaceholder(/.+/).first().fill('cat');
    await page.getByRole('button', { name: /Start .+ round/ }).click();
    await page.getByRole('button', { name: 'Open mic' }).click();

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say(
        'big grey building',
      ),
    );

    // Two syllables is legal for small Neanderthals; three is not.
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.evaluate(() =>
      (window as unknown as { __say: (t: string) => void }).__say('an animal'),
    );
    await expect(page.getByRole('alertdialog')).toContainText('animal');
  });
});
