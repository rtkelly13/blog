/**
 * Writes the site-wide RSS feed to `public/feed.xml` and each tag-specific
 * feed to `public/tags/<tag>/feed.xml` in a single build pass.
 *
 * Consolidating main RSS and per-tag RSS eliminates duplicate disk traversal
 * and frontmatter parsing over `data/blog`.
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

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
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

function generateRss(posts, feedPath = 'feed.xml', title = siteMetadata.title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(title)}</title>
    <link>${siteUrl}/blog</link>
    <description>${escape(siteMetadata.description)}</description>
    <language>${siteMetadata.language}</language>
    <managingEditor>${siteMetadata.email} (${siteMetadata.author})</managingEditor>
    <webMaster>${siteMetadata.email} (${siteMetadata.author})</webMaster>
    <lastBuildDate>${new Date(posts[0]?.date || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/${feedPath}" rel="self" type="application/rss+xml"/>
    ${posts.map(generateRssItem).join('')}
  </channel>
</rss>`;
}

async function generateRssFeeds() {
  const blogDir = path.join(root, 'data', 'blog');
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });

  // 1. Single pass to parse all non-draft posts
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

  // 2. Generate site-wide feed: public/feed.xml
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'feed.xml'), generateRss(posts));
  console.log(`Generated feed.xml with ${posts.length} posts`);

  // 3. Generate per-tag feeds in the same pass: public/tags/<tag>/feed.xml
  const allTags = [...new Set(posts.flatMap((p) => p.tags))];
  for (const tag of allTags) {
    const tagSlug = slugify(tag);
    const filteredPosts = posts.filter((post) =>
      post.tags.map(slugify).includes(tagSlug),
    );

    if (filteredPosts.length === 0) continue;

    const feedPath = `tags/${tagSlug}/feed.xml`;
    const feedTitle = `${siteMetadata.title} - ${tag}`;
    const rss = generateRss(filteredPosts, feedPath, feedTitle);

    const outputDir = path.join(root, 'public', 'tags', tagSlug);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'feed.xml'), rss);
  }
  console.log(`Generated ${allTags.length} tag RSS feeds`);
}

generateRssFeeds();
