import { useEffect, useRef, useState } from 'react';

/**
 * The shared harness every hero idea in the lab runs on.
 *
 * An idea supplies one function — `vec4 hero(vec2 uv, float t, Theme th)` —
 * and this component supplies everything around it: the GL context, the
 * full-screen triangle, DPR-aware sizing, the clock, and the two design-system
 * palettes handed in as uniforms.
 *
 * The interesting part is `mode`:
 *
 * - `split` renders **both** themes in one pass. `uSplit` is an x position in
 *   0..1; pixels left of it get the neon-terminal palette with `ink = 0`,
 *   pixels right of it get the sketch palette with `ink = 1`. One canvas, one
 *   context, both readings side by side — which is the whole point of the lab.
 * - `follow` renders whichever theme the page is actually in, the way a shipped
 *   hero would.
 *
 * Both palettes are measured off real DOM probes carrying the `.dark` and
 * `.sketch` classes, so the shaders never hardcode a colour: whatever
 * `css/tailwind.css` says those themes are is what reaches the GPU.
 */

export type ShaderStatus = 'pending' | 'running' | 'still' | 'unsupported';

type Rgb = [number, number, number];

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/**
 * Uniforms, helpers and the `Theme` struct every idea can rely on. Concatenated
 * ahead of the idea's own source, so an idea is just its `hero()`.
 */
export const SHADER_PRELUDE = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uMotion;   // 1 = animated, 0 = reduced motion (still frame)
uniform float uSplit;    // x split in 0..1; left = terminal, right = paper
uniform vec3  uTermGrid;
uniform vec3  uTermRing;
uniform vec3  uTermBg;
uniform vec3  uPaperGrid;
uniform vec3  uPaperRing;
uniform vec3  uPaperBg;

out vec4 outColor;

// grid/ring are the --hero-* tokens; ink is 0 on a lit surface, 1 on paper.
struct Theme {
  vec3  grid;
  vec3  ring;
  vec3  bg;
  float ink;
};

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

uint hashU(uvec2 p) {
  uint h = p.x * 374761393u + p.y * 668265263u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  return h ^ (h >> 16u);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * valueNoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// Anti-aliased stroke around v == 0, one pixel wide times \`weight\`.
float stroke(float v, float weight) {
  return 1.0 - smoothstep(0.0, fwidth(v) * weight + 1e-6, abs(v));
}

// Ruled lines every whole unit of v. The width comes from fwidth(v) rather
// than fwidth(fract(v)) — the derivative of a sawtooth explodes at the wrap,
// which is what puts a row of dark dots through a naive hatch.
float ruled(float v, float weight) {
  float w = fwidth(v) * weight + 1e-6;
  return 1.0 - smoothstep(0.0, w, abs(fract(v) - 0.5));
}
`;

/**
 * `hero()` returns **premultiplied** colour — rgb already scaled by coverage —
 * so ideas can just add their layers together and hand back the total.
 */
export const SHADER_POSTLUDE = `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * uMotion;

  // No branch: the side selector is mixed into the theme, keeping the whole
  // shader in uniform control flow so fwidth() stays well defined.
  float side = step(uSplit * uRes.x, gl_FragCoord.x);
  Theme th;
  th.grid = mix(uTermGrid, uPaperGrid, side);
  th.ring = mix(uTermRing, uPaperRing, side);
  th.bg = mix(uTermBg, uPaperBg, side);
  th.ink = side;

  outColor = hero(uv, t, th);
}`;

/**
 * Turn a computed CSS colour into 0..1 RGB, dropping alpha — the shader owns
 * opacity. Browsers do not hand these back in the form the stylesheet wrote
 * them: `rgba(35, 38, 46, 0.14)` comes out of `getComputedStyle` as the
 * 8-digit hex `#23262e24`, so every notation has to be handled or the token
 * silently falls through to the fallback.
 */
export function readColor(value: string, fallback: Rgb): Rgb {
  const hex = value.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1];
    const full =
      h.length <= 4
        ? h
            .slice(0, 3)
            .split('')
            .map((c) => c + c)
            .join('')
        : h.slice(0, 6);
    return [0, 2, 4].map(
      (i) => Number.parseInt(full.slice(i, i + 2), 16) / 255,
    ) as Rgb;
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    if (
      parts.length >= 3 &&
      parts.slice(0, 3).every((n) => Number.isFinite(n))
    ) {
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    }
  }
  return fallback;
}

// The neon values live as inline var() fallbacks rather than in the .dark
// block (CyberHero does the same), so these are the palette, not a safety net.
const NEON_GRID: Rgb = [0.22, 1.0, 0.08];
const NEON_RING: Rgb = [0.53, 0.94, 0.68];
const NEON_BG: Rgb = [0.04, 0.04, 0.1];

