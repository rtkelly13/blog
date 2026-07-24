import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import prettier from 'prettier';
import { isNoIndexRoute } from '../lib/seo/routePolicy.mjs';

const require = createRequire(import.meta.url);
const siteMetadata = require('../data/siteMetadata.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

// Normalize siteUrl to remove trailing slash
const siteUrl = siteMetadata.siteUrl.replace(/\/$/, '');

(async () => {
  const prettierConfig = await prettier.resolveConfig('./.prettierrc.js');
  const pages = await globby(
    [
      // `pages/**` (not `pages/*`) so nested index routes are included —
      // /talks, /series, /live and friends were silently absent from the
      // sitemap while top-level /admin was being advertised in it.
      'pages/**/*.tsx',
      'pages/**/*.js',
      'data/blog/**/*.mdx',
      'data/blog/**/*.md',
      'data/talks/**/*.mdx',
      'data/talks/**/*.md',
      // Each generated tag feed stands in for its tag page: the `/feed.xml`
      // suffix is stripped below, leaving `/tags/<tag>`. This is why
      // `generate-tag-rss.mjs` runs before this script in `pnpm build` — on a
      // clean checkout `public/tags/` does not exist until it has.
      'public/tags/**/*.xml',
      '!pages/_*.tsx',
      '!pages/_*.js',
      '!pages/api/**',
      '!pages/404.tsx',
      '!pages/404.js',
    ],
    { cwd: root },
  );

  // Draft content (blog posts / talks marked `draft: true`) is excluded from
  // the production build's routes, so it must not appear in the sitemap either.
  const isDraft = (page) => {
    if (!/^data\/.*\.(mdx|md)$/.test(page)) return false;
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    return matter(source).data.draft === true;
  };
  const publishedPages = pages.filter((page) => !isDraft(page));

  /** Newest of `date` / `lastmod`, as a `YYYY-MM-DD` <lastmod> value. */
  const lastmodFor = (page) => {
    if (!/^data\/.*\.(mdx|md)$/.test(page)) return null;
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    const { data } = matter(source);
    const stamp = data.lastmod || data.date;
    if (!stamp) return null;
    const parsed = new Date(stamp);
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toISOString().split('T')[0];
  };

  const entries = publishedPages
    .map((page) => {
      const pagePath = page
        .replace('pages/', '/')
        .replace('data/blog', '/blog')
        .replace('data/talks', '/talks')
        .replace('public/', '/')
        .replace(/\.(tsx|js|mdx|md)$/, '')
        .replace('/feed.xml', '');
      const route = pagePath.replace(/\/index$/, '') || '/';

      // Dynamic route files (`[slug]`, `[...slug]`) are templates, not URLs —
      // the pages they generate come from the `data/**` globs above.
      if (route.includes('[')) return null;
      // A page excluded from search results must not be advertised here.
      if (isNoIndexRoute(route)) return null;

      return {
        loc: `${siteUrl}${route === '/' ? '' : route}`,
        lastmod: lastmodFor(page),
      };
    })
    .filter(Boolean)
    // Two source files can map to the same route (a `.tsx` page and generated
    // content); keep one entry per URL.
    .filter((entry, i, all) => all.findIndex((e) => e.loc === entry.loc) === i)
    .sort((a, b) => a.loc.localeCompare(b.loc));

  const sitemap = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${entries
              .map(
                ({ loc, lastmod }) => `
                        <url>
                            <loc>${loc}</loc>
                            ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
                        </url>
                    `,
              )
              .join('')}
        </urlset>
    `;

  const formatted = await prettier.format(sitemap, {
    ...prettierConfig,
    parser: 'html',
  });

  fs.writeFileSync(path.join(root, 'public/sitemap.xml'), formatted);
})();
