#!/usr/bin/env node
/**
 * Submit every external link referenced by blog posts and talks to the
 * Wayback Machine (Save Page Now), so the "archived" links in each page's
 * References section actually resolve to a snapshot.
 *
 * Usage:
 *   pnpm archive-links            # archive URLs with no existing snapshot
 *   pnpm archive-links --force    # re-archive everything (fresh snapshots)
 *   pnpm archive-links --dry-run  # just list what would be submitted
 *
 * Run it after publishing a post with new links. Save Page Now is
 * rate-limited, so submissions are sequential with a polite delay; a failed
 * save is reported but never fails the run (archiving is best-effort).
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const root = process.cwd();
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const SAVE_DELAY_MS = 5000;

/** Matches the URL of markdown links, GFM autolinks, and bare URLs. */
const URL_PATTERN = /https?:\/\/[^\s)\]<>"'`]+/g;

function collectContentFiles() {
  const files = [];
  for (const dir of ['data/blog', 'data/talks']) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(mdx|md)$/.test(entry.name)) files.push(p);
      }
    };
    walk(abs);
  }
  return files;
}

function extractUrls(source) {
  // Strip fenced code blocks and inline code spans — sample code (and
  // placeholder URLs inside it) shouldn't be archived.
  const withoutCode = source
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, '')
    .replace(/`[^`\n]*`/g, '');
  const urls = new Set();
  for (const match of withoutCode.matchAll(URL_PATTERN)) {
    // Trim trailing punctuation that the regex can swallow from prose.
    const url = match[0].replace(/[.,;:!?]+$/, '');
    if (url.includes('web.archive.org')) continue;
    try {
      new URL(url);
      urls.add(url);
    } catch {
      // not a real URL — skip
    }
  }
  return urls;
}

async function hasSnapshot(url) {
  const res = await fetch(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
  );
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data?.archived_snapshots?.closest?.available);
}

async function save(url) {
  // Save Page Now: a GET on /save/<url> triggers a crawl.
  const res = await fetch(`https://web.archive.org/save/${url}`, {
    redirect: 'follow',
  });
  return res.ok;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const urls = new Set();
for (const file of collectContentFiles()) {
  const { content } = matter(fs.readFileSync(file, 'utf8'));
  for (const url of extractUrls(content)) urls.add(url);
}

console.log(
  `Found ${urls.size} unique external URLs in data/blog + data/talks`,
);

let saved = 0;
let skipped = 0;
let failed = 0;

for (const url of urls) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${url}`);
    continue;
  }
  try {
    if (!FORCE && (await hasSnapshot(url))) {
      skipped++;
      console.log(`✓ already archived  ${url}`);
      continue;
    }
    process.stdout.write(`→ saving            ${url} … `);
    if (await save(url)) {
      saved++;
      console.log('ok');
    } else {
      failed++;
      console.log('failed');
    }
    await sleep(SAVE_DELAY_MS);
  } catch (err) {
    failed++;
    console.log(`✗ error             ${url} (${err.message})`);
  }
}

if (!DRY_RUN) {
  console.log(
    `\nDone: ${saved} saved, ${skipped} already archived, ${failed} failed`,
  );
  if (failed > 0) {
    console.log('Failures are best-effort — re-run later to retry.');
  }
}
