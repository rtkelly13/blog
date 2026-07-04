/**
 * Deterministic header / social-card image engine.
 *
 * Given a post's front matter it produces a self-contained SVG string. The
 * output is a pure function of the inputs: the same `seed` (slug) always yields
 * the same palette, decorative field, and layout. That determinism is the whole
 * point — every post gets a distinct-but-stable brutalist banner with zero
 * hand-authored assets, and the exact same engine backs both:
 *
 *   1. the on-page hero (rendered inline as SVG by `components/PostHeaderImage`)
 *   2. the social/OG card (rasterised to PNG at build time by
 *      `scripts/generate-og-images.mjs`, wired into SEO meta tags)
 *
 * The implementation is framework-agnostic ESM JS so it can be imported by both
 * a `.tsx` component and a `.mjs` build script (see the `headerImage.ts`
 * re-export, mirroring the `showDrafts.mjs` / `showDrafts.ts` pair).
 */

// --- Design tokens (mirror tailwind.config.js brutalist palette) -------------

const BG = '#0a0a1a'; // brutalist.darkBg — same as the CyberHero background
const FG = '#ffffff';

/**
 * Themes mirror the CyberHero's synthwave language: a `grid` colour for the
 * perspective floor + flat lattice, and a `sun` colour for the horizon ring and
 * circuits. `shadow` is the title's hard-shadow accent, `tag` the chip colour.
 * One theme is chosen deterministically per post from the seed.
 */
const THEMES = [
  { grid: '#39ff14', sun: '#ff8c00', shadow: '#ff8c00', tag: '#39ff14' }, // classic synthwave (neon green / cyber orange)
  { grid: '#22d3ee', sun: '#ec4899', shadow: '#ec4899', tag: '#22d3ee' }, // cyan / pink
  { grid: '#ff8c00', sun: '#39ff14', shadow: '#39ff14', tag: '#ff8c00' }, // orange / green
  { grid: '#d9a9ff', sun: '#00ffff', shadow: '#d9a9ff', tag: '#00ffff' }, // purple / cyan
  { grid: '#facc15', sun: '#ec4899', shadow: '#facc15', tag: '#ec4899' }, // yellow / pink
  { grid: '#00ffff', sun: '#ff8c00', shadow: '#00ffff', tag: '#ff8c00' }, // neon cyan / orange
];

const DISPLAY_FONT = "'Space Grotesk', 'Arial Black', 'Helvetica Neue', sans-serif";
const MONO_FONT = "'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace";

/** Named size presets. `banner` is a 2:1 hero; `og` is the 1.91:1 social card. */
export const HEADER_PRESETS = {
  banner: { width: 1200, height: 600 },
  og: { width: 1200, height: 630 },
};

// --- Deterministic primitives ------------------------------------------------

/** FNV-1a 32-bit hash → stable unsigned int seed. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Escape the five XML-significant characters for safe inclusion in SVG text. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Greedy word-wrap using a font-independent metric so layout is identical
 * whether or not the webfont has loaded (the rasteriser and the browser agree).
 * Shrinks the font size stepwise until the text fits `maxLines`, then truncates.
 */
function wrapTitle(title, maxWidth, startSize, minSize, maxLines) {
  const words = String(title).trim().split(/\s+/);
  const CHAR_W = 0.58; // avg glyph width as a fraction of font size (bold display)

  for (let size = startSize; size >= minSize; size -= 4) {
    const maxChars = Math.max(6, Math.floor(maxWidth / (size * CHAR_W)));
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxChars) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines) return { lines, size };
  }

  // Did not fit even at minSize — hard-wrap and ellipsise the overflow.
  const maxChars = Math.max(6, Math.floor(maxWidth / (minSize * CHAR_W)));
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1))}…`;
  }
  return { lines, size: minSize };
}

/** Synthwave perspective floor grid receding to a central vanishing point. */
function perspectiveGrid(width, height, horizon, color) {
  const vpX = width / 2;
  const parts = [];
  // Receding horizontals: bunch near the horizon (quadratic easing), thicker
  // and more opaque toward the viewer.
  const rows = 15;
  for (let i = 1; i <= rows; i++) {
    const t = i / rows;
    const y = horizon + (height - horizon) * (t * t);
    const op = (0.14 + 0.42 * t).toFixed(3);
    parts.push(
      `<line x1="0" y1="${y.toFixed(1)}" x2="${width}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${(1 + t).toFixed(2)}" opacity="${op}"/>`,
    );
  }
  // Converging verticals: fan from beyond both edges of the base to the VP.
  const cols = 18;
  for (let i = 0; i <= cols; i++) {
    const x0 = (i / cols) * (width * 2) - width * 0.5;
    parts.push(
      `<line x1="${x0.toFixed(1)}" y1="${height}" x2="${vpX}" y2="${horizon}" stroke="${color}" stroke-width="1.3" opacity="0.28"/>`,
    );
  }
  return parts.join('');
}

/** Horizon "sun": soft glow + ring + venetian slats, like the CyberHero circle. */
function sun(cx, cy, r, color) {
  const parts = [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.14" filter="url(#glow)"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="4" opacity="0.75"/>`,
  ];
  // Venetian slats across the lower half — increasingly tall toward the base.
  for (let i = 1; i <= 6; i++) {
    const y = Math.round(cy + (r * i) / 7);
    const h = 3 + i * 1.5;
    parts.push(
      `<rect x="${cx - r}" y="${y}" width="${2 * r}" height="${h.toFixed(1)}" fill="${BG}" opacity="0.9"/>`,
    );
  }
  return parts.join('');
}

