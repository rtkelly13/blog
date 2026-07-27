#!/usr/bin/env node
// Lockfile protocol guard.
//
// Fails if pnpm-lock.yaml pins any dependency to a git/SSH resolution
// (`git@github.com:…`, `git+ssh://…`, `type: git`, …). Those clone over a
// protocol that needs an SSH key the build environments don't have — Vercel
// reports `Host key verification failed`, GitHub Actions `Permission denied
// (publickey)` — so they turn every cold `pnpm install` into a hard failure.
//
// This is exactly the regression that broke `main` (PR #79): the
// `@rtkelly/mermaid-toolkit` dependency's `github:` shorthand re-resolved from a
// public `codeload.github.com` tarball to a `git+https://git@github.com:…` SSH
// clone. PR checks missed it because the runner's warm pnpm store satisfied
// `--frozen-lockfile` from cache without cloning; only cold Vercel builds fired
// the clone. This guard reads the lockfile text directly, so a warm cache can't
// hide the bad resolution.
//
// Fix: pin such deps to their public HTTPS tarball, e.g.
//   "https://codeload.github.com/<owner>/<repo>/tar.gz/<full-sha>"
// which resolves deterministically over HTTPS and can never flip to SSH.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCKFILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'pnpm-lock.yaml',
);

// Each pattern targets a resolution form that requires unavailable git/SSH auth.
const FORBIDDEN = [
  { re: /git@[\w.-]+:/, label: 'SSH clone URL (git@host:…)' },
  { re: /git\+ssh:\/\//, label: 'git+ssh:// resolution' },
  {
    re: /git\+https:\/\/git@/,
    label: 'git+https with SSH user (git+https://git@…)',
  },
  { re: /^\s*repo:\s*git@/, label: 'git repo over SSH (repo: git@…)' },
  { re: /^\s*type:\s*git\b/, label: 'git-type resolution (type: git)' },
  // `file:../…` deps resolve to a sibling checkout that only exists on a dev
  // machine — Vercel clones the blog alone, so cold installs die with ENOENT
  // (this took every deploy down on 2026-07-27). Consume sibling packages from
  // GitHub Packages instead; use `pnpm ds:link` for local development.
  {
    re: /file:\.\.\//,
    label: 'out-of-repo file: dependency (file:../…)',
  },
  {
    re: /^\s*resolution:\s*\{directory:\s*\.\./,
    label: 'out-of-repo directory resolution',
  },
];

let text;
try {
  text = readFileSync(LOCKFILE, 'utf8');
} catch (err) {
  console.error(`✖ Could not read ${LOCKFILE}: ${err.message}`);
  process.exit(2);
}

const violations = [];
text.split('\n').forEach((line, i) => {
  for (const { re, label } of FORBIDDEN) {
    if (re.test(line)) {
      violations.push({ line: i + 1, label, text: line.trim() });
      break;
    }
  }
});

if (violations.length === 0) {
  console.log(
    '✓ Lockfile protocol guard: no git/SSH dependency resolutions found.',
  );
  process.exit(0);
}

console.error('✖ Lockfile protocol guard failed.\n');
console.error(
  'pnpm-lock.yaml pins dependencies to git/SSH resolutions that cold build\n' +
    'environments (Vercel, CI) cannot authenticate. Re-pin them to a public\n' +
    'HTTPS tarball, e.g. https://codeload.github.com/<owner>/<repo>/tar.gz/<sha>,\n' +
    'then run `pnpm install` to regenerate the lockfile.\n',
);
for (const v of violations) {
  console.error(`  pnpm-lock.yaml:${v.line}  [${v.label}]`);
  console.error(`    ${v.text}`);
}
process.exit(1);
