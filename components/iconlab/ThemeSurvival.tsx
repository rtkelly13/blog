import { Lightbulb, Presentation, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import { BAKED_FILL_SPECIMEN } from './packs';

/**
 * Forces a theme on a subtree by carrying the theme class, the same trick the
 * component library uses: `.sketch` re-points the colour tokens, so `bg-black`
 * inside resolves to paper and `text-brutalist-cyan` to blue pen.
 */
function ThemePanel({
  theme,
  label,
  children,
}: {
  theme: 'dark' | 'sketch';
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`${theme} border-2 border-white bg-black`}>
      <div className="border-b-2 border-white bg-zinc-900 px-3 py-1.5">
        <span className="font-mono text-xs font-bold uppercase text-zinc-400">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-6 p-6">{children}</div>
    </div>
  );
}

function Specimens() {
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <Presentation
          className="h-10 w-10 text-brutalist-cyan"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <span className="font-mono text-[9px] uppercase text-zinc-400">
          currentColor
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Lightbulb
          className="h-10 w-10 text-brutalist-yellow"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <span className="font-mono text-[9px] uppercase text-zinc-400">
          currentColor
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Tags
          className="h-10 w-10 text-brutalist-pink"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <span className="font-mono text-[9px] uppercase text-zinc-400">
          currentColor
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <svg
          role="img"
          aria-label="A pack that bakes its fill colour"
          viewBox={BAKED_FILL_SPECIMEN.viewBox}
          width={40}
          height={40}
          fill={BAKED_FILL_SPECIMEN.fill}
        >
          <path d={BAKED_FILL_SPECIMEN.path} />
        </svg>
        <span className="font-mono text-[9px] uppercase text-brutalist-pink">
          baked #0D0D0D
        </span>
      </div>
    </>
  );
}

/**
 * The first hard constraint, demonstrated: three token-tinted icons and one
 * published with a baked hex fill, rendered in both first-class themes.
 */
export default function ThemeSurvival() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ThemePanel theme="dark" label="dark · neon terminal">
          <Specimens />
        </ThemePanel>
        <ThemePanel theme="sketch" label="sketch · paper & ink">
          <Specimens />
        </ThemePanel>
      </div>
      <p className="max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-pink">&gt;</span> The three tinted icons
        follow the tokens across the flip. The fourth — real published path data
        from a pack that bakes <code>#0D0D0D</code> into its raw SVG — is
        near-invisible on black and stays ink-coloured on paper. That is the
        failure mode the currentColor constraint exists to prevent — and the
        reason a pack is disqualified here on how it ships its colour, before
        anyone counts its icons.
      </p>
    </div>
  );
}