/** A couple of angular circuit traces reaching toward the sun (CyberHero echo). */
function circuits(width, height, cx, cy, color) {
  const y1 = Math.round(cy - height * 0.06);
  const y2 = Math.round(cy + height * 0.05);
  return (
    `<path d="M${width} ${y1} L${cx + 150} ${y1} L${cx + 110} ${y1 - 34} L${cx + 40} ${y1 - 34}" fill="none" stroke="${color}" stroke-width="2" opacity="0.3"/>` +
    `<path d="M${width} ${y2} L${cx + 130} ${y2} L${cx + 96} ${y2 + 30} L${cx + 30} ${y2 + 30}" fill="none" stroke="${color}" stroke-width="2" opacity="0.3"/>`
  );
}

// --- Engine ------------------------------------------------------------------

/**
 * @typedef {Object} HeaderImageOptions
 * @property {string} title        Post title (required).
 * @property {string} [seed]       Determinism seed; defaults to slug || title.
 * @property {string} [slug]       Post slug (used as seed and default eyebrow).
 * @property {string[]} [tags]     Tags rendered as chips (first 4 used).
 * @property {string} [date]       ISO date shown in the eyebrow.
 * @property {string} [siteName]   Footer brand line.
 * @property {number} [width]      Canvas width (default 1200).
 * @property {number} [height]     Canvas height (default 630).
 */

/**
 * Produce a deterministic brutalist header SVG for a post.
 * @param {HeaderImageOptions} options
 * @returns {string} A complete, standalone `<svg>…</svg>` string.
 */
