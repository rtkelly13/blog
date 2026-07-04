/**
 * Generate per-post social/OG card PNGs from the deterministic SVG engine.
 *
 * For every blog post this renders `buildHeaderSvg(... , og preset)` and
 * rasterises it to `public/static/og/<slug>.png` (1200×630) using the same
 * Playwright-screenshot approach as `generate-og-image.mjs` /
 * `generate-favicon.mjs`. Output filenames are derived from the slug, so they
 * are stable and the SEO layer can reference `/static/og/<slug>.png` without a
 * lookup table.
 *
 * Idempotent: re-running only rewrites PNGs whose source metadata changed
 * (tracked via a `.manifest.json` of content hashes) unless `--force` is passed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';
import { chromium } from 'playwright';
import { buildHeaderSvg, HEADER_PRESETS } from '../lib/og/headerImage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const force = process.argv.includes('--force');
const blogDir = path.join(root, 'data', 'blog');
const outDir = path.join(root, 'public', 'static', 'og');
const manifestPath = path.join(outDir, '.manifest.json');

/** Best-effort @font-face injection so the raster matches the live site fonts. */
function buildFontFaceCss() {
  const families = [
    { family: 'Space Grotesk', pkg: 'space-grotesk' },
    { family: 'IBM Plex Mono', pkg: 'ibm-plex-mono' },
  ];
  const faces = [];
  for (const { family, pkg } of families) {
    const filesDir = path.join(root, 'node_modules', '@fontsource', pkg, 'files');
    if (!fs.existsSync(filesDir)) continue;
    for (const file of fs.readdirSync(filesDir)) {
      const m = file.match(/-latin-(\d+)-normal\.woff2$/);
      if (!m) continue;
      const url = new URL(`file://${path.join(filesDir, file)}`).href;
      faces.push(
        `@font-face{font-family:'${family}';font-style:normal;font-weight:${m[1]};src:url('${url}') format('woff2');}`,
      );
    }
  }
  return faces.join('\n');
}

async function generate() {
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};
  const nextManifest = {};

  const { width, height } = HEADER_PRESETS.og;
  const fontCss = buildFontFaceCss();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });

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
    await page.setContent(
      `<!DOCTYPE html><html><head><style>` +
        `${fontCss}body{margin:0;padding:0}svg{display:block}` +
        `</style></head><body>${svg}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: pngPath, type: 'png' });
    written++;
    console.log(`  ✓ ${slug}.png`);
  }

  await browser.close();
  fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

  console.log(
    `\nOG images: ${written} written, ${skipped} unchanged (${files.length} posts).`,
  );
}

generate().catch((err) => {
  console.error('❌ Error generating OG images:', err);
  process.exit(1);
});
