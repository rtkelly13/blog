#!/usr/bin/env node
/**
 * Live-talk end-to-end harness (puppeteer-core).
 *
 * Drives the full audience-participation flow across three concurrent tabs —
 * the admin cockpit, the presenter deck, and an attendee on /live — against a
 * running dev server, reusing an already-signed-in Chrome so we never automate
 * the GitHub OAuth dance.
 *
 * It connects over CDP to an existing browser (the agent-browser dev profile,
 * or any Chrome launched with --remote-debugging-port). Point it at that
 * browser and the dev server:
 *
 *   BASE_URL=http://localhost:3002 \
 *   CDP_URL=http://127.0.0.1:53460 \
 *   node tests/live-e2e.mjs
 *
 * Exit code 0 = every assertion passed. Non-zero = at least one failed (the
 * summary lists which). The harness starts a fresh live "E2E Debug Deck"
 * session, exercises Q&A + poll + ordered-actions + reactions + moderation +
 * deck-native reveal, then clears the session down so it leaves no residue.
 */

import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3002';
const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:53460';
// When set (and the app was built with NEXT_PUBLIC_E2E_BYPASS=1), the harness
// launches its own headless browser and signs in via the `e2e` bypass provider
// instead of attaching to a pre-authenticated profile over CDP. This is the
// CI path — no OAuth, no profile. See ADR-0005.
const E2E_BYPASS = process.env.E2E_BYPASS === '1';
const SLUG = 'e2e-debug-deck';

/** Resolve a Chromium executable for headless bypass mode: an explicit
 * CHROME_PATH wins; otherwise use Playwright's installed chromium (present in
 * this repo's CI for the visual suites). */
async function chromiumPath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const { chromium } = await import('@playwright/test');
  return chromium.executablePath();
}

// ── tiny assertion harness ──────────────────────────────────────────────────
const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${tag}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function step(msg) {
  console.log(`\n\x1b[36m▸ ${msg}\x1b[0m`);
}

/** Run a phase; a thrown error is recorded as a failure but doesn't abort the run. */
async function guard(label, fn) {
  try {
    await fn();
  } catch (e) {
    record(
      `${label}: phase errored`,
      false,
      (e?.message || String(e)).slice(0, 90),
    );
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll `fn` until it returns truthy or we time out. Returns the value or null. */
async function until(fn, { timeout = 12000, interval = 300 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* transient — keep polling */
    }
    if (Date.now() > deadline) return null;
    await sleep(interval);
  }
}

/** Whole-page text (uppercased by CSS in places, so match case-insensitively). */
async function bodyText(page) {
  return page.evaluate(() => document.body.innerText || '');
}

async function pageHasText(page, needle) {
  const t = (await bodyText(page)).toLowerCase();
  return t.includes(needle.toLowerCase());
}

async function waitForText(page, needle, opts) {
  return until(() => pageHasText(page, needle), opts);
}

/** Wait until an input/textarea with the given placeholder substring exists. */
async function waitForField(page, placeholderPart, opts) {
  return until(
    () =>
      page.evaluate((part) => {
        const inputs = Array.from(document.querySelectorAll('input, textarea'));
        return inputs.some((i) =>
          (i.getAttribute('placeholder') || '')
            .toLowerCase()
            .includes(part.toLowerCase()),
        );
      }, placeholderPart),
    opts,
  );
}

/**
 * Click the moderation button (verb "reject"/"block") in the row that contains
 * `rowText`. Returns true if a matching button was found and clicked.
 */
async function moderateRow(page, rowText, verb) {
  return page.evaluate(
    (text, verbRe) => {
      const re = new RegExp(verbRe, 'i');
      const rows = Array.from(document.querySelectorAll('li, div'));
      const row = rows
        .filter((r) => (r.innerText || '').includes(text))
        // innermost matching row wins (avoids clicking a parent's other buttons)
        .sort((a, b) => a.innerText.length - b.innerText.length)[0];
      if (!row) return false;
      const btn = Array.from(row.querySelectorAll('button')).find((b) =>
        re.test((b.innerText || '').trim()),
      );
      if (!btn) return false;
      btn.click();
      return true;
    },
    rowText,
    verb,
  );
}

/** Click the first element matching a CSS selector whose text includes `text`. */
async function clickByText(page, selector, text) {
  // A backgrounded tab is throttled — element ops (click/scroll-into-view) can
  // hang. Foreground it first so interactions stay responsive.
  await page.bringToFront().catch(() => {});
  const handle = await page.evaluateHandle(
    (sel, needle) => {
      const els = Array.from(document.querySelectorAll(sel));
      return (
        els.find((e) =>
          (e.innerText || '').toLowerCase().includes(needle.toLowerCase()),
        ) ?? null
      );
    },
    selector,
    text,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`no ${selector} with text "${text}"`);
  await el.click();
  return true;
}

/** Type into an input/textarea located by its placeholder substring. */
async function typeByPlaceholder(
  page,
  placeholderPart,
  value,
  { submit } = {},
) {
  // Foreground the tab so typing isn't throttled (see clickByText).
  await page.bringToFront().catch(() => {});
  const el = await until(async () => {
    const h = await page.evaluateHandle((part) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      return (
        inputs.find((i) =>
          (i.getAttribute('placeholder') || '')
            .toLowerCase()
            .includes(part.toLowerCase()),
        ) ?? null
      );
    }, placeholderPart);
    return h.asElement();
  });
  if (!el) throw new Error(`no field with placeholder ~"${placeholderPart}"`);
  // Clear any existing value before typing — clickCount:3 select-all isn't
  // reliable across inputs, and a pre-filled field (e.g. the default slug) would
  // otherwise get the new text spliced into the middle.
  await el.focus();
  await el.evaluate((n) => {
    if (typeof n.select === 'function') n.select();
  });
  await el.press('Backspace');
  await el.type(value, { delay: 8 });
  if (submit) await el.press('Enter');
  return el;
}

