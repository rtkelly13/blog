#!/usr/bin/env node
/**
 * Push provisioning secrets from the gitignored secrets/ files to their
 * targets. One file per target so dev values can't reach prod by accident;
 * see secrets/README.md and docs/auth.md §9.
 *
 *   pnpm provision convex-dev      → npx convex env set --from-file
 *   pnpm provision convex-prod     → …--prod (refuses bypass/e2e keys)
 *   pnpm provision ci              → gh secret set (per key)
 *   pnpm provision vercel-preview  → vercel env add <name> preview
 *   pnpm provision convex-preview  → prints values (dashboard-only:
 *                                    project default env vars have no CLI)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
const dir = path.join(process.cwd(), 'secrets');

function parse(file) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) fail(`missing ${p} — see secrets/README.md`);
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
    .filter(([, v]) => v !== '');
}

function fail(msg) {
  console.error(`provision: ${msg}`);
  process.exit(1);
}

function run(cmd, args, input) {
  execFileSync(cmd, args, { stdio: input ? ['pipe', 1, 2] : 'inherit', input });
}

const targets = {
  'convex-dev': () => {
    run('npx', ['convex', 'env', 'set', '--from-file', 'secrets/convex.dev.env']);
  },
  'convex-prod': () => {
    // Structural guard on top of the hard-coded one in convex/auth.ts: the
    // bypass must never even be *pushed* at prod.
    const banned = parse('convex.prod.env').filter(([k]) =>
      /E2E|BYPASS/i.test(k),
    );
    if (banned.length) {
      fail(`convex.prod.env contains ${banned.map(([k]) => k).join(', ')} — remove before provisioning prod`);
    }
    run('npx', ['convex', 'env', 'set', '--prod', '--from-file', 'secrets/convex.prod.env']);
  },
  ci: () => {
    for (const [k, v] of parse('ci.env')) {
      run('gh', ['secret', 'set', k], v);
      console.log(`set repo secret ${k}`);
    }
  },
  'vercel-preview': () => {
    for (const [k, v] of parse('vercel.preview.env')) {
      // Re-adding an existing var fails; remove first (ignore absence).
      try {
        run('vercel', ['env', 'rm', k, 'preview', '--yes']);
      } catch {}
      run('vercel', ['env', 'add', k, 'preview'], v);
      console.log(`set vercel preview env ${k}`);
    }
  },
  'convex-preview': () => {
    console.log(
      'Project default env vars have no CLI — enter these in the Convex dashboard',
    );
    console.log('(project settings → Default environment variables → Preview):\n');
    for (const [k, v] of parse('convex.preview.env')) console.log(`${k}=${v}`);
  },
};

if (!target || !targets[target]) {
  fail(`usage: pnpm provision <${Object.keys(targets).join('|')}>`);
}
targets[target]();
