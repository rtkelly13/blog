import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HERO_IDEAS,
  type HeroIdea,
  ShaderStage,
  type ShaderStatus,
} from '@/components/hero';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * Hero lab.
 *
 * Six generative hero ideas, each rendered so that the neon-terminal reading
 * and the sketch reading are visible *at the same time*, split by a divider you
 * can drag across the frame.
 *
 * That framing is the point. Judging a hero one theme at a time is how you end
 * up with a design that looks great on black and like a smudge on paper — the
 * two aesthetics here are meant to be equals, so the comparison has to be
 * simultaneous. One canvas draws both: the shader picks its palette *and its
 * shading model* per pixel from which side of the split it lands on.
 *
 * Costs and the case against a 3D engine: docs/hero-webgl-research.md.
 */

const CLAMP = (n: number) => Math.min(0.95, Math.max(0.05, n));

function useDragSplit(initial: number) {
  const [split, setSplit] = useState(initial);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fromClientX = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return CLAMP((clientX - rect.left) / rect.width);
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      const next = fromClientX(event.clientX);
      if (next !== null) setSplit(next);
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [fromClientX]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      draggingRef.current = true;
      const next = fromClientX(event.clientX);
      if (next !== null) setSplit(next);
    },
    [fromClientX],
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const step =
      event.key === 'ArrowLeft' ? -0.04 : event.key === 'ArrowRight' ? 0.04 : 0;
    if (step !== 0) {
      event.preventDefault();
      setSplit((s) => CLAMP(s + step));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setSplit(0.05);
    }
    if (event.key === 'End') {
      event.preventDefault();
      setSplit(0.95);
    }
  }, []);

  return { split, setSplit, frameRef, onPointerDown, onKeyDown };
}

