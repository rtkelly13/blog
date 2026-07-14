import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react';
import type { IdeaSlideProps } from './IdeaSlide';

interface IdeaDeckProps {
  /** Deck heading shown in the frame's title bar. */
  title?: string;
  /** <IdeaSlide> children; anything else is ignored. */
  children: ReactNode;
}

/**
 * An embedded mini slide show for MDX (ideas workbench and posts). Keyboard
 * arrows, prev/next, and square progress dots — brutalist chrome, Motion
 * transitions. Loaded via next/dynamic in MDXComponents so pages that don't
 * use it ship none of it.
 */
export default function IdeaDeck({ title, children }: IdeaDeckProps) {
  const slides = Children.toArray(children).filter(
    (child): child is ReactElement<IdeaSlideProps> =>
      isValidElement<IdeaSlideProps>(child) &&
      typeof (child.props as IdeaSlideProps).title === 'string',
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();

  if (slides.length === 0) return null;
  const active = slides[Math.min(index, slides.length - 1)];

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    if (clamped === index) return;
    setDirection(clamped > index ? 1 : -1);
    setIndex(clamped);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  const distance = reduceMotion ? 0 : 48;

  return (
    // Arrow keys advance slides while focus is anywhere inside the deck (the
    // prev/next/dot buttons are the tab stops — no synthetic tabindex needed).
    <section
      aria-roledescription="carousel"
      aria-label={title ?? 'Slide deck'}
      className="not-prose my-6 border-2 border-white bg-zinc-900 font-mono"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-white bg-black px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-brutalist-yellow">
          [ {title ?? 'deck'} ]
        </p>
        <p className="text-xs text-zinc-400 tabular-nums">
          {index + 1} / {slides.length}
        </p>
      </div>

      <div className="px-5 py-4">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: direction * distance }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -distance }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <h3 className="mb-3 text-sm font-bold uppercase text-brutalist-cyan">
              {active.props.title}
            </h3>
            <div className="text-sm leading-6 text-zinc-200">{active}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-4 border-t-2 border-white bg-black px-4 py-2">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="border-2 border-white px-3 py-1 text-xs font-bold uppercase text-white transition-colors enabled:hover:bg-white enabled:hover:text-black disabled:opacity-30"
        >
          &lt; prev
        </button>
        <div className="flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.props.title}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${slide.props.title}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-3 w-3 border-2 border-white transition-colors ${
                i === index
                  ? 'bg-brutalist-cyan'
                  : 'bg-transparent hover:bg-zinc-600'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === slides.length - 1}
          className="border-2 border-white px-3 py-1 text-xs font-bold uppercase text-white transition-colors enabled:hover:bg-white enabled:hover:text-black disabled:opacity-30"
        >
          next &gt;
        </button>
      </div>
    </section>
  );
}
