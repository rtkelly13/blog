/**
 * Try a design-system version against this blog, then put everything back.
 *
 *     pnpm ds:try 0.4.0
 *     pnpm ds:try dev          # the dist-tag /publish-dev writes to
 *     pnpm ds:try 0.4.0-dev.108.a1b2c3d
 *
 * ## Why this exists as a command rather than a habit
 *
 * The two repos are developed in parallel, so the interesting question is never
 * "does the blog work" — it is "does the blog still work against what the design
 * system is *about* to release". Nothing answers that by accident: the PR gate
 * only ever sees the pinned version, which is precisely the version that is not
 * changing.
 *
 * Answering it by hand means editing `package.json`, installing, running four
 * commands, reading four outputs, and then remembering to undo all of it. The
 * last step is the one that gets skipped, and a half-reverted dependency is a
 * worse state than never having tried.
 *
 * So: install, run the gates, restore — including on failure, including on
 * Ctrl-C. What it prints is the same shape the scheduled canary reports, so a
 * local answer and a CI answer are comparable.
 *
 * ## What it runs, and why those four
 *
 *   check:ds    the token and theme-selector contract  (see check-design-system)
 *   typecheck   renamed exports, changed prop types
 *   test:unit   behaviour of the components re-exported here
 *   build       the Tailwind/CSS contract actually compiling
 *
 * The order is cheapest-first, but every one runs regardless: knowing that three
 * of four break is more useful than stopping at the first.
 *
 * `build` is last and slowest, and it is the one that has caught the most —
 * a stylesheet contract can be wrong in ways nothing else notices.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PKG = '@rtkelly13/design-system';

const target = process.argv[2];
if (!target) {
  console.error('Usage: pnpm ds:try <version|dist-tag>');
  console.error('  e.g. pnpm ds:try 0.4.0   ·   pnpm ds:try dev');
  process.exit(2);
}

const MANIFEST = path.join(ROOT, 'package.json');
const LOCKFILE = path.join(ROOT, 'pnpm-lock.yaml');
const BACKUPS = [
  [MANIFEST, `${MANIFEST}.ds-try-backup`],
  [LOCKFILE, `${LOCKFILE}.ds-try-backup`],
];

/**
 * Read the version off disk rather than through module resolution.
 *
 * `require('<pkg>/package.json')` throws ERR_PACKAGE_PATH_NOT_EXPORTED against
 * any version whose `exports` map does not list `./package.json` — which 0.3.0
 * does not. A version check that only works on some versions is not much of a
 * version check.
 */
function installed() {
  const manifest = path.join(ROOT, 'node_modules', PKG, 'package.json');
  if (!existsSync(manifest)) return '(not installed)';
  try {
    return JSON.parse(readFileSync(manifest, 'utf8')).version;
  } catch {
    return '(unreadable)';
  }
}

function restore() {
  for (const [file, backup] of BACKUPS) {
    if (!existsSync(backup)) continue;
    copyFileSync(backup, file);
    unlinkSync(backup);
  }
  spawnSync('pnpm', ['install', '--frozen-lockfile'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
}

// Restore on every exit path, including a signal. A dependency left swapped is
// worse than never having tried, because the next thing that fails will look
// like it failed for its own reasons.
let restored = false;
const restoreOnce = () => {
  if (restored) return;
  restored = true;
  console.log(`\nRestoring ${PKG}…`);
  restore();
  console.log(`Back on ${installed()}.`);
};
process.on('exit', restoreOnce);
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    restoreOnce();
    process.exit(130);
  });
}

const before = installed();
console.log(`${PKG}: ${before} -> ${target}\n`);

for (const [file, backup] of BACKUPS) {
  if (existsSync(file)) copyFileSync(file, backup);
}

const add = spawnSync('pnpm', ['add', `${PKG}@${target}`], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (add.status !== 0) {
  console.error(`\nCould not install ${PKG}@${target}.`);
  process.exit(1);
}

const after = installed();
console.log(`\nResolved to ${after}. Running the gates.\n`);

const GATES = [
  ['check:ds', 'token and theme contract'],
  ['typecheck', 'types'],
  ['test:unit', 'unit tests'],
  ['build', 'build'],
];

const results = [];
for (const [script, label] of GATES) {
  process.stdout.write(`  ${label.padEnd(26)}`);
  const r = spawnSync('pnpm', ['run', script], { cwd: ROOT, stdio: 'pipe' });
  const ok = r.status === 0;
  results.push({ script, label, ok, output: r.stdout?.toString() ?? '' });
  console.log(ok ? 'ok' : 'FAILED');
}

console.log(`\n${'-'.repeat(60)}`);
const broken = results.filter((r) => !r.ok);
if (broken.length === 0) {
  console.log(`${PKG}@${after} is a safe upgrade.`);
  console.log(`  pnpm add ${PKG}@${after}`);
} else {
  console.log(`${PKG}@${after} breaks ${broken.length} of ${GATES.length}:`);
  for (const b of broken) console.log(`  ✖ ${b.label} — pnpm ${b.script}`);
  // `check:ds` explains itself in one screen; the rest need their own output.
  const ds = broken.find((b) => b.script === 'check:ds');
  if (ds?.output) {
    console.log('');
    for (const line of ds.output.trimEnd().split('\n'))
      console.log(`  ${line}`);
  }
}
console.log('-'.repeat(60));

process.exitCode = broken.length === 0 ? 0 : 1;