function IdeaCard({ idea, index }: { idea: HeroIdea; index: number }) {
  // Stagger the openings so a page of cards does not read as one grid of
  // identical wipes.
  const { split, frameRef, onPointerDown, onKeyDown } = useDragSplit(
    0.42 + ((index * 0.07) % 0.18),
  );
  const [status, setStatus] = useState<ShaderStatus>('pending');
  const pct = `${(split * 100).toFixed(2)}%`;

  return (
    <section className="border-2 border-white bg-black">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-white px-4 py-3">
        <h2 className="font-display text-xl font-bold uppercase text-white">
          [ {idea.name} ]
        </h2>
        <p className="font-mono text-xs text-zinc-400">{idea.tagline}</p>
      </header>

      <div
        ref={frameRef}
        className="relative h-[42vh] min-h-[260px] w-full touch-none overflow-hidden select-none"
      >
        {/* Two backdrops, clipped to meet at the split. The theme classes carry
            the token remap, so everything inside each half — background, text,
            accents — is genuinely that theme rather than an approximation. */}
        <div
          className="dark absolute inset-0"
          style={{
            background: 'var(--brutalist-darkBg, #0a0a1a)',
            clipPath: `inset(0 ${100 - split * 100}% 0 0)`,
          }}
        />
        <div
          className="sketch absolute inset-0"
          style={{
            background: 'var(--brutalist-darkBg, #eceadf)',
            clipPath: `inset(0 0 0 ${pct})`,
          }}
        />

        <ShaderStage
          hero={idea.hero}
          mode="split"
          split={split}
          onStatus={setStatus}
          className="absolute inset-0 h-full w-full"
        />

        {/* The hero's own words, drawn twice and clipped to match, so the type
            is judged in the same breath as the background behind it. */}
        <div
          className="dark pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - split * 100}% 0 0)` }}
        >
          <HeroLockup />
          <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            terminal
          </span>
        </div>
        <div
          className="sketch pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${pct})` }}
        >
          <HeroLockup />
          <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            sketch
          </span>
        </div>

        {/* A full-height drag seam over a canvas; a range input cannot be
            shaped like this, so it carries the slider role by hand. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${idea.name}: terminal / sketch split`}
          aria-valuemin={5}
          aria-valuemax={95}
          aria-valuenow={Math.round(split * 100)}
          aria-valuetext={`${Math.round(split * 100)}% terminal`}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          className="absolute inset-y-0 z-10 w-8 -translate-x-1/2 cursor-ew-resize focus:outline-none"
          style={{ left: pct }}
        >
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white mix-blend-difference" />
          <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-black" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[11px] leading-none text-white">
            {'<>'}
          </span>
        </div>

        {status === 'unsupported' && (
          <p className="absolute bottom-3 left-3 font-mono text-xs text-brutalist-yellow">
            {'>'} no webgl2 — a shipped hero falls back to CSS here
          </p>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-2 px-4 py-4 font-mono text-sm sm:grid-cols-3">
        <Reading term="ON BLACK" value={idea.terminal} />
        <Reading term="ON PAPER" value={idea.sketch} />
        <Reading term="WHAT FLIPS" value={idea.pivot} accent />
      </dl>
    </section>
  );
}

function Reading({
  term,
  value,
  accent,
}: {
  term: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt
        className={`text-xs uppercase tracking-widest ${accent ? 'text-brutalist-yellow' : 'text-brutalist-cyan'}`}
      >
        {term}
      </dt>
      <dd className="mt-1 text-zinc-400">{value}</dd>
    </div>
  );
}

function HeroLockup() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <p className="font-display text-3xl font-bold uppercase text-white md:text-5xl">
        RYAN KELLY
      </p>
      <p className="mt-2 font-mono text-xs text-brutalist-cyan md:text-sm">
        FULL_STACK_ENGINEER.exe
      </p>
    </div>
  );
}

export default function HeroLab() {
  return (
    <>
      <PageSEO
        title={`Hero Lab - ${siteMetadata.author}`}
        description="Generative hero ideas, each judged in neon-terminal and sketch at the same time"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="HERO_LAB"
          subtitle="Generative hero ideas, both themes at once — drag the seam"
        />

        <div className="container space-y-10 py-12">
          <div className="border-2 border-brutalist-cyan bg-zinc-900 p-6">
            <p className="font-mono text-sm leading-relaxed text-white">
              {'>'} Every frame below is <strong>one</strong> canvas. The shader
              picks its palette and its shading model per pixel, from which side
              of the seam that pixel lands on — left is neon-terminal, right is
              sketch.
            </p>
            <p className="mt-3 font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} Drag the seam (or focus it and use ←/→) to slide one theme
              over the other.
              <br />
              {'>'} Colours are measured off real elements carrying the{' '}
              <span className="text-white">.dark</span> and{' '}
              <span className="text-white">.sketch</span> classes, so these are
              the actual design-system tokens, not approximations of them.
              <br />
              {'>'} Reduced motion draws one still frame with no animation loop;
              each canvas parks itself when scrolled out of view.
              <br />
              {'>'} Weights and the case against a 3D engine live in{' '}
              <Link
                href="https://github.com/rtkelly13/blog/blob/main/docs/hero-webgl-research.md"
                className="text-brutalist-cyan"
              >
                docs/hero-webgl-research.md
              </Link>
              ; the single-hero prototype is at{' '}
              <Link
                href="/design-sandbox/webgl-heroes"
                className="text-brutalist-cyan"
              >
                webgl-heroes
              </Link>
              .
            </p>
          </div>

          {HERO_IDEAS.map((idea, index) => (
            <IdeaCard key={idea.id} idea={idea} index={index} />
          ))}

          <div className="border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h2 className="mb-4 font-display text-xl font-bold uppercase text-brutalist-yellow">
              [ THE_RULE_THESE_TEST ]
            </h2>
            <p className="font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} Recolouring is not theming. A glow is <em>added light</em>,
              and added light on paper reads as a thumbprint — so every idea
              here swaps its shading model at the seam, not just its palette:
              bloom becomes ink weight, a continuous fade becomes a hard stamp,
              a coarse LED screen becomes a fine 45° halftone.
              <br />
              {'>'} An idea that only survives on black is a failed idea for
              this site, however good it looks there. Drag the seam past the
              middle and see which ones hold.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
