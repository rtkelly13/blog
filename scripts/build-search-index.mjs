/**
 * Build the site's deep-search index as a static, dynamically-loaded asset.
 *
 * Emits `public/search-index.json` — one entry per published blog post and talk,
 * carrying the full body as plain text (not just title/summary like the legacy
 * `search.json`). The command palette lazy-loads this file on first open and
 * ranks matches client-side (see components/search/DeepSearch.tsx), so search
 * covers full document bodies with no backend and no per-keystroke network call.
 *
 * Runs as part of `pnpm build` (and standalone via `pnpm search:index`).
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

// Cap the stored body so the shipped index stays lean; the head of a post is
// more than enough for match relevance and a snippet.
const MAX_BODY = 12000;

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
    docs.push({
      slug,
      type,
      title: String(data.title ?? slug),
      summary: typeof data.summary === 'string' ? data.summary : '',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      date: data.date ? String(data.date).slice(0, 10) : '',
      url: `${urlBase}/${slug}`,
      body: toPlainText(content).slice(0, MAX_BODY),
    });
  }
  return docs;
}

async function main() {
  const docs = [
    ...(await collect('blog', 'blog', '/blog')),
    ...(await collect('talks', 'talk', '/talks')),
  ];
  // Newest first, so the empty-query "browse" view leads with recent content.
  docs.sort((a, b) => (a.date > b.date ? -1 : 1));

  const outPath = path.join(root, 'public', 'search-index.json');
  fs.writeFileSync(outPath, JSON.stringify(docs));
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`Search index: ${docs.length} documents, ${kb} KB → ${outPath}`);
}

main().catch((err) => {
  console.error('❌ Failed to build search index:', err);
  process.exit(1);
});
