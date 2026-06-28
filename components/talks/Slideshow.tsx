import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import Slide from './Slide';

interface SlideshowProps {
  slides: string[];
  frontMatter: TalkFrontMatter;
}

export default function Slideshow({ slides, frontMatter }: SlideshowProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const total = slides.length;

  const goTo = useCallback(
    (index: number) => {
      setCurrent((prev) => {
        const next = Math.min(Math.max(index, 0), total - 1);
        return Number.isNaN(next) ? prev : next;
      });
    },
    [total],
  );

  const goNext = useCallback(
    () => setCurrent((prev) => Math.min(prev + 1, total - 1)),
    [total],
  );
  const goPrev = useCallback(
    () => setCurrent((prev) => Math.max(prev - 1, 0)),
    [],
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  const exit = useCallback(() => {
    router.push(`/talks/${frontMatter.slug}`);
  }, [router, frontMatter.slug]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(total - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            exit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, goTo, toggleFullscreen, exit, total]);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col bg-black text-white"
    >
      {/* Progress bar */}
      <div className="h-2 w-full bg-zinc-900 border-b-2 border-white">
        <div
          className="h-full bg-brutalist-cyan transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto p-8 md:p-16">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={goPrev}
          disabled={current === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-6 font-mono text-2xl font-bold text-white hover:text-brutalist-cyan disabled:opacity-20 disabled:hover:text-white"
        >
          &lt;
        </button>

        <div className="mx-auto w-full max-w-5xl">
          <Slide key={current} code={slides[current]} />
        </div>

        <button
          type="button"
          aria-label="Next slide"
          onClick={goNext}
          disabled={current === total - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-6 font-mono text-2xl font-bold text-white hover:text-brutalist-cyan disabled:opacity-20 disabled:hover:text-white"
        >
          &gt;
        </button>
      </div>

      {/* Chrome */}
      <div className="slideshow-chrome flex items-center justify-between gap-4 border-t-2 border-white bg-zinc-900 px-4 py-2 font-mono text-xs uppercase">
        <div className="flex items-center gap-3">
          <Link
            href={`/talks/${frontMatter.slug}`}
            className="font-bold text-brutalist-pink hover:text-brutalist-cyan"
          >
            &gt; EXIT
          </Link>
          <span className="hidden truncate text-zinc-400 sm:inline">
            {frontMatter.title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-bold text-brutalist-yellow">
            {current + 1} / {total}
          </span>
          <Link
            href={`/talks/${frontMatter.slug}/present?pdf=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brutalist-cyan hover:text-brutalist-pink"
          >
            PDF
          </Link>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="font-bold text-brutalist-cyan hover:text-brutalist-pink"
          >
            {isFullscreen ? 'EXIT_FS' : 'FULLSCREEN'}
          </button>
        </div>
      </div>
    </div>
  );
}
