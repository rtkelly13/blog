import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import { isNoIndexRoute } from '../lib/seo/routePolicy.mjs';

const require = createRequire(import.meta.url);
const siteMetadata = require('../data/siteMetadata.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

/** Pages allowed to render no SEO component (see `auditPages`). */
const NO_SEO_REQUIRED = new Set([
  'pages/_app.tsx',
  'pages/_document.tsx',
  'pages/404.tsx',
  // Emits its own `noindex` — a fullscreen deck with no metadata to offer.
  'pages/talks/[slug]/present.tsx',
  // Client-side redirect to /admin; emits its own `noindex`.
  'pages/live/manage.tsx',
  // Renders `AuthorLayout` through MDXLayoutRenderer, and the layout carries
  // the PageSEO — the check below only reads the page file itself.
  'pages/about.tsx',
]);

/**
 * Site-wide SEO configuration.
 *
 * The per-post frontmatter audit below can't see any of this, which is how a
 * starter-template description survived on the live site for years.
 */
function auditSiteMetadata() {
  const issues = [];

  const placeholders = [
    'A blog created with Next.js and Tailwind.css',
    'tailwind-nextjs-starter-blog',
  ];
  if (placeholders.some((p) => siteMetadata.description.includes(p))) {
    issues.push(
      'siteMetadata.description is still starter-template boilerplate — it is the homepage meta description, og:description and RSS channel description',
    );
  }
  if (siteMetadata.description.length < 50) {
    issues.push(
      `siteMetadata.description is ${siteMetadata.description.length} chars — too short to be a useful search snippet`,
    );
  }
  if (siteMetadata.siteUrl.endsWith('/')) {
    issues.push(
      'siteMetadata.siteUrl has a trailing slash — it is concatenated with absolute paths, producing "//" in canonical, og:url and og:image',
    );
  }
  if (siteMetadata.xHandle && !siteMetadata.xHandle.startsWith('@')) {
    issues.push('siteMetadata.xHandle must be an @handle for twitter:site');
  }

  // Social images are referenced as absolute site paths; a missing file means a
  // broken preview card everywhere the URL is unfurled.
  for (const key of ['socialBanner', 'siteLogo', 'image']) {
    const value = siteMetadata[key];
    if (!value) continue;
    if (!fs.existsSync(path.join(root, 'public', value.replace(/^\//, '')))) {
      issues.push(`siteMetadata.${key} points at a missing file: ${value}`);
    }
  }

  if (!fs.existsSync(path.join(root, 'public', 'robots.txt'))) {
    issues.push('public/robots.txt is missing');
  }

  return issues;
}

/**
 * Every indexable page needs a title and description, which on this site means
 * rendering one of the SEO components. A page that renders none gets no title
 * tag, no description, and no `robots` tag — so it defaults to indexable with
 * nothing to show for it.
 */
async function auditPages() {
  const issues = [];
  const files = await globby(['pages/**/*.tsx'], { cwd: root });

  for (const file of files.sort()) {
    if (NO_SEO_REQUIRED.has(file)) continue;

    const route =
      `/${file.replace(/^pages\//, '').replace(/\.tsx$/, '')}`.replace(
        /\/index$/,
        '',
      ) || '/';
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const rendersSEO = /<(PageSEO|BlogSEO|TagSEO)\b/.test(source);

    if (!rendersSEO) {
      // A noindexed page still needs *a* robots tag to be noindexed by.
      if (isNoIndexRoute(route)) {
        if (!/name="robots"/.test(source)) {
          issues.push(`${file} renders no SEO component and no robots tag`);
        }
        continue;
      }
      issues.push(
        `${file} renders no SEO component — ${route} would have no title, description or robots tag`,
      );
      continue;
    }

    if (/description=""/.test(source)) {
      issues.push(`${file} passes an empty description to its SEO component`);
    }
  }

  return issues;
}

async function auditSEO() {
  const blogDir = path.join(root, 'data', 'blog');
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });

  let issuesFound = 0;

  console.log(`Auditing ${files.length} blog posts...\n`);

  files.forEach((file) => {
    const filePath = path.join(blogDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(source);

    const issues = [];
    const warnings = [];

    if (!data.title) issues.push('Missing Title');
    if (!data.summary) issues.push('Missing Summary');
    if (!data.date) issues.push('Missing Date');
    if (!data.tags || !Array.isArray(data.tags) || data.tags.length === 0)
      issues.push('Missing or Invalid Tags');

    // Warnings — no explicit social image is fine: the build falls back to a
    // deterministic generated OG card (scripts/generate-og-images.mjs). This is
    // informational only, not a failure.
    if (!data.images || data.images.length === 0)
      warnings.push('No explicit social image — using generated OG card');

    if (issues.length > 0 || warnings.length > 0) {
      if (issues.length > 0) issuesFound++;

      console.log(`\x1b[1m${file}\x1b[0m ${data.draft ? '(DRAFT)' : ''}`);
      issues.forEach((i) => console.log(`  \x1b[31m✖\x1b[0m ${i}`));
      warnings.forEach((w) => console.log(`  \x1b[33m⚠\x1b[0m ${w}`));
      console.log('');
    }
  });

  const siteIssues = auditSiteMetadata();
  const pageIssues = await auditPages();

  for (const [label, list] of [
    ['Site configuration', siteIssues],
    ['Pages', pageIssues],
  ]) {
    if (!list.length) continue;
    console.log(`\x1b[1m${label}\x1b[0m`);
    list.forEach((i) => console.log(`  \x1b[31m✖\x1b[0m ${i}`));
    console.log('');
  }

  const totalIssues = issuesFound + siteIssues.length + pageIssues.length;

  if (totalIssues > 0) {
    console.log(`\x1b[31mAudit failed with ${totalIssues} problem(s).\x1b[0m`);
    process.exit(1);
  } else {
    console.log('\x1b[32mSEO Audit Passed! All posts look good.\x1b[0m');
  }
}

auditSEO();
