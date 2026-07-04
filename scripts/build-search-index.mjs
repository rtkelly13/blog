/**
 * Build the full-text search corpus for the whole site.
 *
 * Reads every published blog post and talk, strips the MDX body to plain text,
 * and writes one JSON document per line to `convex/search-docs.jsonl`. The
 * deploy workflow (.github/workflows/index-search.yml) then loads it into the
 * Convex `documents` table with `convex import --replace`, which rebuilds the
 * `search_text` full-text index. That corpus powers the command palette's deep
 * (full-body) search — the static `public/search.json` only carries titles and
 * summaries.
 *
 * Run standalone with: `pnpm search:index` (or `node scripts/build-search-index.mjs`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import { show_drafts } from '../lib/utils/showDrafts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

// Cap the indexed haystack per document to stay comfortably under Convex's 1MB
// per-field limit; the head of a post is more than enough for match relevance.
const MAX_TEXT = 16000;
const SNIPPET = 200;

/** Strip MDX/Markdown to readable plain text (best-effort, deterministic). */
function toPlainText(body) {
  return body
    .replace(/^import\s.+$/gm, '') // ESM imports
    .replace(/^export\s.+$/gm, '') // ESM exports
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/<!--[\s\S]*?-->/g, ' ') // HTML comments
    .replace(/\{[\s\S]*?\}/g, ' ') // JSX expressions / mermaid bodies
    .replace(/<[^>]+>/g, ' ') // JSX / HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/^[#>\-*+\s]+/gm, '') // heading / list / quote markers
    .replace(/[*_~`]/g, '') // leftover emphasis marks
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

async function collect(dir, type, urlBase) {
  const base = path.join(root, 'data', dir);
  if (!fs.existsSync(base)) return [];
  const files = await globby(['**/*.{md,mdx}'], { cwd: base });
  const docs = [];
  for (const file of files) {
    const { data, content } = matter(
      fs.readFileSync(path.join(base, file), 'utf8'),
    );
    if (data.draft === true && !show_drafts()) continue;

    const slug = file.replace(/\.(mdx|md)$/, '');
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    const summary = typeof data.summary === 'string' ? data.summary : undefined;
    const plain = toPlainText(content);
    const text = [data.title ?? slug, tags.join(' '), summary ?? '', plain]
      .join('\n')
      .slice(0, MAX_TEXT);

    docs.push({
      slug,
      type,
      title: String(data.title ?? slug),
      ...(summary ? { summary } : {}),
      tags,
      ...(data.date ? { date: String(data.date).slice(0, 10) } : {}),
      url: `${urlBase}/${slug}`,
      text,
      snippet: plain.slice(0, SNIPPET),
    });
  }
  return docs;
}

async function main() {
  const docs = [
    ...(await collect('blog', 'blog', '/blog')),
    ...(await collect('talks', 'talk', '/talks')),
  ];
  const outPath = path.join(root, 'convex', 'search-docs.jsonl');
  fs.writeFileSync(
    outPath,
    `${docs.map((d) => JSON.stringify(d)).join('\n')}\n`,
  );
  console.log(`Search corpus: ${docs.length} documents → ${outPath}`);
}

main().catch((err) => {
  console.error('❌ Failed to build search index:', err);
  process.exit(1);
});
