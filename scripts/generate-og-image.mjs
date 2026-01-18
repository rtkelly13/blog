import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateOgImage() {
  const svgPath = path.join(__dirname, '../public/static/images/og-card.svg');
  const pngPath = path.join(__dirname, '../public/static/images/og-card.png');

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });

  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          svg { display: block; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.screenshot({ path: pngPath, type: 'png' });

  await browser.close();

  console.log('✅ OG image generated successfully!');
  console.log('   SVG:', svgPath);
  console.log('   PNG:', pngPath);

  const stats = fs.statSync(pngPath);
  console.log('   Size:', Math.round(stats.size / 1024), 'KB');
}

generateOgImage().catch(console.error);
