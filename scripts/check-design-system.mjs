/**
 * Drift between this blog and `@rtkelly13/design-system`.
 *
 * ## Why a bespoke check when we already have tsc
 *
 * TypeScript already catches the loud half. If the design system renames an
 * export or changes a prop type, `tsc --noEmit` fails and names the file. That
 * half needs no help.
 *
 * The quiet half is CSS. The contract between these two repos is not only the
 * JS API — it is a set of **design tokens**, consumed as Tailwind utilities
 * (`text-brutalist-cyan`, `shadow-hard-md`) and as raw custom properties
 * (`var(--brutalist-pink)`). If the design system drops or renames one of
 * those, nothing fails. Tailwind simply does not generate the utility, the
 * `var()` falls through to its fallback or to nothing, and the page renders
 * with the wrong colour or no shadow. It looks like a design decision.
 *
 * That is the class of failure this exists for: **a broken token reference is
 * invisible until someone looks at the right page in the right theme.**
 *
 * ## What it checks
 *
 *   1. Every design-system-owned token the blog references is actually defined
 *      by the *installed* version — as a Tailwind utility or as a `var()`.
 *   2. The theme **selectors** the blog switches on still exist in the
 *      stylesheet, so those tokens are reachable at all.
 *   3. How far behind the published `latest` the pinned version is.
 *
 * (2) is here because (1) alone was not enough, and the way it failed is worth
 * recording. Between 0.1.3 and 0.3.0 the design system moved its theme blocks
 * from class selectors (`.dark`, `.dim`, `.sketch`) to attribute selectors
 * (`[data-theme="midnight"]`, …) and renamed the levels. Every token still
 * existed, so a token-existence check passed happily — while `next-themes`
 * drives this blog with `attribute="class"`, meaning none of those blocks would
 * ever match and theme switching would silently stop working. A token you
 * cannot reach is not a token you have.
 *
 * (1) and (2) are hard failures: real breakage against the version we ship.
 * (3) is a report, because a release ten minutes ago should never redden a PR
 * that has nothing to do with it. `--max-lag` turns it into a failure for the
 * scheduled canary, where being behind *is* the thing being measured.
 *
 * ## Ownership
 *
 * Only namespaces the design system owns are checked, listed in `DS_NAMESPACES`.
 * Tailwind's own scale (`text-zinc-400`, `shadow-lg`) is not our business, and
 * treating it as ours would bury the real signal in false positives.
 *
 * A token the blog defines for itself in `css/tailwind.css` counts as defined —
 * the blog is allowed to extend and to override, and several theme blocks do.
 *
 *     pnpm check:ds              # against the installed version
 *     pnpm check:ds --max-lag 0  # and fail if not on latest
 *     pnpm check:ds --json       # machine-readable, for the canary workflow
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PKG = '@rtkelly13/design-system';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const maxLagIdx = args.indexOf('--max-lag');
const maxLag = maxLagIdx === -1 ? null : Number(args[maxLagIdx + 1]);

/**
 * Namespaces the design system owns. A `text-<ns>-*` or `var(--<ns>-*)` outside
 * this list belongs to Tailwind or to the blog, and is not drift.
 */
const DS_NAMESPACES = [
  'brutalist',
  'surface',
  'content',
  'edge',
  'intent',
  'accent',
  'hard',
  'glow',
];

/** Utility prefixes that resolve a `--color-*` token. */
const COLOR_UTILITIES = [
  'text',
  'bg',
  'border',
  'ring',
  'fill',
  'stroke',
  'from',
  'via',
  'to',
  'outline',
  'decoration',
  'divide',
  'placeholder',
  'caret',
  'accent',
  'shadow',
];

/** Source trees whose class names and `var()` calls reach the browser. */
const SOURCE_DIRS = ['components', 'pages', 'layouts', 'lib', 'css', 'data'];
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.mdx']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

/** Every `--name` declared in a stylesheet, without values. */
function declaredTokens(css) {
  const set = new Set();
  for (const [, name] of css.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm))
    set.add(name);
  return set;
}

// ---------------------------------------------------------------------------
// The installed design system
// ---------------------------------------------------------------------------

const dsDir = path.join(ROOT, 'node_modules', PKG);
if (!existsSync(dsDir)) {
  console.error(`${PKG} is not installed. Run \`pnpm install\` first.`);
  process.exit(1);
}

const dsPkg = JSON.parse(
  readFileSync(path.join(dsDir, 'package.json'), 'utf8'),
);
const themePath = path.join(dsDir, 'dist', 'theme.css');
if (!existsSync(themePath)) {
  console.error(
    `${PKG}@${dsPkg.version} ships no dist/theme.css — the token contract is gone, not merely changed.`,
  );
  process.exit(1);
}

