const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const globby = require('globby');

const root = process.cwd();

async function generateSearchIndex() {
  const blogDir = path.join(root, 'data', 'blog');
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });

  const posts = files
    .map((file) => {
      const source = fs.readFileSync(path.join(blogDir, file), 'utf8');
      const { data } = matter(source);

      if (data.draft === true) return null;

      return {
        slug: file.replace(/\.(mdx|md)$/, ''),
        title: data.title,
        date: data.date
          ? new Date(data.date).toISOString().split('T')[0]
          : null,
        tags: data.tags || [],
        summary: data.summary || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  const outputPath = path.join(root, 'public', 'search.json');
  fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
  console.log(`Search index generated: ${posts.length} posts`);
}

generateSearchIndex();
