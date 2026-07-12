import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * Wraps content in `[ ... ]` for the brutalist heading style.
 *
 * Space Grotesk (the display font) draws square brackets centered on the em
 * box and taller than the caps, so a plain `[ TEXT ]` makes the brackets hang
 * below the letters' baseline and read as vertically misaligned. Nudging the
 * bracket glyphs up ~0.1em optically centers them on the cap height. The
 * offset is in `em`, so it scales with the heading's font size at every
 * breakpoint. Brackets are decorative, so they're hidden from screen readers.
 */
export default function BracketText({ children }: Props) {
  return (
    <>
      <span className="inline-block -translate-y-[0.1em]" aria-hidden="true">
        [
      </span>{' '}
      {children}{' '}
      <span className="inline-block -translate-y-[0.1em]" aria-hidden="true">
        ]
      </span>
    </>
  );
}
