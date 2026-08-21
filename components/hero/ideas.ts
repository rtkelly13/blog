/**
 * The hero lab's ideas.
 *
 * Each is one `hero()` function running on the ShaderStage harness, and each
 * is chosen for the same reason: it has a *second* reading on paper, not just
 * a recoloured one. That is the thing worth testing — the site's two
 * aesthetics are meant to be equals, so an idea that only works in neon is a
 * failed idea however good it looks on black.
 *
 * `th.ink` is 0 on the lit surface and 1 on paper, and it is what each shader
 * branches its *shading model* on: bloom against ink weight, smooth falloff
 * against stamped levels, coarse LED cells against a fine halftone screen.
 *
 * CONTOUR and CROSSHATCH carry variants — they are the two directions worth
 * pushing, so each gets three treatments rather than one.
 */

export type HeroVariant = {
  id: string;
  name: string;
  note: string;
  hero: string;
};

export type HeroIdea = {
  id: string;
  name: string;
  tagline: string;
  /** How it reads on black. */
  terminal: string;
  /** How it reads on paper. */
  sketch: string;
  /** What flips between the two — the interesting column. */
  pivot: string;
  /** First entry is the default. */
  variants: HeroVariant[];
};

/* ---------------------------------------------------------------- CONTOUR */

const CONTOUR_DRIFT = `
vec4 hero(vec2 uv, float t, Theme th) {
  vec2 p = uv * 1.5 + vec2(t * 0.035, t * 0.018);
  float h = fbm(p);
  float bands = h * 17.0;

  // Every fifth contour is an index line, drawn heavier — the convention a
  // real map uses, and the thing that stops it reading as wallpaper.
  float major = 1.0 - step(0.5, mod(floor(bands), 5.0));
  float weight = mix(1.5, 0.85, th.ink) * mix(1.0, 2.1, major);
  float line = ruled(bands, weight);

  // Paper gets a whisper of tone between the lines; black gets a bloom.
  float w = fwidth(bands);
  float bloom = (1.0 - smoothstep(0.0, w * 7.0, abs(fract(bands) - 0.5)))
    * 0.22 * (1.0 - th.ink);
  float wash = smoothstep(0.35, 0.85, h) * 0.10 * th.ink;

  float body = line * mix(0.6, 0.8, th.ink) + wash;
  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

const CONTOUR_RIDGE = `
// Ridged noise: fold each octave about its midpoint so the maxima come to a
// crest instead of a dome. Contoured, that reads as mountain rather than dune.
float ridged(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(valueNoise(p) * 2.0 - 1.0);
    v += a * n * n;
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec4 hero(vec2 uv, float t, Theme th) {
  vec2 p = uv * 0.95 + vec2(t * 0.02, t * 0.012);
  float h = ridged(p);
  float bands = h * 13.0;

  float major = 1.0 - step(0.5, mod(floor(bands), 5.0));
  float weight = mix(1.4, 0.8, th.ink) * mix(1.0, 2.2, major);
  float line = ruled(bands, weight);

  // Crowded lines mean steep ground: shade the gradient so the relief reads
  // even where the contours merge.
  float slope = clamp(length(vec2(dFdx(h), dFdy(h))) * 130.0, 0.0, 1.0);
  float relief = slope * mix(0.13, 0.11, th.ink);

  float w = fwidth(bands);
  float bloom = (1.0 - smoothstep(0.0, w * 6.0, abs(fract(bands) - 0.5)))
    * 0.24 * (1.0 - th.ink);

  float body = line * mix(0.6, 0.82, th.ink) + relief;
  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

const CONTOUR_ISOBAR = `
vec4 hero(vec2 uv, float t, Theme th) {
  // Fewer, wider bands with pressure centres pushed through them: a synoptic
  // chart rather than a survey map. The whole field advects sideways.
  vec2 p = uv * 0.95 + vec2(t * 0.055, 0.0);
  float h = fbm(p);

  vec2 lowC = vec2(-0.36 + 0.05 * sin(t * 0.21), 0.10);
  vec2 highC = vec2(0.40 + 0.05 * cos(t * 0.17), -0.08);
  h -= 0.34 * exp(-dot(uv - lowC, uv - lowC) * 9.0);
  h += 0.30 * exp(-dot(uv - highC, uv - highC) * 11.0);

  float bands = h * 9.0;
  float major = 1.0 - step(0.5, mod(floor(bands), 4.0));
  float weight = mix(1.7, 1.0, th.ink) * mix(1.0, 2.4, major);
  float line = ruled(bands, weight);

  // Tight isobars mean wind: hatch the gradient lightly where they bunch up.
  float pack = clamp(fwidth(bands) * 2.6, 0.0, 1.0);
  float gust = ruled((rot(0.9) * uv).y * 90.0, 1.0) * pack * mix(0.20, 0.26, th.ink);

  float w = fwidth(bands);
  float bloom = (1.0 - smoothstep(0.0, w * 8.0, abs(fract(bands) - 0.5)))
    * 0.20 * (1.0 - th.ink);

  float body = line * mix(0.62, 0.84, th.ink) + gust;
  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

/* ------------------------------------------------------------- CROSSHATCH */

const CROSSHATCH_PEN = `
float hatch(vec2 uv, float ang, float freq, float weight) {
  return ruled((rot(ang) * uv).y * freq, weight);
}

vec4 hero(vec2 uv, float t, Theme th) {
  // One tonal field, three hatch passes gated on it — darker regions earn more
  // layers, exactly the way pen shading builds up.
  float shade = fbm(uv * 1.7 + vec2(t * 0.05, -t * 0.03));
  shade = smoothstep(0.28, 0.78, shade);

  float weight = mix(1.6, 1.0, th.ink);
  float l1 = hatch(uv, 0.55, 40.0, weight) * step(0.12, shade);
  float l2 = hatch(uv, -0.75, 36.0, weight) * step(0.42, shade);
  float l3 = hatch(uv, 1.75, 32.0, weight) * step(0.70, shade);

  float ink = clamp(l1 + l2 * 0.9 + l3 * 0.8, 0.0, 1.0);
  float body = ink * mix(0.5, 0.78, th.ink);
  float bloom = ink * shade * 0.20 * (1.0 - th.ink);

  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

const CROSSHATCH_ETCH = `
vec4 hero(vec2 uv, float t, Theme th) {
  // Engraving, not hatching: one direction throughout, and tone carried by how
  // fat each line swells rather than by how many layers pile up. This is the
  // banknote / line-engraving idiom, and it holds much finer detail.
  float tone = fbm(uv * 1.5 + vec2(t * 0.045, -t * 0.02));
  tone = smoothstep(0.22, 0.80, tone);

  // Lines bow around the tonal field so the ruling describes a form.
  float v = (rot(0.42) * uv).y * 46.0 + tone * 3.4;
  float w = fwidth(v) * mix(0.35, 2.6, tone) * mix(1.3, 0.9, th.ink);
  float line = 1.0 - smoothstep(0.0, w + 1e-6, abs(fract(v) - 0.5));

  // A second ruling crosses only in the deepest darks, as an engraver would.
  float cross = 1.0 - smoothstep(
    0.0,
    fwidth((rot(-1.15) * uv).y * 44.0) * 1.4 + 1e-6,
    abs(fract((rot(-1.15) * uv).y * 44.0) - 0.5)
  );
  cross *= smoothstep(0.72, 0.95, tone);

  float ink = clamp(line + cross * 0.85, 0.0, 1.0);
  float body = ink * mix(0.55, 0.8, th.ink);
  float bloom = ink * tone * 0.18 * (1.0 - th.ink);

  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

const CROSSHATCH_TOOTH = `
float toothHatch(vec2 uv, float ang, float freq, float weight, float grain) {
  // Push the ruling coordinate around with noise: the stroke wanders the way a
  // nib does when it catches the tooth of the paper.
  vec2 j = uv + grain * vec2(
    valueNoise(uv * 7.0) - 0.5,
    valueNoise(uv * 7.0 + 31.4) - 0.5
  );
  float v = (rot(ang) * j).y * freq;
  float line = ruled(v, weight);

  // Strokes lift off and land again instead of running edge to edge.
  float along = (rot(ang) * j).x * freq * 0.32;
  float breaks = smoothstep(0.30, 0.55, valueNoise(vec2(along, floor(v) * 3.1)));
  return line * breaks;
}

vec4 hero(vec2 uv, float t, Theme th) {
  float shade = fbm(uv * 1.6 + vec2(t * 0.04, -t * 0.025));
  shade = smoothstep(0.26, 0.76, shade);

  float weight = mix(1.7, 1.1, th.ink);
  float grain = mix(0.010, 0.016, th.ink);
  float l1 = toothHatch(uv, 0.50, 34.0, weight, grain) * step(0.14, shade);
  float l2 = toothHatch(uv, -0.82, 30.0, weight, grain) * step(0.46, shade);
  float l3 = toothHatch(uv, 1.66, 27.0, weight, grain) * step(0.74, shade);

  float ink = clamp(l1 + l2 * 0.9 + l3 * 0.85, 0.0, 1.0);

  // Paper takes a faint speckle in the untouched areas; black stays black.
  float speck = step(0.965, hash21(floor(uv * 420.0))) * 0.20 * th.ink;

  float body = ink * mix(0.52, 0.8, th.ink) + speck;
  float bloom = ink * shade * 0.20 * (1.0 - th.ink);

  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

/* --------------------------------------------------------------- THE REST */

const SYNTHWAVE = `
float floorGrid(vec2 uv, float t) {
  // Clamp rather than early-return: a conditional return here would put
  // fwidth() inside non-uniform control flow.
  float horizon = min(uv.y + 0.16, -0.001);
  vec2 plane = vec2(uv.x / -horizon, (0.5 / -horizon) + t * 0.25);
  vec2 cell = abs(fract(plane) - 0.5);
  vec2 w = fwidth(plane) * 1.5;
  vec2 line = smoothstep(w, vec2(0.0), cell);
  float mask = step(uv.y + 0.16, 0.0);
  return max(line.x, line.y) * smoothstep(0.0, 0.22, -horizon) * mask;
}

vec4 hero(vec2 uv, float t, Theme th) {
  float g = floorGrid(uv, t) * mix(0.55, 0.75, th.ink);

  float d = abs(length(uv * vec2(1.0, 1.25)) - 0.30);
  float core = smoothstep(mix(0.010, 0.016, th.ink), 0.002, d);
  float pulse = 0.75 + 0.25 * sin(t * 1.2);
  float bloom = smoothstep(0.18, 0.0, d) * 0.35 * (1.0 - th.ink) * pulse;

  float horizonGlow =
    smoothstep(0.12, 0.0, abs(uv.y + 0.16)) * 0.25 * (1.0 - th.ink);

  vec3 col = th.grid * (g + horizonGlow) + th.ring * (core + bloom);
  float a = clamp(g + horizonGlow + core + bloom, 0.0, 1.0);
  return vec4(col, a);
}`;

const DOTMATRIX = `
vec4 hero(vec2 uv, float t, Theme th) {
  // The screen itself is the tell: an LED panel sits square and coarse, a
  // print halftone sits at 45 degrees and much finer.
  float ang = mix(0.0, 0.785, th.ink);
  float cells = mix(30.0, 46.0, th.ink);
  vec2 p = rot(ang) * uv * cells;
  vec2 f = fract(p) - 0.5;

  // Sample the image once per cell, not per pixel — that is what makes it a
  // dot screen rather than a blurred picture.
  vec2 q = rot(-ang) * ((floor(p) + 0.5) / cells);
  float focus = smoothstep(0.52, 0.10, length(q));
  float wave = 0.5 + 0.5 * sin(length(q) * 17.0 - t * 2.2);
  float ground = smoothstep(0.34, 0.78, fbm(q * 2.0 + vec2(t * 0.05, t * 0.02)));
  float amp = clamp(max(wave * focus, ground * 0.42) + 0.03, 0.0, 1.0);

  float d = length(f) - amp * 0.46;
  float dot = 1.0 - smoothstep(-0.04, 0.04, d);

  float body = dot * mix(0.85, 0.8, th.ink);
  float bloom = smoothstep(0.30, 0.0, length(f)) * amp * 0.30 * (1.0 - th.ink);

  vec3 col = th.grid * body + th.ring * bloom;
  return vec4(col, clamp(body + bloom, 0.0, 1.0));
}`;

const SCOPE = `
vec4 hero(vec2 uv, float t, Theme th) {
  float graticule = max(
    ruled(uv.x * 10.0, mix(1.3, 0.9, th.ink)),
    ruled(uv.y * 10.0, mix(1.3, 0.9, th.ink))
  ) * mix(0.14, 0.30, th.ink);

  // The roles swap. On black the graticule is dim and the beam is the accent;
  // on chart paper the stock is tinted and the pen is plain ink.
  vec3 gridCol = mix(th.grid, th.ring, th.ink * 0.8);
  vec3 penCol = mix(th.ring, th.grid, th.ink);

  vec3 col = gridCol * graticule;
  float a = graticule;

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.15 * sin(uv.x * 3.1 + t * 1.05 + fi * 2.2)
                   * (0.55 + 0.45 * sin(t * 0.6 + fi * 1.7))
            + 0.045 * sin(uv.x * 12.0 - t * 2.3 + fi * 4.0);
    // A pen drags and wobbles; a phosphor beam does not.
    y += 0.006 * (valueNoise(vec2(uv.x * 26.0 + fi * 12.0, t * 0.6)) - 0.5) * th.ink;

    float d = abs(uv.y - y);
    float core = 1.0 - smoothstep(0.0, mix(0.0055, 0.0038, th.ink), d);
    float after = exp(-d * 20.0) * 0.32 * (1.0 - th.ink);

    col += penCol * (core * mix(0.9, 0.85, th.ink)) + th.ring * after;
    a += core * mix(0.9, 0.85, th.ink) + after;
  }

  return vec4(col, clamp(a, 0.0, 1.0));
}`;

const GLYPHRAIN = `
vec4 hero(vec2 uv, float t, Theme th) {
  float cols = mix(40.0, 32.0, th.ink);
  vec2 p = uv * cols;
  vec2 cellId = floor(p);
  vec2 f = fract(p);

  float speed = 0.35 + hash21(vec2(cellId.x, 7.0)) * 0.95;
  float offset = hash21(vec2(cellId.x, 3.0)) * 11.0;
  float head = 9.0 - fract(t * speed * 0.13 + offset) * 26.0;
  float behind = head - cellId.y;
  float trail = exp(-max(behind, 0.0) * mix(0.22, 0.34, th.ink)) * step(0.0, behind);

  // No font atlas: hash each cell into a 5x6 bitmap. They read as glyphs from
  // an alphabet nobody knows, which is the effect anyway.
  uint frame = uint(floor(t * 7.0 + hash21(cellId) * 9.0));
  uint bits = hashU(uvec2(cellId + 128.0) + uvec2(frame, frame * 3u));
  uvec2 g = uvec2(floor(f * vec2(5.0, 6.0)));
  float on = float((bits >> (g.x + g.y * 5u)) & 1u);

  // Keep the glyphs off each other in the cell.
  float inset = step(0.10, f.x) * step(f.x, 0.90)
              * step(0.06, f.y) * step(f.y, 0.94);
  float lit = on * inset * trail;

  // Phosphor fades continuously; a struck letter is either inked or it is not.
  float body = mix(lit, step(0.16, lit), th.ink) * mix(0.9, 0.8, th.ink);
  float headGlow = smoothstep(1.4, 0.0, abs(behind)) * on * inset * (1.0 - th.ink);

  vec3 col = th.grid * body + th.ring * headGlow;
  return vec4(col, clamp(body + headGlow, 0.0, 1.0));
}`;

const only = (hero: string): HeroVariant[] => [
  { id: 'default', name: 'DEFAULT', note: '', hero },
];

export const HERO_IDEAS: HeroIdea[] = [
  {
    id: 'contour',
    name: 'CONTOUR',
    tagline: 'A drifting field read as elevation lines.',
    terminal: 'Isolines glowing off a radar sweep.',
    sketch: 'Ordnance-survey contours, index lines inked heavier.',
    pivot:
      'Line weight carries the depth on paper; brightness carries it on black.',
    variants: [
      {
        id: 'drift',
        name: 'DRIFT',
        note: 'Smooth fbm, evenly spaced. The calm one.',
        hero: CONTOUR_DRIFT,
      },
      {
        id: 'ridge',
        name: 'RIDGE',
        note: 'Ridged noise — crests instead of domes, plus slope shading where the lines crowd.',
        hero: CONTOUR_RIDGE,
      },
      {
        id: 'isobar',
        name: 'ISOBAR',
        note: 'Synoptic chart: pressure centres, wider bands, wind hatching where isobars bunch.',
        hero: CONTOUR_ISOBAR,
      },
    ],
  },
  {
    id: 'crosshatch',
    name: 'CROSSHATCH',
    tagline: 'Pen shading driven by one tonal field.',
    terminal: 'Angled neon rules, dense where the field is dark.',
    sketch: 'Native. This is how a pen actually shades — it starts here.',
    pivot:
      'The paper-first idea. Black mode is the inversion, not the default.',
    variants: [
      {
        id: 'pen',
        name: 'PEN',
        note: 'Three passes at fixed angles, gated on tone. Classic crosshatch.',
        hero: CROSSHATCH_PEN,
      },
      {
        id: 'etch',
        name: 'ETCH',
        note: 'Line engraving: one ruling whose strokes swell with tone, crossed only in the deepest darks.',
        hero: CROSSHATCH_ETCH,
      },
      {
        id: 'tooth',
        name: 'TOOTH',
        note: 'Strokes wander and break as a nib catches the paper, with a speckle in the untouched areas.',
        hero: CROSSHATCH_TOOTH,
      },
    ],
  },
  {
    id: 'synthwave',
    name: 'HORIZON',
    tagline: 'Perspective floor grid running to a ring on the horizon.',
    terminal:
      'Neon grid receding into black, ring blooming like a light source.',
    sketch: 'Drafting-paper perspective study — ruled ink lines, no glow.',
    pivot: 'The bloom. On paper it becomes a heavier ink stroke instead.',
    variants: only(SYNTHWAVE),
  },
  {
    id: 'dotmatrix',
    name: 'DOT_MATRIX',
    tagline: 'One image, sampled once per cell, drawn as dots.',
    terminal: 'Coarse square LED panel, each dot blooming.',
    sketch: 'Fine 45° print halftone — the screen a newspaper uses.',
    pivot:
      'The screen geometry itself: square and coarse against angled and fine.',
    variants: only(DOTMATRIX),
  },
  {
    id: 'scope',
    name: 'TRACE',
    tagline: 'Three waveforms over a graticule.',
    terminal: 'Oscilloscope phosphor, each trace smearing an afterglow.',
    sketch: 'Seismograph pen on tinted chart stock, complete with a wobble.',
    pivot:
      'Accent and ink swap roles: lit beam on a dim grid, ink pen on tinted paper.',
    variants: only(SCOPE),
  },
  {
    id: 'glyphrain',
    name: 'GLYPH_RAIN',
    tagline: 'Columns of hashed 5×6 bitmap glyphs falling.',
    terminal: 'Terminal rain, bright head, phosphor tail.',
    sketch: 'Typewriter strike — inked or not, no half-tones.',
    pivot: 'Continuous fade against a hard stamp threshold.',
    variants: only(GLYPHRAIN),
  },
];
