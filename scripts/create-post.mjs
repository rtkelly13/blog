import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import dedent from 'dedent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const options = {
  title: { type: 'string' },
  summary: { type: 'string' },
  tags: { type: 'string' },
  draft: { type: 'boolean', default: false },
  layout: { type: 'string', default: 'PostLayout' },
  extension: { type: 'string', default: 'mdx' },
  authors: { type: 'string', default: 'default' },
};

try {
  const { values } = parseArgs({ options, allowPositionals: true });

  if (!values.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }

  const d = new Date();
  const date = [
    d.getFullYear(),
    `0${d.getMonth() + 1}`.slice(-2),
    `0${d.getDate()}`.slice(-2),
  ].join('-');

  const tagArray = values.tags ? values.tags.split(',') : [];
  tagArray.forEach((tag, index) => (tagArray[index] = tag.trim()));
  const tagsStr = tagArray.length > 0 ? `'${tagArray.join("','")}'` : '';

  const authorArray = values.authors ? values.authors.split(',') : ['default'];
  const authorsStr =
    authorArray.length > 0 ? `'${authorArray.join("','")}'` : '';

  let frontMatter = dedent`---
  title: ${values.title}
  date: '${date}'
  tags: [${tagsStr}]
  draft: ${values.draft}
  summary: ${values.summary || ' '}
  images: []
  layout: ${values.layout}
  `;

  if (authorArray.length > 0) {
    frontMatter = `${frontMatter}\nauthors: [${authorsStr}]`;
  }

  frontMatter = `${frontMatter}\n---`;

  // Generate filename
  const fileName = values.title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/ /g, '-')
    .replace(/-+/g, '-');

  const filePath = path.join(
    root,
    'data',
    'blog',
    `${fileName || 'untitled'}.${values.extension}`,
  );

  fs.writeFile(filePath, frontMatter, { flag: 'wx' }, (err) => {
    if (err) {
      if (err.code === 'EEXIST') {
        console.error(`Error: File already exists at ${filePath}`);
        process.exit(1);
      }
      throw err;
    } else {
      console.log(`Blog post generated successfully at ${filePath}`);
    }
  });
} catch (e) {
  console.error(e.message);
  console.log(`
Usage: node scripts/create-post.mjs --title "Post Title" [options]

Options:
  --title     Title of the post (required)
  --summary   Brief summary of the post
  --tags      Comma-separated list of tags (e.g., "nextjs, tailwind")
  --draft     Set post as draft (default: false)
  --layout    Layout component to use (default: PostLayout)
  --extension File extension (md or mdx, default: mdx)
  --authors   Comma-separated list of authors (default: default)
  `);
  process.exit(1);
}
