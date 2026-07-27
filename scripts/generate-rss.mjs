/**
 * Writes the site-wide RSS feed to `public/feed.xml`.
 *
 * Runs as a build step alongside the sitemap, tag feeds and search index. It
 * used to be a `fs.writeFileSync` inside `pages/blog/[...slug].tsx`'s
 * `getStaticProps` — which meant the feed only existed as a side effect of a
 * post page being built, and vanished if there were no published posts.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import { show_drafts } from '../lib/utils/showDrafts.mjs';

const require = createRequire(import.meta.url);
const siteMetadata = require('../data/siteMetadata.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const siteUrl = siteMetadata.siteUrl.replace(/\/$/, '');

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRssItem(post) {
  return `
    <item>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <title>${escape(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      ${post.summary ? `<description>${escape(post.summary)}</description>` : ''}
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${siteMetadata.email} (${siteMetadata.author})</author>
      ${post.tags.map((t) => `<category>${escape(t)}</category>`).join('')}
    </item>
  `;
}

function generateRss(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(siteMetadata.title)}</title>
    <link>${siteUrl}/blog</link>
    <description>${escape(siteMetadata.description)}</description>
    <language>${siteMetadata.language}</language>
    <managingEditor>${siteMetadata.email} (${siteMetadata.author})</managingEditor>
    <webMaster>${siteMetadata.email} (${siteMetadata.author})</webMaster>
    <lastBuildDate>${new Date(posts[0]?.date || 0).toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(generateRssItem).join('')}
  </channel>
</rss>`;
}

async function generateMainRssFeed() {
  const blogDir = path.join(root, 'data', 'blog');
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });

  const posts = files
    .map((file) => {
      const source = fs.readFileSync(path.join(blogDir, file), 'utf8');
      const { data } = matter(source);
      if (data.draft === true && !show_drafts()) return null;
      return {
        slug: file.replace(/\.(mdx|md)$/, ''),
        title: data.title,
        date: data.date ? new Date(data.date).toISOString() : null,
        tags: data.tags || [],
        summary: data.summary || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  fs.writeFileSync(path.join(root, 'public', 'feed.xml'), generateRss(posts));
  console.log(`Generated feed.xml with ${posts.length} posts`);
}

generateMainRssFeed();