async function newTab(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });
  return page;
}

// ── the run ─────────────────────────────────────────────────────────────────
async function main() {
  let browser;
  if (E2E_BYPASS) {
    step('Launching headless browser (E2E bypass auth)');
    browser = await puppeteer.launch({
      executablePath: await chromiumPath(),
      headless: true,
      defaultViewport: { width: 1400, height: 900 },
      protocolTimeout: 30000,
    });
  } else {
    step(`Connecting to browser at ${CDP_URL}`);
    browser = await puppeteer.connect({
      browserURL: CDP_URL,
      defaultViewport: null,
      protocolTimeout: 30000,
    });
  }

  // Close any stray tabs left by a previous run so they don't starve the deck.
  for (const p of await browser.pages()) {
    if (/localhost/.test(p.url())) await p.close().catch(() => {});
  }

  const admin = await newTab(browser, '/admin');

  // Bypass mode: a fresh browser has no session — sign in via the e2e provider
  // (button rendered only when the app was built with NEXT_PUBLIC_E2E_BYPASS=1).
  if (E2E_BYPASS) {
    const btn = await until(() => admin.$('[data-testid="e2e-signin"]'), {
      timeout: 20000,
    });
    record('admin: e2e sign-in button present', Boolean(btn));
    if (btn) await btn.click();
  }

  // Sanity: we're signed in as an admin (cockpit visible, no sign-in wall).
  // AdminGate validates the token server-side, which can take a beat.
  const signedIn = await waitForText(admin, 'signed in as', { timeout: 25000 });
  record(
    E2E_BYPASS
      ? 'admin: signed in (e2e bypass)'
      : 'admin: signed in (reused OAuth session)',
    Boolean(signedIn),
  );
  if (!signedIn) {
    console.error(
      E2E_BYPASS
        ? '\nBypass sign-in failed — is AUTH_E2E_BYPASS_SECRET set on the deployment, NEXT_PUBLIC_E2E_BYPASS=1 on the app build, and the bypass login on ADMIN_GITHUB_LOGINS?'
        : '\nNot signed in — open the CDP browser and sign in first.',
    );
    printSummaryAndExit();
    return;
  }

  // ── reset: end any live talk, start a fresh debug-deck session ────────────
  step('Reset — end any live talk, start fresh E2E Debug Deck');
  if (await pageHasText(admin, 'End talk')) {
    await clickByText(admin, 'button', 'End talk');
    await until(async () => !(await pageHasText(admin, 'End talk')));
  }
  // Fill slug + title, enable all three features, start.
  await typeByPlaceholder(admin, 'talk slug', SLUG);
  await typeByPlaceholder(admin, 'talk title', 'E2E Debug Deck');
  // Ensure presence/reactions/follow checkboxes are all ticked (follow drives
  // the deck-native reveal broadcast path). Use real puppeteer clicks — a
  // programmatic .click() inside evaluate doesn't fire React's controlled
  // checkbox onChange, so features would silently stay off.
  await admin.bringToFront().catch(() => {});
  for (const box of await admin.$$('input[type="checkbox"]')) {
    if (!(await box.evaluate((el) => el.checked))) await box.click();
  }
  await clickByText(admin, 'button', 'Start talk');
  const live = await waitForText(admin, '● Live', { timeout: 10000 });
  record('admin: talk went live', Boolean(live));
  const cockpit = await waitForText(admin, 'Audience participation', {
    timeout: 8000,
  });
  record('admin: audience-participation cockpit visible', Boolean(cockpit));

  // ── attendee joins /live ──────────────────────────────────────────────────
  step('Attendee joins /live');
  const attendee = await newTab(browser, '/live');
  const joined = await waitForText(attendee, 'Live now', { timeout: 10000 });
  record('attendee: sees "Live now"', Boolean(joined));
  record(
    'attendee: sees talk title',
    await pageHasText(attendee, 'E2E Debug Deck'),
  );

  // ── Q&A: ask, upvote, moderate ────────────────────────────────────────────
  step('Q&A — ask, then moderate (block) a second question');
  await typeByPlaceholder(attendee, 'question', 'What language first?', {
    submit: true,
  });
  const qOnAdmin = await waitForText(admin, 'What language first?', {
    timeout: 10000,
  });
  record('Q&A: attendee question reaches cockpit', Boolean(qOnAdmin));
  const qOnAttendee = await waitForText(attendee, 'What language first?', {
    timeout: 8000,
  });
  record('Q&A: question shows in attendee queue', Boolean(qOnAttendee));

  // Ask a second, then block it from the cockpit.
  await typeByPlaceholder(attendee, 'question', 'BLOCK ME spammy question', {
    submit: true,
  });
  await waitForText(admin, 'BLOCK ME spammy question', { timeout: 10000 });
  // The reject button sits in the same row; find the row and click "reject".
  const blocked = await moderateRow(
    admin,
    'BLOCK ME spammy question',
    'reject',
  );
  record('Q&A: blocked the spam question from cockpit', blocked);
  // Attendee should no longer see the text, but should see a blocked count.
  const hiddenFromAttendee = await until(
    async () =>
      !(await pageHasText(attendee, 'BLOCK ME spammy question')) &&
      (await pageHasText(attendee, 'blocked')),
    { timeout: 10000 },
  );
  record(
    'Q&A: blocked entry hidden from attendee + shown as count',
    Boolean(hiddenFromAttendee),
  );

  // Presenter deck tab is opened in the activity phase; declared here so the
  // final cleanup can close it even if that phase errors early.
  let presenter = null;

  // ── Poll / word cloud ─────────────────────────────────────────────────────
  await guard('poll', async () => {
    step('Poll — start, submit words, block one word');
    await typeByPlaceholder(admin, 'Poll prompt', 'One word: how do you feel?');
    await clickByText(admin, 'button', 'Start');
    // Attendee should now get the poll form.
    const pollForm = await waitForField(attendee, 'One word', {
      timeout: 12000,
    });
    record('poll: attendee sees the word form', Boolean(pollForm));
    if (pollForm) {
      await typeByPlaceholder(attendee, 'One word', 'excited', {
        submit: true,
      });
    }
    const wordOnAdmin = await waitForText(admin, 'excited', { timeout: 10000 });
    record('poll: submitted word reaches cockpit', Boolean(wordOnAdmin));

    // Submit a word to block.
    await clickByText(attendee, 'button', 'Add another').catch(() => {});
    await waitForField(attendee, 'One word', { timeout: 6000 });
    await typeByPlaceholder(attendee, 'One word', 'badword', { submit: true });
    await waitForText(admin, 'badword', { timeout: 10000 });
    const wordBlocked = await moderateRow(admin, 'badword', '^block$');
    record('poll: blocked a word from cockpit', wordBlocked);
    const pollBlockedCount = await until(
      async () =>
        !(await pageHasText(attendee, 'badword')) &&
        (await pageHasText(attendee, 'blocked')),
      { timeout: 10000 },
    );
    record(
      'poll: blocked word hidden + counted for attendee',
      Boolean(pollBlockedCount),
    );
  });

  // ── Ordered actions + deck-native reveal ──────────────────────────────────
  await guard('activity', async () => {
    step('Ordered actions — open, submit, reveal via presenter deck');
    await typeByPlaceholder(
      admin,
      'Put the steps',
      'Put the E2E steps in order',
    );
    await typeByPlaceholder(
      admin,
      'Answer steps',
      'First do this\nThen do that\nFinally ship it',
    );
    await clickByText(admin, 'button', 'Open activity');
    const activityForm = await waitForField(attendee, 'Step 1', {
      timeout: 12000,
    });
    record('activity: attendee sees the ordering form', Boolean(activityForm));
    if (activityForm) {
      // The form starts with a single step input; add a second before filling.
      await typeByPlaceholder(attendee, 'Step 1', 'Wibble the widget');
      await clickByText(attendee, 'button', 'Add step');
      await waitForField(attendee, 'Step 2', { timeout: 6000 });
      await typeByPlaceholder(attendee, 'Step 2', 'Wobble the gadget');
      await clickByText(attendee, 'button', 'Submit my order');
    }
    const subOnAdmin = await waitForText(admin, 'Wibble the widget', {
      timeout: 10000,
    });
    record('activity: submission reaches cockpit', Boolean(subOnAdmin));

    // Answer must be HIDDEN from the attendee until revealed.
    const hiddenBefore = !(await pageHasText(attendee, 'Finally ship it'));
    record('activity: answer hidden from attendee before reveal', hiddenBefore);

    // Open the presenter deck and press space — deck-native reveal.
    step('Reveal — presenter deck intercepts space to reveal the answer');
    presenter = await newTab(browser, `/talks/${SLUG}/present?mode=presenter`);
    await presenter.bringToFront();
    // Wait for the deck to actually be broadcasting — the reveal keydown-intercept
    // only arms once `current` + the open activity have loaded (on dev the present
    // route + Spectacle chunk also compile on first hit, which can take a while).
    const broadcasting = await until(
      async () =>
        /● presenting/i.test(
          await presenter.evaluate(() =>
            document.body.innerText.replace(/\s+/g, ' '),
          ),
        ),
      { timeout: 25000, interval: 1000 },
    );
    record('activity: presenter deck is broadcasting', Boolean(broadcasting));
    // Early space presses can land before the intercept arms (they just advance
    // a slide), so press-and-check in a loop until the reveal fires.
    let revealedAdmin = false;
    for (let i = 0; i < 6 && !revealedAdmin; i++) {
      await presenter.keyboard.press('Space');
      revealedAdmin = Boolean(
        await waitForText(admin, 'answer revealed', { timeout: 2500 }),
      );
    }
    record(
      'activity: deck space-press revealed the answer',
      Boolean(revealedAdmin),
    );
    const revealedAttendee = await waitForText(attendee, 'Finally ship it', {
      timeout: 10000,
    });
    record(
      'activity: revealed answer now visible to attendee',
      Boolean(revealedAttendee),
    );
  });

  // ── Reactions ─────────────────────────────────────────────────────────────
  await guard('reactions', async () => {
    step('Reactions — attendee reacts, count increments');
    await attendee.bringToFront().catch(() => {});
    const reacted = await attendee.evaluate(() => {
      // Reaction buttons are emoji buttons under the "React:" heading.
      const btns = Array.from(document.querySelectorAll('button')).filter((b) =>
        /\p{Emoji}/u.test(b.innerText || ''),
      );
      if (!btns.length) return false;
      btns[0].click();
      return true;
    });
    record('reactions: attendee clicked a reaction', reacted);
  });

  // ── Clear down ────────────────────────────────────────────────────────────
  step('Clear down — end the session and wipe its data');
  await admin.bringToFront();
  if (await pageHasText(admin, 'End talk')) {
    await clickByText(admin, 'button', 'End talk');
    await until(async () => !(await pageHasText(admin, 'End talk')), {
      timeout: 8000,
    });
  }
  // In the Sessions panel, run the two-step clear-down on the top session.
  const cd1 = await clickByText(admin, 'button', 'Clear down').catch(
    () => false,
  );
  if (cd1) {
    await sleep(400);
    await clickByText(admin, 'button', 'wipe').catch(() =>
      clickByText(admin, 'button', 'Sure').catch(() => {}),
    );
  }
  record('clear-down: ran without error', Boolean(cd1));

  if (presenter) await presenter.close().catch(() => {});
  await attendee.close().catch(() => {});
  await admin.close().catch(() => {});
  browser.disconnect();

  printSummaryAndExit();
}

function printSummaryAndExit() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(
    `\n\x1b[1m${passed}/${results.length} passed${failed ? `, ${failed} failed` : ''}\x1b[0m`,
  );
  if (failed) {
    console.log('\nFailures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('\n\x1b[31mHarness crashed:\x1b[0m', err);
  printSummaryAndExit();
});
