import { useEffect, useRef, useState } from 'react';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * WebGL hero research prototype.
 *
 * The question this page exists to answer: does the homepage hero want a 3D
 * engine (three.js / react-three-fiber), or does the look it actually has —
 * a perspective grid and a glowing ring — come out of one fragment shader for
 * a fraction of the bytes? Measurements and the verdict live in
 * docs/hero-webgl-research.md; this page is the working end of it.
 *
 * The prototype deliberately carries the production-shaped concerns rather
 * than just the pretty part, because those are what the comparison turns on:
 * design-system tokens read at runtime (so dark / dim / sketch all work), a
 * reduced-motion path that renders one still frame, pausing when off-screen or
 * backgrounded, DPR-aware resize, and a CSS fallback when WebGL is missing or
 * the context is lost.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/**
 * Grid + horizon glow + ring, all procedural. Colours arrive as uniforms so the
 * shader never hardcodes the palette — the theme owns it.
 */
const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uGrid;
uniform vec3  uRing;
uniform float uMotion;   // 1 = animated, 0 = reduced motion (still frame)
uniform float uInk;      // 0 = glow on a dark surface, 1 = ink on paper

out vec4 outColor;

// Perspective floor grid: project screen space onto a plane below the horizon,
// then draw anti-aliased lines with derivative-based width so the lines stay
// one pixel wide as they recede instead of aliasing into noise.
float floorGrid(vec2 uv, float t) {
  float horizon = uv.y + 0.16;
  if (horizon >= -0.001) return 0.0;

  vec2 plane = vec2(uv.x / -horizon, (0.5 / -horizon) + t * 0.25);
  vec2 cell = abs(fract(plane) - 0.5);
  vec2 w = fwidth(plane);
  vec2 line = smoothstep(w * 1.5, vec2(0.0), cell);
  float g = max(line.x, line.y);

  // Fade the far field so the grid dissolves into the background.
  return g * smoothstep(0.0, 0.22, -horizon);
}

// On a dark surface the ring is a light source, so it blooms. On paper a bloom
// reads as a smudge — there the ring becomes a weightier ink stroke instead.
float ring(vec2 uv, float pulse, float ink) {
  float d = abs(length(uv * vec2(1.0, 1.25)) - 0.30);
  float core = smoothstep(mix(0.010, 0.016, ink), 0.002, d);
  float glow = smoothstep(0.180, 0.0, d) * 0.35 * (1.0 - ink);
  return core + glow * pulse;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * uMotion;

  float g = floorGrid(uv, t) * mix(0.55, 0.75, uInk);
  float pulse = 0.75 + 0.25 * sin(t * 1.2);
  float r = ring(uv, pulse, uInk);

  // A soft band of light sitting on the horizon line, tying grid to ring —
  // light only, so paper gets none of it.
  float horizonGlow =
    smoothstep(0.12, 0.0, abs(uv.y + 0.16)) * 0.25 * (1.0 - uInk);

  vec3 col = uGrid * (g + horizonGlow) + uRing * r;
  float alpha = clamp(g + horizonGlow + r, 0.0, 1.0);
  outColor = vec4(col * alpha, alpha);
}`;

/**
 * Turn a computed CSS colour into 0..1 RGB, dropping alpha — the shader owns
 * opacity. Browsers do not hand these back in the form the stylesheet wrote
 * them: `rgba(35, 38, 46, 0.14)` comes out of `getComputedStyle` as the
 * 8-digit hex `#23262e24`, so every notation has to be handled or the token
 * silently falls through to the fallback.
 */
function readColor(value: string, fallback: [number, number, number]) {
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
    ) as [number, number, number];
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
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255] as [
        number,
        number,
        number,
      ];
    }
  }
  return fallback;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Compile, link and activate the shader pair. Returns null on any failure so
 * the caller can drop straight to the CSS fallback.
 */
function createProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
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

type Status = 'pending' | 'running' | 'still' | 'unsupported';

function useShaderHero(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [status, setStatus] = useState<Status>('pending');

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

    const built = createProgram(gl);
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

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uGrid = gl.getUniformLocation(program, 'uGrid');
    const uRing = gl.getUniformLocation(program, 'uRing');
    const uMotion = gl.getUniformLocation(program, 'uMotion');
    const uInk = gl.getUniformLocation(program, 'uInk');

    // The design system owns the palette: read the same custom properties
    // CyberHero uses, and re-read them when the theme class flips.
    // The dark themes deliberately leave --hero-* unset and lean on the inline
    // fallbacks (CyberHero does the same); sketch is the mode that overrides
    // them. So the fallbacks below are the neon palette, not a safety net.
    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      const grid = readColor(
        styles.getPropertyValue('--hero-grid-strong'),
        [0.22, 1.0, 0.08],
      );
      const ring = readColor(
        styles.getPropertyValue('--hero-ring'),
        [0.53, 0.94, 0.68],
      );
      const bg = readColor(
        styles.getPropertyValue('--brutalist-darkBg'),
        [0.04, 0.04, 0.04],
      );
      gl.uniform3f(uGrid, grid[0], grid[1], grid[2]);
      gl.uniform3f(uRing, ring[0], ring[1], ring[2]);
      // Sketch mode remaps the hero background to paper. Glow is a dark-surface
      // idiom, so the luminance of that token decides which one we draw.
      const luminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
      gl.uniform1f(uInk, luminance > 0.5 ? 1 : 0);
    };
    applyTheme();

    const themeObserver = new MutationObserver(applyTheme);
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

    // Idle when scrolled away or the tab is backgrounded — a hero that keeps a
    // GPU busy below the fold is the main reason WebGL heroes get a bad name.
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
  }, [canvasRef]);

  return status;
}