const dsTokens = declaredTokens(readFileSync(themePath, 'utf8'));

// The blog may define or override tokens of its own; those count as defined.
const localCss = path.join(ROOT, 'css', 'tailwind.css');
const localTokens = existsSync(localCss)
  ? declaredTokens(readFileSync(localCss, 'utf8'))
  : new Set();

const defined = new Set([...dsTokens, ...localTokens]);

// ---------------------------------------------------------------------------
// What the blog actually references
// ---------------------------------------------------------------------------

const nsAlternation = DS_NAMESPACES.join('|');
const utilityRe = new RegExp(
  `\\b(?:${COLOR_UTILITIES.join('|')})-((?:${nsAlternation})-[a-zA-Z0-9-]+)`,
  'g',
);
const varRe = new RegExp(
  `var\\(\\s*(--(?:${nsAlternation})-[a-zA-Z0-9-]+)`,
  'g',
);

/**
 * Keyed by token, collecting *every* file. An earlier version deduplicated by
 * token and reported the first file it saw, which quietly hid the other sites —
 * fixing the named one made the next one appear as if it were new. A token used
 * in five places is five broken places.
 */
const found = new Map();

for (const dir of SOURCE_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const src = readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);

    // Utilities: `shadow-hard-md` resolves `--shadow-hard-md`, and a colour
    // utility resolves `--color-<name>`. Try both spellings before complaining,
    // because `shadow-` is in both lists.
    for (const [, token] of src.matchAll(utilityRe)) {
      const key = `util:${token}`;
      if (!found.has(key))
        found.set(key, {
          kind: 'utility',
          token,
          files: new Set(),
          ok:
            defined.has(`--color-${token}`) || defined.has(`--shadow-${token}`),
          detail: `no --color-${token} or --shadow-${token} in ${PKG}@${dsPkg.version}`,
        });
      found.get(key).files.add(rel);
    }

    // Raw custom properties. A fallback does not excuse it: the fallback is a
    // frozen copy of a value the design system is supposed to own, so a missing
    // token means the blog has quietly stopped following the theme.
    for (const [, token] of src.matchAll(varRe)) {
      const key = `var:${token}`;
      if (!found.has(key))
        found.set(key, {
          kind: 'var',
          token,
          files: new Set(),
          ok: defined.has(token),
          detail: `var(${token}) is not declared by ${PKG}@${dsPkg.version} or by css/tailwind.css`,
        });
      found.get(key).files.add(rel);
    }
  }
}

// ---------------------------------------------------------------------------
// Theme selectors
// ---------------------------------------------------------------------------

/**
 * The themes `next-themes` is configured with in `pages/_app.tsx`, and the
 * attribute it uses to apply them. Read from the source rather than duplicated,
 * so switching the app to `attribute="data-theme"` changes what is checked here
 * without anyone having to remember this file exists.
 */
function themeContract() {
  const appPath = path.join(ROOT, 'pages', '_app.tsx');
  if (!existsSync(appPath)) return null;
  const src = readFileSync(appPath, 'utf8');
  // `attribute` takes a string OR an array — next-themes 0.4 accepts
  // `attribute={['class', 'data-theme']}`, which is what this app uses so that
  // the design system's `[data-theme]` blocks match *and* this repo's own
  // `.midnight` / `.sketch` rules keep working.
  //
  // Reading only the string form was this checker's own blind spot: it reported
  // the class-only fault correctly, then went on reporting it after the fix,
  // because an array is not a quoted scalar. A gate that cannot see the
  // remedy it asks for is a gate nobody can satisfy.
  const attrs = (() => {
    const arr = src.match(/attribute=\{\[([^\]]+)\]\}/)?.[1];
    if (arr) return [...arr.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const one = src.match(/attribute=["']([^"']+)["']/)?.[1];
    return one ? [one] : [];
  })();
  const attr = attrs[0];
  const list = src.match(/themes=\{\[([^\]]+)\]\}/)?.[1];
  if (!attr || !list) return null;
  const themes = [...list.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return { attr, attrs, themes };
}

const contract = themeContract();
const themeProblems = [];

