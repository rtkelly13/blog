const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const globby = require('globby');

const siteMetadata = require('../data/siteMetadata');

const root = process.cwd();

// Remove trailing slash from URL if present
const siteUrl = siteMetadata.siteUrl.replace(/\/$/, '');

function escape(str) {
  return str
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

function generateRss(posts, feedPath, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(title)}</title>
    <link>${siteUrl}/blog</link>
    <description>${escape(siteMetadata.description)}</description>
    <language>${siteMetadata.language}</language>
    <lastBuildDate>${new Date(posts[0]?.date || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/${feedPath}" rel="self" type="application/rss+xml"/>
    ${posts.map(generateRssItem).join('')}
  </channel>
</rss>`;
}

async function generateTagRssFeeds() {
  const blogDir = path.join(root, 'data', 'blog');
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });

  // Parse all posts
  const allPosts = files
    .map((file) => {
      const source = fs.readFileSync(path.join(blogDir, file), 'utf8');
      const { data } = matter(source);
      if (data.draft === true) return null;
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

  // Get unique tags
  const allTags = [...new Set(allPosts.flatMap((p) => p.tags))];

  console.log(`Generating RSS feeds for ${allTags.length} tags...`);

  for (const tag of allTags) {
    const tagSlug = slugify(tag);
    const filteredPosts = allPosts.filter((post) =>
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

generateTagRssFeeds();
