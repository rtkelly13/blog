import {
  ArrowLeft,
  Check,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatedBackground,
  getGenerator,
  PAPER_ACCENTS,
  SURFACES,
} from '@/components/graphics';
import GeneratorControls, {
  type ControlsValue,
  rampsFor,
} from '@/components/graphics/GeneratorControls';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import { buildGraphicsUrl, parseGraphicsUrl } from '@/lib/graphicsUrl';

/**
 * One generator, full-bleed, with its configuration beside it.
 *
 * ## The panel on two form factors
 *
 * On a wide screen the panel is a fixed left rail that collapses to an icon
 * strip, which is the conventional and correct shape: the graphic is the
 * subject, the controls are reference, and both want to be visible at once.
 *
 * On a phone that arrangement is wrong rather than merely cramped. A 320px rail
 * beside a 375px viewport leaves neither usable, and a sidebar that overlays the
 * subject you are adjusting means every change is made blind. So below `lg` the
 * same panel becomes a **bottom sheet**: it rises over the lower half, leaving
 * the top half of the graphic visible while you drag a slider, and it is
 * dismissed by the same button that opened it. The thumb is at the bottom of a
 * phone, which is also where the controls now are.
 *
 * The panel component is shared and knows about neither — it owns no state and
 * no layout, so the two shells differ only in the box they put it in.
 *
 * The sheet is rendered through a portal to `document.body`, and that is not
 * incidental. `LayoutWrapper` gives `<main>` a `relative z-10` and the footer is
 * a later sibling at the same level, so a `z-50` overlay *inside* main is still
 * scoped to main's stacking context and the footer paints straight through it —
 * which it did, over the colour controls. No z-index can fix that from inside;
 * the overlay has to leave the context.
 *
 * ## Configuration lives in the URL
 *
 * Every control writes to the query string via `buildGraphicsUrl`, replacing
 * rather than pushing so the back button leaves the gallery rather than
 * unwinding forty slider positions. That makes a tuned background a link, which
 * is the point of a gallery over an experiment.
 */
