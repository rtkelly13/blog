import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public/static/images/logo-square.svg');
const faviconPath = path.join(rootDir, 'public/static/favicons/favicon.ico');
const faviconPngPath = path.join(
  rootDir,
  'public/static/favicons/favicon-32x32.png',
);
const appleTouchPath = path.join(
  rootDir,
  'public/static/favicons/apple-touch-icon.png',
);

async function generateFavicons() {
  console.log('🎨 Generating favicons from logo-square.svg...\n');

  // Ensure favicons directory exists
  const faviconsDir = path.join(rootDir, 'public/static/favicons');
  if (!fs.existsSync(faviconsDir)) {
    fs.mkdirSync(faviconsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Read SVG content
  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  // Set viewport and load SVG
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: transparent; }
          svg { display: block; width: 100%; height: 100%; }
        </style>
      </head>
      <body>${svgContent}</body>
    </html>
  `);

  // Generate all favicon sizes
  const sizes = [
    {
      width: 16,
      height: 16,
      path: path.join(faviconsDir, 'favicon-16x16.png'),
    },
    { width: 32, height: 32, path: faviconPngPath },
    { width: 180, height: 180, path: appleTouchPath },
    {
      width: 192,
      height: 192,
      path: path.join(faviconsDir, 'android-chrome-192x192.png'),
    },
    {
      width: 512,
      height: 512,
      path: path.join(faviconsDir, 'android-chrome-512x512.png'),
    },
    {
      width: 150,
      height: 150,
      path: path.join(faviconsDir, 'mstile-150x150.png'),
    },
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.screenshot({
      path: size.path,
      type: 'png',
      omitBackground: false,
    });
    console.log(
      `✅ Generated: ${size.width}x${size.height} -> ${path.basename(size.path)}`,
    );
  }

  // Copy 32x32 as favicon.ico
  fs.copyFileSync(faviconPngPath, faviconPath);
  console.log(`✅ Generated: favicon.ico`);

  await browser.close();

  // Print file sizes
  console.log('\n📊 Summary:');
  for (const size of sizes) {
    const fileSize = (fs.statSync(size.path).size / 1024).toFixed(1);
    console.log(`   ${path.basename(size.path)}: ${fileSize} KB`);
  }
  const icoSize = (fs.statSync(faviconPath).size / 1024).toFixed(1);
  console.log(`   favicon.ico: ${icoSize} KB`);
  console.log('\n✨ Done! Favicons generated successfully.');
}

generateFavicons().catch((error) => {
  console.error('❌ Error generating favicons:', error);
  process.exit(1);
});