function readPalette(el: Element) {
  const styles = getComputedStyle(el);
  return {
    grid: readColor(styles.getPropertyValue('--hero-grid-strong'), NEON_GRID),
    ring: readColor(styles.getPropertyValue('--hero-ring'), NEON_RING),
    bg: readColor(styles.getPropertyValue('--brutalist-darkBg'), NEON_BG),
  };
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Compile, link and activate the pair; null on any failure, so the caller
 *  can drop straight to the CSS fallback. */
function createProgram(gl: WebGL2RenderingContext, frag: string) {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!program || !vs || !fs) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL call, not a React hook
  gl.useProgram(program);
  return { program, vs, fs };
}

type Props = {
  /** The idea's source: a single `vec4 hero(vec2 uv, float t, Theme th)`. */
  hero: string;
  mode?: 'split' | 'follow';
  /** Split position in 0..1. Ignored in `follow` mode. */
  split?: number;
  className?: string;
  onStatus?: (status: ShaderStatus) => void;
};

export default function ShaderStage({
  hero,
  mode = 'split',
  split = 0.5,
  className,
  onStatus,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const termProbe = useRef<HTMLDivElement>(null);
  const paperProbe = useRef<HTMLDivElement>(null);
  const splitRef = useRef(split);
  const setSplitUniform = useRef<((value: number) => void) | null>(null);
  const [status, setStatus] = useState<ShaderStatus>('pending');

  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  // Push split changes straight at the uniform: re-running the whole GL setup
  // on every drag frame would rebuild the program sixty times a second.
  useEffect(() => {
    splitRef.current = split;
    setSplitUniform.current?.(split);
  }, [split]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      setStatus('unsupported');
      return;
    }

    const built = createProgram(gl, SHADER_PRELUDE + hero + SHADER_POSTLUDE);
    if (!built) {
      setStatus('unsupported');
      return;
    }
    const { program, vs, fs } = built;

    // One full-screen triangle — cheaper than a quad and needs no index buffer.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const loc = (name: string) => gl.getUniformLocation(program, name);
    const uRes = loc('uRes');
    const uTime = loc('uTime');
    const uMotion = loc('uMotion');
    const uSplit = loc('uSplit');
    const uTermGrid = loc('uTermGrid');
    const uTermRing = loc('uTermRing');
    const uTermBg = loc('uTermBg');
    const uPaperGrid = loc('uPaperGrid');
    const uPaperRing = loc('uPaperRing');
    const uPaperBg = loc('uPaperBg');

    const applySplit = (value: number) => {
      // follow mode has no seam: park the split off-canvas so every pixel lands
      // on one side, and let the page's own theme decide which side that is.
      if (mode === 'split') {
        gl.uniform1f(uSplit, value);
        return;
      }
      const bg = readPalette(document.documentElement).bg;
      const luminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
      gl.uniform1f(uSplit, luminance > 0.5 ? -1 : 2);
    };

    const applyPalettes = () => {
      const term =
        mode === 'split' && termProbe.current
          ? readPalette(termProbe.current)
          : readPalette(document.documentElement);
      const paper =
        mode === 'split' && paperProbe.current
          ? readPalette(paperProbe.current)
          : term;
      gl.uniform3fv(uTermGrid, term.grid);
      gl.uniform3fv(uTermRing, term.ring);
      gl.uniform3fv(uTermBg, term.bg);
      gl.uniform3fv(uPaperGrid, paper.grid);
      gl.uniform3fv(uPaperRing, paper.ring);
      gl.uniform3fv(uPaperBg, paper.bg);
      applySplit(splitRef.current);
    };
    applyPalettes();
    setSplitUniform.current = applySplit;

    const themeObserver = new MutationObserver(applyPalettes);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let visible = true;
    let start = performance.now();

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const loop = (now: number) => {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    const sync = () => {
      stop();
      if (motionQuery.matches) {
        // Reduced motion: one still frame, no clock, no rAF at all.
        gl.uniform1f(uMotion, 0);
        draw(0);
        setStatus('still');
        return;
      }
      gl.uniform1f(uMotion, 1);
      setStatus('running');
      if (!visible || document.hidden) {
        draw((performance.now() - start) / 1000);
        return;
      }
      start = performance.now();
      raf = requestAnimationFrame(loop);
    };

    // Idle when scrolled away or backgrounded — a gallery of heroes all
    // spinning the GPU at once is exactly how this gets a bad reputation.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setStatus('unsupported');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    sync();

    return () => {
      stop();
      setSplitUniform.current = null;
      themeObserver.disconnect();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', sync);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [hero, mode]);

  return (
    <>
      {/* Palette probes: real elements carrying the theme classes, so the
          shaders read whatever the stylesheet currently says those themes are. */}
      <div
        ref={termProbe}
        className="dark"
        aria-hidden
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
        }}
      />
      <div
        ref={paperProbe}
        className="sketch"
        aria-hidden
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={className}
        style={{ display: status === 'unsupported' ? 'none' : 'block' }}
      />
    </>
  );
}
