// Multi-tab live-talk E2E for the audience-participation features.
//
// Drives THREE parallel deck tabs — presenter, console, attendee — plus an admin
// tab, against the hidden `e2e-debug-deck` (which wires up every component), and
// exercises: follow-the-presenter, live poll/word-cloud, live Q&A + moderation,
// ordered-actions + the deck-native reveal, and the console-always-answer split.
// Cleans up afterwards (clear down the session + end the talk).
//
// Auth: attaches over CDP to the already-signed-in dedicated dev Chrome profile
// (see AGENTS.md "Browser control"), so no GitHub OAuth dance is needed here.
//
//   node tests/live-e2e.mjs          (pnpm test:live-e2e)
//
// Prereqs: dev server on :3002, Convex dev deployment up, and the dev profile
// signed in (agent-browser --profile ~/.agent-browser-profiles/dev, once).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3002';
const SLUG = 'e2e-debug-deck';
const PROFILE =
  process.env.E2E_PROFILE ??
  path.join(os.homedir(), '.agent-browser-profiles', 'dev');

const results = [];
const pass = (name) => {
  results.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
};
const fail = (name, detail) => {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};

function cdpEndpoint() {
  const file = path.join(PROFILE, 'DevToolsActivePort');
  if (!fs.existsSync(file)) {
    throw new Error(
      `No ${file}. Launch the dev profile first:\n` +
        `  agent-browser --profile ${PROFILE} --headed open ${BASE}/admin`,
    );
  }
  const port = fs.readFileSync(file, 'utf8').split('\n')[0].trim();
  return `http://127.0.0.1:${port}`;
}

const text = (page) => page.evaluate(() => document.body.innerText);
const counter = async (page) =>
  (await text(page)).match(/\d+ \/ \d+/)?.[0] ?? '';