if (contract) {
  const themeCss = readFileSync(themePath, 'utf8');

  // Which mechanism does the design system itself use for its theme blocks?
  // Ask the stylesheet rather than assuming, because this is precisely the
  // thing that changed underneath us once already.
  const dsUsesClasses = /^\s*[^{@\n]*\.(dark|dim|sketch|light)\b[^{]*\{/m.test(
    themeCss,
  );
  const dsAttr = themeCss.match(/\[\s*(data-[a-z-]+)\s*=/)?.[1] ?? null;
  // Both mechanisms may be in play at once, and that is the correct
  // configuration here rather than a hedge.
  const blogUsesClasses = contract.attrs.includes('class');
  const blogUsesDsAttr = dsAttr !== null && contract.attrs.includes(dsAttr);

  if (blogUsesClasses && !blogUsesDsAttr && !dsUsesClasses && dsAttr) {
    themeProblems.push(
      `the design system selects themes with [${dsAttr}="…"], but this blog applies them with attribute="class" — none of its theme blocks can match, so every level falls back to :root`,
    );
  } else if (!blogUsesClasses && !blogUsesDsAttr && dsUsesClasses) {
    themeProblems.push(
      `the design system selects themes with classes, but this blog applies them with attribute="${contract.attr}" — none of its theme blocks can match`,
    );
  } else {
    // Same mechanism: check the level *names* line up. A renamed level is the
    // quieter version of the same failure — the block exists, just not for a
    // level this blog ever sets.
    for (const theme of contract.themes) {
      const selector = blogUsesClasses
        ? new RegExp(`\\.${theme}\\b`)
        : new RegExp(
            `\\[\\s*${contract.attr}\\s*=\\s*["']?${theme}["']?\\s*\\]`,
          );
      if (selector.test(themeCss)) continue;
      // The blog is allowed to own a level outright — `sketch` largely is —
      // but say so, because it means the design system is not theming it.
      const local =
        existsSync(localCss) && selector.test(readFileSync(localCss, 'utf8'));
      if (!local)
        themeProblems.push(
          `no block for "${theme}" in the design system or in css/tailwind.css — that level has no tokens at all`,
        );
    }
  }
}

// ---------------------------------------------------------------------------
// Version lag
// ---------------------------------------------------------------------------

async function publishedVersions() {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/${PKG.replace('/', '%2F')}`,
    );
    if (!res.ok) return null;
    const body = await res.json();
    return {
      latest: body['dist-tags']?.latest,
      all: Object.keys(body.versions ?? {}),
    };
  } catch {
    return null; // Offline is not a drift failure.
  }
}

const published = await publishedVersions();
let lag = null;
if (published?.latest) {
  const idx = published.all.indexOf(dsPkg.version);
  const latestIdx = published.all.indexOf(published.latest);
  if (idx !== -1 && latestIdx !== -1) lag = latestIdx - idx;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const problems = [...found.values()]
  .filter((p) => !p.ok)
  .map((p) => ({ ...p, files: [...p.files].sort() }));

const report = {
  installed: dsPkg.version,
  latest: published?.latest ?? null,
  releasesBehind: lag,
  tokensDefined: dsTokens.size,
  referencesChecked: found.size,
  themeAttribute: contract?.attr ?? null,
  themes: contract?.themes ?? [],
  themeProblems,
  problems,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`${PKG}`);
  console.log(`  installed  ${report.installed}`);
  console.log(
    `  latest     ${report.latest ?? '(registry unreachable)'}${
      lag ? `  — ${lag} release${lag === 1 ? '' : 's'} behind` : ''
    }`,
  );
  console.log(
    `  tokens     ${report.tokensDefined} declared, ${report.referencesChecked} references checked`,
  );
  if (contract) {
    console.log(
      `  themes     ${contract.themes.join(', ')} via attribute=${contract.attrs.map((a) => `"${a}"`).join(' + ')}`,
    );
  }
  if (themeProblems.length > 0) {
    console.log(`\n${themeProblems.length} theme contract problem(s):`);
    for (const t of themeProblems) console.log(`  ✖ ${t}`);
    console.log(
      '\nEvery token can still exist and none of them apply: a selector that never\nmatches takes the whole theme with it.',
    );
  }
  if (problems.length === 0 && themeProblems.length === 0) {
    console.log('\nNo token drift.');
  } else if (problems.length > 0) {
    console.log(`\n${problems.length} broken token reference(s):`);
    for (const p of problems) {
      console.log(`  ✖ ${p.detail}`);
      for (const f of p.files) console.log(`      ${f}`);
    }
    console.log(
      '\nThese fail silently in the browser — no build error, just the wrong colour.',
    );
  }
}

if (problems.length > 0 || themeProblems.length > 0) process.exit(1);
if (maxLag !== null && lag !== null && lag > maxLag) {
  console.error(
    `\n${lag} releases behind ${report.latest}, limit is ${maxLag}.`,
  );
  process.exit(1);
}
