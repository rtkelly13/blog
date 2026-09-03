import { useId, useState } from 'react';
import BladeBody from './BladeBody';
import BladeSpine from './BladeSpine';
import { accentOf } from './bladeAccents';
import type { BladesProps } from './types';

/** Degrees a shut blade is folded away from the reader. */
const FOLD_ANGLE = 60;
/**
 * cos(60°) = 0.5 exactly, so a folded blade projects to half its width. That
 * is the whole reason the angle is 60 and not 58: the negative margin that
 * closes the gap left behind by the rotation is then a clean half of the
 * basis, rather than a number tuned by eye that drifts when the basis moves.
 */
const FOLD_BASIS_REM = 9;

/**
 * **Fold** — a concertina. Shut blades are hinged away from the reader on
 * their left edge, so you see them at an angle the way you see the panels of a
 * folding screen; the open one swings flat.
 *
 * The only variation that spends real depth, and so the only one whose sense
 * of "a stack you are looking into" survives without motion.
 */
export default function FoldBlades({
  blades,
  initialIndex = 0,
  openOnHover = true,
}: BladesProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();

  return (
    <div
      style={{ perspective: '1400px' }}
      className="flex h-full w-full overflow-hidden border-2 border-white bg-black"
    >
      {blades.map((blade, index) => {
        const open = index === active;
        const accent = accentOf(blade.accent);

        return (
          <div
            key={blade.id}
            style={{
              flexGrow: open ? 1 : 0,
              flexShrink: open ? 1 : 0,
              flexBasis: `${FOLD_BASIS_REM}rem`,
              marginRight: open ? 0 : `-${FOLD_BASIS_REM / 2}rem`,
              transform: `rotateY(${open ? 0 : FOLD_ANGLE}deg)`,
              // Shading, without a scrim. No single token darkens on the
              // terminal and lightens on paper, but fading a folded blade
              // toward whatever the ground is does both — and matches what
              // each material actually does at an angle: glass goes dim,
              // paper catches the light.
              opacity: open ? 1 : 0.72,
              transformOrigin: 'left center',
              zIndex: blades.length - index,
            }}
            className="relative flex min-w-0 border-r-2 border-white bg-zinc-900 transition-all duration-500 ease-out last:border-r-0"
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`}
            />

            <BladeSpine
              blade={blade}
              open={open}
              width="wide"
              controls={`${id}-${blade.id}`}
              onOpen={() => setActive(index)}
              onHover={openOnHover ? () => setActive(index) : undefined}
            />

            <div
              id={`${id}-${blade.id}`}
              className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-300 ${
                open ? 'opacity-100 delay-200' : 'pointer-events-none opacity-0'
              }`}
            >
              <div className="w-[16rem] max-w-full">
                <BladeBody blade={blade} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