// Compare case-insensitively — CSS `text-transform: uppercase` makes innerText
// come back uppercased, so an exact-case check can spuriously miss.
async function expectText(page, needle, label, timeout = 12000) {
  try {
    await page.waitForFunction(
      (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      needle,
      { timeout },
    );
    pass(label);
    return true;
  } catch {
    fail(label, `never saw "${needle}"`);
    return false;
  }
}

async function expectMissing(page, needle, label) {
  const has = (await text(page)).toLowerCase().includes(needle.toLowerCase());
  has ? fail(label, `unexpectedly saw "${needle}"`) : pass(label);
}

/** Advance the presenter deck one slide and wait for the attendee to follow. */
async function advanceAndFollow(presenter, attendee) {
  const before = await counter(attendee);
  await presenter.bringToFront();
  await presenter.keyboard.press('ArrowRight');
  await attendee
    .waitForFunction(
      (b) => {
        const now = document.body.innerText.match(/\d+ \/ \d+/)?.[0];
        return now && now !== b;
      },
      before,
      { timeout: 12000 },
    )
    .catch(() => {});
}

async function main() {
  const endpoint = cdpEndpoint();
  console.log(`→ attaching over CDP: ${endpoint}`);
  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  if (!context) throw new Error('no browser context found over CDP');

  const admin = await context.newPage();
  const presenter = await context.newPage();
  const consolePage = await context.newPage();
  const attendee = await context.newPage();
  const opened = [admin, presenter, consolePage, attendee];

  try {
    // ---- Admin: start the test talk -------------------------------------
    console.log('\n[1] Admin — start the test talk');
    await admin.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await admin
      .getByText('Signed in as', { exact: false })
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    // Clean slate: end any live talk first.
    const end = admin.getByRole('button', { name: 'End talk' });
    if (await end.count()) {
      await end.first().click();
      await admin.getByPlaceholder('talk slug').waitFor({ timeout: 10000 });
    }
    await admin.getByPlaceholder('talk slug').fill(SLUG);
    await admin.getByPlaceholder('talk title').fill('E2E Debug Deck');
    for (const label of ['Follow-the-presenter', 'Emoji reactions']) {
      const cb = admin.getByLabel(label);
      if ((await cb.count()) && !(await cb.isChecked())) await cb.check();
    }
    await admin.getByRole('button', { name: 'Start talk' }).click();
    await expectText(admin, 'A talk is running', 'admin: talk started');

    // ---- Open the three deck tabs ---------------------------------------
    console.log('\n[2] Open presenter / console / attendee decks');
    const present = (mode) => `${BASE}/talks/${SLUG}/present?mode=${mode}`;
    await presenter.goto(present('presenter'), {
      waitUntil: 'domcontentloaded',
    });
    await consolePage.goto(present('console'), {
      waitUntil: 'domcontentloaded',
    });
    await attendee.goto(present('attendee'), {
      waitUntil: 'domcontentloaded',
    });
    await Promise.all(
      opened.map((p) =>
        p
          .waitForFunction(() => /\d+ \/ \d+/.test(document.body.innerText), {
            timeout: 15000,
          })
          .catch(() => {}),
      ),
    );
    await expectText(consolePage, 'CONSOLE', 'console: sidebar present');

    // ---- Follow-the-presenter -------------------------------------------
    console.log('\n[3] Follow-the-presenter → slide 2 (Q&A)');
    await advanceAndFollow(presenter, attendee); // → slide 2
    const pc = await counter(presenter);
    const ac = await counter(attendee);
    pc && pc === ac
      ? pass(`follow: attendee matches presenter (${pc})`)
      : fail('follow', `presenter ${pc} vs attendee ${ac}`);

    // ---- Live Q&A + moderation ------------------------------------------
    console.log('\n[4] Live Q&A + moderation');
    const QTEXT = `E2E question ${Date.now() % 100000}`;
    await attendee.getByPlaceholder('Type your question…').fill(QTEXT);
    await attendee.getByRole('button', { name: 'Ask', exact: true }).click();
    await expectText(attendee, QTEXT, 'attendee: question appears in queue');
    await expectText(consolePage, QTEXT, 'console: sees the question');
    // Reject it from /admin → attendee should see only a blocked count.
    await admin.bringToFront();
    const reject = admin.getByRole('button', { name: 'reject', exact: true });
    await reject
      .first()
      .click({ timeout: 10000 })
      .catch(() => {});
    await expectText(attendee, 'blocked', 'attendee: rejected → blocked count');
    await expectMissing(attendee, QTEXT, 'attendee: rejected content hidden');

    // ---- Live poll / word cloud -----------------------------------------
    console.log('\n[5] Live poll / word cloud');
    await advanceAndFollow(presenter, attendee); // → slide 3
    // Start the poll from the presenter deck's slide-declared launch button
    // (presenter is the driving surface, so it's on this slide).
    await presenter.bringToFront();
    await presenter
      .getByRole('button', { name: '▶ Start poll' })
      .click({ timeout: 10000 });
    await attendee.getByPlaceholder('One word…').waitFor({ timeout: 10000 });
    for (const w of ['excited', 'nervous', 'excited']) {
      await attendee.getByPlaceholder('One word…').fill(w);
      await attendee.getByRole('button', { name: /Send|Add another/ }).click();
      await attendee.waitForTimeout(600);
    }
    await expectText(
      presenter,
      'EXCITED',
      'presenter: word cloud shows EXCITED',
    );
    await expectText(attendee, '3 answers', 'attendee: 3 answers tallied');

    // ---- Ordered-actions + deck-native reveal ---------------------------
    console.log('\n[6] Ordered-actions + deck-native reveal');
    await advanceAndFollow(presenter, attendee); // presenter → slide 4

    // Drive the CONSOLE (its own broadcasting surface) to slide 4 too, BEFORE the
    // activity opens — while no activity is open the deck-native reveal intercept
    // is disarmed, so plain ArrowRight navigates rather than revealing.
    await consolePage.bringToFront();
    for (let i = 0; i < 3; i++) {
      await consolePage.keyboard.press('ArrowRight');
      await consolePage.waitForTimeout(400);
    }
    const consoleAt = await counter(consolePage);
    consoleAt === '4 / 4'
      ? pass('console: driven to activity slide (4 / 4)')
      : fail('console nav', `console at ${consoleAt}, expected 4 / 4`);

    // Open the activity from the presenter deck's slide-declared launch button.
    await presenter.bringToFront();
    await presenter
      .getByRole('button', { name: '▶ Open activity' })
      .click({ timeout: 10000 });
    // Attendee submits an ordered list.
    // Neutral step text so it can't collide with the answer words (First/…/Third).
    await attendee.getByPlaceholder('Step 1…').waitFor({ timeout: 10000 });
    await attendee.getByPlaceholder('Step 1…').fill('Wibble the widget');
    await attendee.getByRole('button', { name: '+ Add step' }).click();
    await attendee.getByPlaceholder('Step 2…').fill('Wobble the gadget');
    await attendee.getByRole('button', { name: 'Submit my order' }).click();
    await expectText(
      attendee,
      'Wibble the widget',
      'attendee: submission on wall',
    );
    // Answer hidden from the room until reveal ('Third' only appears in the answer).
    await expectMissing(
      presenter,
      'Third',
      'presenter: answer hidden pre-reveal',
    );
    // Console shows the answer + room-reveal countdown ALWAYS (before reveal).
    await expectText(
      consolePage,
      'Third',
      'console: answer shown before reveal',
    );
    await expectText(
      consolePage,
      'room sees it in',
      'console: shows room-reveal countdown',
    );
    // Deck-native reveal: → reveals (counter unchanged), then answer appears.
    const beforeReveal = await counter(presenter);
    await presenter.bringToFront();
    await presenter.keyboard.press('ArrowRight');
    await presenter.waitForTimeout(1500);
    const afterReveal = await counter(presenter);
    beforeReveal === afterReveal
      ? pass(`reveal: next consumed, slide unchanged (${afterReveal})`)
      : fail('reveal', `slide advanced ${beforeReveal} → ${afterReveal}`);
    await expectText(presenter, 'Third', 'presenter: answer revealed to room');
    await expectText(attendee, 'Third', 'attendee: sees revealed answer');
  } finally {
    // ---- Cleanup: clear down the session + end the talk -----------------
    console.log('\n[7] Cleanup — clear down + end talk');
    try {
      await admin.bringToFront();
      await admin.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
      const clear = admin.getByRole('button', { name: 'Clear down' });
      if (await clear.count()) {
        await clear.first().click();
        await admin
          .getByRole('button', { name: 'Yes, wipe' })
          .first()
          .click({ timeout: 8000 })
          .catch(() => {});
        await admin.waitForTimeout(1000);
        pass('cleanup: session cleared down');
      }
      const end = admin.getByRole('button', { name: 'End talk' });
      if (await end.count()) {
        await end.first().click();
        pass('cleanup: talk ended');
      }
    } catch (e) {
      fail('cleanup', String(e).slice(0, 120));
    }
    await Promise.all(opened.map((p) => p.close().catch(() => {})));
    await browser.close().catch(() => {});
  }

  // ---- Summary ----------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${'='.repeat(48)}\n${results.length - failed.length}/${results.length} checks passed`,
  );
  if (failed.length) {
    console.log('FAILED:');
    for (const f of failed)
      console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    process.exit(1);
  }
  console.log('ALL GREEN ✅');
}

main().catch((e) => {
  console.error('\nE2E crashed:', e);
  process.exit(1);
});