export function buildHeaderSvg(options) {
  const {
    title,
    slug,
    tags = [],
    date,
    siteName = 'ryankelly.dev',
    width = 1200,
    height = 630,
  } = options;

  const seed = fnv1a(options.seed || slug || title || 'post');
  const theme = THEMES[seed % THEMES.length];

  // Geometry, all derived from the canvas so any size stays balanced.
  const inset = Math.round(width * 0.018);
  const pad = Math.round(width * 0.05);
  const innerX = inset + pad;
  const innerW = width - 2 * inset - 2 * pad;

  // Synthwave horizon + sun (mirrors the CyberHero grid/circle).
  const horizon = Math.round(height * 0.64);
  const sunCx = Math.round(width / 2);
  const sunR = Math.round(height * 0.26);

  const eyebrowSize = Math.round(width * 0.02);
  const tagSize = Math.round(width * 0.019);
  const footerSize = Math.round(width * 0.021);

  // Eyebrow: `> YYYY-MM-DD` or the slug, in accent mono.
  const eyebrowText = date
    ? new Date(date).toISOString().slice(0, 10)
    : String(slug || '').replace(/[-/]/g, ' ');
  const eyebrowY = inset + pad + eyebrowSize;

  // The title lives in the band above the horizon; tags sit on the horizon,
  // footer at the very bottom over the receding grid.
  const tagsText = tags
    .slice(0, 4)
    .map((t) => `[ ${esc(t)} ]`)
    .join('  ');
  const footerY = height - inset - Math.round(pad * 0.5);
  const tagsY = horizon - Math.round(tagSize * 0.9);
  const titleBottom = tagsY - Math.round(tagSize * 1.9);
  const titleTop = eyebrowY + Math.round(height * 0.03);

  // Title: wrap to fit width (≤3 lines), then shrink to fit the band height so
  // it never crosses into the tags/horizon.
  const wrapped = wrapTitle(
    title || 'Untitled',
    innerW,
    Math.round(width * 0.072),
    Math.round(width * 0.042),
    3,
  );
  const availH = titleBottom - titleTop;
  const titleSize = Math.max(
    Math.round(width * 0.042),
    Math.min(wrapped.size, Math.floor(availH / (wrapped.lines.length * 1.16))),
  );
  const lines = wrapped.lines;
  const lineHeight = Math.round(titleSize * 1.12);
  const shadowOffset = Math.max(3, Math.round(titleSize * 0.05));
  const blockH = lines.length * lineHeight;
  const firstBaseline =
    titleTop + Math.round((availH - blockH) / 2) + Math.round(titleSize * 0.82);

  // Title lines drawn twice: an offset accent "hard shadow" under white text.
  const titleSvg = lines
    .map((line, i) => {
      const y = firstBaseline + i * lineHeight;
      const t = esc(line);
      return (
        `<text x="${innerX + shadowOffset}" y="${y + shadowOffset}" font-family="${DISPLAY_FONT}" font-size="${titleSize}" font-weight="700" fill="${theme.shadow}" opacity="0.9">${t}</text>` +
        `<text x="${innerX}" y="${y}" font-family="${DISPLAY_FONT}" font-size="${titleSize}" font-weight="700" fill="${FG}">${t}</text>`
      );
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">`,
    '<defs>',
    // soft glow for the sun
    `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(sunR * 0.12)}"/></filter>`,
    // faint flat lattice for the sky (above the horizon)
    `<pattern id="sky" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0 H0 V44" fill="none" stroke="${theme.grid}" stroke-width="1" opacity="0.05"/></pattern>`,
    // vertical scrim: darken top (title contrast) and bottom (footer contrast)
    `<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${BG}" stop-opacity="0.55"/>`,
    `<stop offset="0.2" stop-color="${BG}" stop-opacity="0.12"/>`,
    `<stop offset="0.55" stop-color="${BG}" stop-opacity="0"/>`,
    `<stop offset="0.74" stop-color="${BG}" stop-opacity="0.28"/>`,
    `<stop offset="1" stop-color="${BG}" stop-opacity="0.85"/>`,
    `</linearGradient>`,
    '</defs>',
    // base + sky lattice
    `<rect width="${width}" height="${height}" fill="${BG}"/>`,
    `<rect width="${width}" height="${horizon}" fill="url(#sky)"/>`,
    // sun behind the grid, then the receding floor grid, then circuits
    sun(sunCx, horizon, sunR, theme.sun),
    perspectiveGrid(width, height, horizon, theme.grid),
    circuits(width, height, sunCx, horizon, theme.sun),
    // horizon line
    `<line x1="0" y1="${horizon}" x2="${width}" y2="${horizon}" stroke="${theme.grid}" stroke-width="2" opacity="0.6"/>`,
    // scrim for text legibility
    `<rect width="${width}" height="${height}" fill="url(#scrim)"/>`,
    // brutalist inset frame
    `<rect x="${inset}" y="${inset}" width="${width - 2 * inset}" height="${height - 2 * inset}" fill="none" stroke="${FG}" stroke-width="2"/>`,
    // top accent bar
    `<rect x="${innerX}" y="${inset + Math.round(pad * 0.45)}" width="${Math.round(width * 0.06)}" height="6" fill="${theme.grid}"/>`,
    // eyebrow
    `<text x="${innerX}" y="${eyebrowY}" font-family="${MONO_FONT}" font-size="${eyebrowSize}" font-weight="700" fill="${theme.grid}" letter-spacing="2">&gt; ${esc(eyebrowText)}</text>`,
    // title
    titleSvg,
    // tags
    tagsText
      ? `<text x="${innerX}" y="${tagsY}" font-family="${MONO_FONT}" font-size="${tagSize}" font-weight="500" fill="${theme.tag}">${tagsText}</text>`
      : '',
    // footer brand
    `<text x="${innerX}" y="${footerY}" font-family="${MONO_FONT}" font-size="${footerSize}" font-weight="700" fill="${FG}">${esc(siteName)}</text>`,
    `<text x="${width - inset - pad}" y="${footerY}" text-anchor="end" font-family="${MONO_FONT}" font-size="${footerSize}" font-weight="700" fill="${theme.sun}">//</text>`,
    `</svg>`,
  ].join('');
}