/**
 * The CSS backdrop that shows through when WebGL is unavailable — and that the
 * shader composites over the rest of the time, so the two never disagree about
 * the background colour.
 */
function HeroBackdrop({ flat }: { flat: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: 'var(--brutalist-darkBg, #0a0a0a)',
        backgroundImage: flat
          ? `linear-gradient(to right, var(--hero-grid, rgba(57,255,20,0.1)) 1px, transparent 1px),
             linear-gradient(to bottom, var(--hero-grid, rgba(57,255,20,0.1)) 1px, transparent 1px)`
          : undefined,
        backgroundSize: flat ? '50px 50px' : undefined,
      }}
    />
  );
}

function ShaderHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const status = useShaderHero(canvasRef);

  return (
    <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden border-2 border-white">
      <HeroBackdrop flat={status === 'unsupported'} />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ display: status === 'unsupported' ? 'none' : 'block' }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl font-bold uppercase text-white md:text-6xl">
          RYAN KELLY
        </h2>
        <p className="mt-3 font-mono text-sm text-brutalist-cyan md:text-base">
          FULL_STACK_ENGINEER.exe
        </p>
      </div>
      <p className="absolute bottom-3 left-3 font-mono text-xs text-zinc-400">
        {'>'} renderer: {STATUS_LABEL[status]}
      </p>
    </div>
  );
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'starting…',
  running: 'webgl2 · animating',
  still: 'webgl2 · reduced-motion still frame',
  unsupported: 'css fallback (no webgl2)',
};

/**
 * Measured on this repo at three@0.185.1 / @react-three/fiber@9.7.0 /
 * ogl@1.0.11 — esbuild, minified, gzipped, react + react-dom external.
 * Method and caveats: docs/hero-webgl-research.md.
 */
const COSTS: { approach: string; gzip: string; note: string }[] = [
  {
    approach: 'raw WebGL2 (this page)',
    gzip: '0.8 KB',
    note: 'One fragment shader. No dependency, no lazy chunk worth splitting.',
  },
  {
    approach: 'ogl',
    gzip: '13.0 KB',
    note: 'Thin WebGL wrapper. Worth it once there is real geometry to manage.',
  },
  {
    approach: 'three.js',
    gzip: '129.6 KB',
    note: 'A minimal scene still pulls the core renderer; it barely tree-shakes.',
  },
  {
    approach: 'react-three-fiber + three',
    gzip: '237.9 KB',
    note: 'Adds its own reconciler on top of three. Pays off with scene graphs, not backdrops.',
  },
];

export default function WebglHeroes() {
  return (
    <>
      <PageSEO
        title={`WebGL Heroes - ${siteMetadata.author}`}
        description="Shader-driven hero prototype, and what a 3D engine would cost instead"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="WEBGL_HEROES"
          subtitle="Shader-driven hero prototype, and what a 3D engine would cost instead"
        />

        <div className="container py-12">
          <ShaderHero />

          <div className="mt-8 border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h3 className="mb-4 font-display text-xl font-bold uppercase text-brutalist-yellow">
              [ WHAT_IT_COSTS ]
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="text-left text-zinc-400">
                    <th className="py-2 pr-4 font-normal">APPROACH</th>
                    <th className="py-2 pr-4 font-normal">GZIP</th>
                    <th className="py-2 font-normal">NOTE</th>
                  </tr>
                </thead>
                <tbody>
                  {COSTS.map((row) => (
                    <tr
                      key={row.approach}
                      className="border-t border-zinc-700 align-top"
                    >
                      <td className="py-2 pr-4 text-white">{row.approach}</td>
                      <td className="py-2 pr-4 text-brutalist-cyan">
                        {row.gzip}
                      </td>
                      <td className="py-2 text-zinc-400">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} The homepage ships ~230 KB gzip of JS today, so three.js is
              a 56% increase for a backdrop.
              <br />
              {'>'} Full method, per-theme behaviour, and the case for picking
              three.js anyway live in{' '}
              <Link
                href="https://github.com/rtkelly13/blog/blob/main/docs/hero-webgl-research.md"
                className="text-brutalist-cyan"
              >
                docs/hero-webgl-research.md
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 border-2 border-white bg-zinc-900 p-6">
            <h3 className="mb-4 font-display text-xl font-bold uppercase text-white">
              [ TRY_IT ]
            </h3>
            <p className="font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} Cycle the theme (HIGH → DIM → SKETCH) — the shader reads the
              same <span className="text-white">--hero-*</span> tokens CyberHero
              does, so the palette follows.
              <br />
              {'>'} Turn on reduced motion — the loop stops and one still frame
              is drawn.
              <br />
              {'>'} Scroll it out of view or background the tab — the render
              loop parks itself.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