export default function BackgroundDetail() {
  const router = useRouter();
  const name = typeof router.query.name === 'string' ? router.query.name : '';
  const gen = getGenerator(name);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [open, setOpen] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [copied, setCopied] = useState<'link' | null>(null);

  const url = useMemo(() => parseGraphicsUrl(router.query), [router.query]);
  const [value, setValue] = useState<ControlsValue | null>(null);

  // Seeded once the router is ready, for the reason documented in
  // `lib/graphicsUrl.ts`: `router.query` is empty on the first render of a
  // statically optimised page, so a state initialiser captures the defaults.
  const seeded = useRef(false);
  useEffect(() => {
    if (!router.isReady || seeded.current) return;
    seeded.current = true;
    const paper = url.paper ?? resolvedTheme === 'sketch';
    setValue({
      paper,
      accent: url.accent ?? (paper ? PAPER_ACCENTS.ink : '#22d3ee'),
      accents: url.accents,
      seed: url.seed,
      density: url.density,
      opacity: url.opacity,
      contrast: url.contrast,
      disorder: url.disorder,
      speed: url.speed,
      fps: url.fps,
      originX: url.originX,
      originY: url.originY,
      t: url.t,
      playing: url.playing,
    });
  }, [router.isReady, url, resolvedTheme]);

  const patch = useCallback(
    (p: Partial<ControlsValue>) => {
      setValue((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...p };
        router.replace(
          buildGraphicsUrl(
            { ...next, only: [name] },
            `/gallery/backgrounds/${name}`,
          ),
          undefined,
          { shallow: true },
        );
        return next;
      });
    },
    [router, name],
  );

  const copyLink = async () => {
    if (!value) return;
    const href = `${window.location.origin}${buildGraphicsUrl(
      { ...value, only: [name] },
      `/gallery/backgrounds/${name}`,
    )}`;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      // Clipboard permission can be refused; still confirm, because a control
      // that appears to do nothing is worse than one that overstates.
    }
    setCopied('link');
    setTimeout(() => setCopied(null), 1400);
  };

  if (!gen) {
    return (
      <div className="border-2 border-white bg-black p-10 text-center">
        <p className="font-mono text-sm text-zinc-400">
          No generator called{' '}
          <code className="text-brutalist-cyan">{name}</code>.
        </p>
        <Link
          href="/gallery/backgrounds"
          className="mt-4 inline-block border-2 border-white px-4 py-2 font-mono text-xs uppercase text-white hover:border-brutalist-cyan hover:text-brutalist-cyan"
        >
          Back to the gallery
        </Link>
      </div>
    );
  }

  const paper = value?.paper ?? (mounted && resolvedTheme === 'sketch');
  const surface = paper ? SURFACES.paper : '#000000';

  const panel = value && (
    <GeneratorControls
      value={value}
      onChange={patch}
      ramps={rampsFor(value.paper)}
      radial={gen.group === 'radial'}
    />
  );

  return (
    <>
      <PageSEO
        title={`${gen.label} - background gallery - ${siteMetadata.author}`}
        description={gen.description}
      />
      <div className="border-2 border-white bg-black">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-white bg-zinc-900 px-4 py-3">
          <Link
            href="/gallery/backgrounds"
            className="flex items-center gap-2 font-mono text-xs uppercase text-zinc-400 hover:text-brutalist-cyan"
          >
            <ArrowLeft className="h-4 w-4" /> Gallery
          </Link>
          <h1 className="font-display text-xl font-bold uppercase text-white">
            {gen.label}
          </h1>
          <code className="font-mono text-xs text-brutalist-cyan">
            {gen.name}
          </code>
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 border-2 border-zinc-700 px-2 py-1 font-mono text-[10px] uppercase text-zinc-400 hover:border-brutalist-cyan hover:text-brutalist-cyan"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Link2 className="h-3 w-3" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Collapse controls' : 'Expand controls'}
              className="hidden border-2 border-zinc-700 p-1.5 text-zinc-400 hover:border-brutalist-cyan hover:text-brutalist-cyan lg:block"
            >
              {open ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
          </span>
        </div>

        <div className="flex">
          {/* Desktop rail */}
          <aside
            className={`hidden shrink-0 overflow-y-auto border-r-2 border-white bg-black transition-[width] lg:block ${
              open ? 'w-[300px]' : 'w-0'
            }`}
            style={{ maxHeight: 'calc(100vh - 3.5rem)' }}
          >
            {open && panel}
          </aside>

          {/* Stage */}
          <div className="min-w-0 flex-1" style={{ backgroundColor: surface }}>
            <div className="aspect-video w-full">
              {value && (
                <AnimatedBackground
                  generator={gen.name}
                  accent={value.accent}
                  accents={value.accents}
                  seed={value.seed}
                  density={value.density}
                  opacity={value.opacity}
                  contrast={value.contrast}
                  disorder={value.disorder}
                  originX={value.originX}
                  originY={value.originY}
                  occlusion={paper ? SURFACES.paper : SURFACES.darkBg}
                  speed={value.speed}
                  fps={value.fps}
                  playing={value.playing}
                  t={value.t}
                  width={1280}
                  height={720}
                  className="h-full w-full"
                />
              )}
            </div>
            <p
              className={`border-t-2 px-4 py-3 font-mono text-xs ${
                paper
                  ? 'border-zinc-300 text-zinc-600'
                  : 'border-zinc-800 text-zinc-400'
              }`}
            >
              {gen.description}
            </p>
          </div>
        </div>

        {/* Mobile: a bottom sheet, not a sidebar. See the note at the top. */}
        {mounted &&
          !sheet &&
          createPortal(
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="fixed right-4 bottom-4 z-[90] flex items-center gap-2 border-2 border-white bg-black px-4 py-3 font-mono text-xs uppercase text-white shadow-hard-md lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Configure
            </button>,
            document.body,
          )}
        {sheet &&
          mounted &&
          createPortal(
            <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:hidden">
              {/* The scrim stops at the sheet, so the top of the graphic stays
                  visible and adjustments are not made blind. */}
              <button
                type="button"
                aria-label="Close controls"
                onClick={() => setSheet(false)}
                className="flex-1 bg-black/50"
              />
              <div className="max-h-[62vh] overflow-y-auto border-t-2 border-white bg-black">
                <div className="sticky top-0 flex items-center justify-between border-b-2 border-zinc-800 bg-black px-4 py-3">
                  <span className="font-display text-sm font-bold uppercase text-white">
                    {gen.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheet(false)}
                    aria-label="Close controls"
                    className="border-2 border-zinc-700 p-1.5 text-zinc-400 hover:border-brutalist-cyan hover:text-brutalist-cyan"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {panel}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </>
  );
}
