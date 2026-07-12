import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * Wraps content in `[ ... ]` for the brutalist heading style.
 *
 * Space Grotesk (the display font) draws square brackets centered on the em
 * box and taller than the caps, so a plain `[ TEXT ]` makes the brackets hang
 * below the letters' baseline and read as vertically misaligned. The
 * `bracket-glyph` class (see css/tailwind.css) nudges them up ~0.1em to
 * optically center them on the caps — but only once Space Grotesk has loaded,
 * gated via the `data-display-font` flag DisplayFontFlag sets on <html>, since
 * the correction is specific to this font's metrics.
 *
 * Brackets are decorative, so they're hidden from screen readers.
 */
export default function BracketText({ children }: Props) {
  return (
    <>
      <span className="bracket-glyph" aria-hidden="true">
        [
      </span>{' '}
      {children}{' '}
      <span className="bracket-glyph" aria-hidden="true">
        ]
      </span>
    </>
  );
}
