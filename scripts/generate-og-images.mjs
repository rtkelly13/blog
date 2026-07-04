/**
 * Generate per-post social/OG card PNGs from the deterministic SVG engine.
 *
 * For every blog post this renders `buildHeaderSvg(... , og preset)` and
 * rasterises it to `public/static/og/<slug>.png` (1200×630) with `sharp`.
 * sharp is browser-free (libvips/resvg under the hood), so this runs anywhere
 * `next build` runs — CI and Vercel — with no Playwright/Chromium dependency.
 * Output filenames are derived from the slug, so they are stable and the SEO
 * layer can reference `/static/og/<slug>.png` without a lookup table.
 *
 * Idempotent: re-running only rewrites PNGs whose source SVG changed (tracked
 * via a `.manifest.json` of content hashes) unless `--force` is passed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import sharp from 'sharp';
import { buildHeaderSvg, HEADER_PRESETS } from '../lib/og/headerImage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const force = process.argv.includes('--force');
const blogDir = path.join(root, 'data', 'blog');
const outDir = path.join(root, 'public', 'static', 'og');
const manifestPath = path.join(outDir, '.manifest.json');

async function generate() {
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};
  const nextManifest = {};

  const { width, height } = HEADER_PRESETS.og;
  let written = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const { data } = matter(fs.readFileSync(path.join(blogDir, file), 'utf8'));

    const svg = buildHeaderSvg({
      title: data.title || slug,
      slug,
      tags: Array.isArray(data.tags) ? data.tags : [],
      date: data.date,
      width,
      height,
    });

    const hash = crypto.createHash('sha1').update(svg).digest('hex');
    nextManifest[slug] = hash;

    const pngPath = path.join(outDir, `${slug}.png`);
    if (!force && manifest[slug] === hash && fs.existsSync(pngPath)) {
      skipped++;
      continue;
    }

    fs.mkdirSync(path.dirname(pngPath), { recursive: true });
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    written++;
    console.log(`  ✓ ${slug}.png`);
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
  console.log(
    `\nOG images: ${written} written, ${skipped} unchanged (${files.length} posts).`,
  );
}

generate().catch((err) => {
  console.error('❌ Error generating OG images:', err);
  process.exit(1);
});
