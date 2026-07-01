import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import prettier from 'prettier';

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
      'pages/*.tsx',
      'pages/*.js',
      'data/blog/**/*.mdx',
      'data/blog/**/*.md',
      'data/talks/**/*.mdx',
      'data/talks/**/*.md',
      'public/tags/**/*.xml',
      '!pages/_*.tsx',
      '!pages/_*.js',
      '!pages/api',
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

  const sitemap = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${publishedPages
              .map((page) => {
                const pagePath = page
                  .replace('pages/', '/')
                  .replace('data/blog', '/blog')
                  .replace('data/talks', '/talks')
                  .replace('public/', '/')
                  .replace('.tsx', '')
                  .replace('.js', '')
                  .replace('.mdx', '')
                  .replace('.md', '')
                  .replace('/feed.xml', '');
                const route = pagePath === '/index' ? '' : pagePath;
                if (
                  page === 'pages/404.tsx' ||
                  page === 'pages/404.js' ||
                  page === 'pages/blog/[...slug].tsx' ||
                  page === 'pages/blog/[...slug].js'
                ) {
                  return;
                }
                return `
                        <url>
                            <loc>${siteUrl}${route}</loc>
                        </url>
                    `;
              })
              .join('')}
        </urlset>
    `;

  const formatted = await prettier.format(sitemap, {
    ...prettierConfig,
    parser: 'html',
  });

  fs.writeFileSync(path.join(root, 'public/sitemap.xml'), formatted);
})();
