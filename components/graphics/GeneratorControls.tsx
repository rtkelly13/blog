import { Pause, Play, RotateCcw } from 'lucide-react';
import { ACCENT_SWATCHES, PAPER_ACCENTS, PAPER_SWATCHES } from './palette';

/**
 * The configuration panel for a single generator.
 *
 * Presentational on purpose: it owns no state and reads no router, so the same
 * panel serves the desktop sidebar and the mobile drawer without either knowing
 * about the other. The page above it owns the values and the URL.
 */

export interface ControlsValue {
  accent: string;
  accents?: string[];
  paper: boolean;
  seed: number;
  density: number;
  opacity: number;
  contrast: number;
  disorder: number;
  speed: number;
  fps: number;
  originX: number;
  originY: number;
  t: number;
  playing: boolean;
}

interface Props {
  value: ControlsValue;
  onChange: (patch: Partial<ControlsValue>) => void;
  /** Ramps offered for the current surface. */
  ramps: { label: string; colours: string[] | undefined }[];
  /** Whether this generator has a centre worth moving. */
  radial: boolean;
}

const NEON_RAMPS = [
  { label: 'single', colours: undefined },
  { label: 'cyan→pink', colours: ['#22d3ee', '#ec4899'] },
  { label: 'yellow→pink→cyan', colours: ['#facc15', '#ec4899', '#22d3ee'] },
  { label: 'green→cyan', colours: ['#39ff14', '#22d3ee'] },
];

const PAPER_RAMPS = [
  { label: 'single', colours: undefined },
  { label: 'ink→blue', colours: ['#23262e', '#2563eb'] },
  { label: 'ink→red', colours: ['#23262e', '#dc2626'] },
  { label: 'green→ink→red', colours: ['#15803d', '#23262e', '#dc2626'] },
];

export const rampsFor = (paper: boolean) => (paper ? PAPER_RAMPS : NEON_RAMPS);

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-zinc-400">
        {label} · {format ? format(value) : value.toFixed(2)}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brutalist-cyan"
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b-2 border-zinc-800 px-4 py-4">
      <div className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-white">
        {title}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default function GeneratorControls({
  value: v,
  onChange,
  ramps,
  radial,
}: Props) {
  const swatches = v.paper ? PAPER_SWATCHES : ACCENT_SWATCHES;
  const rampIndex = Math.max(
    0,
    ramps.findIndex(
      (r) => (r.colours ?? []).join(',') === (v.accents ?? []).join(','),
    ),
  );

  return (
    <div className="flex flex-col">
      <Section title="Surface">
        <div className="flex gap-2">
          {([false, true] as const).map((p) => (
            <button
              key={String(p)}
              type="button"
              onClick={() =>
                onChange({
                  paper: p,
                  // Carrying a neon accent onto paper is the single most common
                  // way to end up with an invisible graphic, so the surface
                  // takes its own default ink with it.
                  accent: p ? PAPER_ACCENTS.ink : '#22d3ee',
                  accents: undefined,
                })
              }
              className={`flex-1 border-2 px-2 py-1.5 font-mono text-[11px] uppercase ${
                v.paper === p
                  ? 'border-brutalist-cyan text-brutalist-cyan'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {p ? 'paper' : 'dark'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Colour">
        <div className="flex flex-wrap gap-2">
          {swatches.map((s) => (
            <button
              key={s.name}
              type="button"
              aria-label={s.name}
              onClick={() => onChange({ accent: s.value, accents: undefined })}
              className={`h-7 w-7 border-2 ${
                v.accent === s.value && !v.accents
                  ? 'scale-110 border-white'
                  : 'border-zinc-700 hover:border-zinc-400'
              }`}
              style={{ backgroundColor: s.value }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {ramps.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() => onChange({ accents: r.colours })}
              className={`flex items-center gap-2 border-2 px-2 py-1 font-mono text-[10px] uppercase ${
                rampIndex === i
                  ? 'border-brutalist-cyan text-brutalist-cyan'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <span
                className="h-3 w-8 shrink-0 border border-zinc-600"
                style={{
                  background: r.colours
                    ? `linear-gradient(90deg, ${r.colours.join(', ')})`
                    : v.accent,
                }}
              />
              {r.label}
            </button>
          ))}
        </div>
        <Slider
          label="Contrast"
          value={v.contrast}
          min={0.2}
          max={1.8}
          step={0.05}
          onChange={(contrast) => onChange({ contrast })}
        />
        <Slider
          label="Opacity"
          value={v.opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(opacity) => onChange({ opacity })}
        />
      </Section>

      <Section title="Form">
        <div className="flex items-end gap-2">
          <div className="flex-1 font-mono text-[11px] uppercase text-zinc-400">
            Seed · {v.seed}
          </div>
          <button
            type="button"
            onClick={() => onChange({ seed: Math.floor(Math.random() * 9999) })}
            className="flex items-center gap-1.5 border-2 border-zinc-700 px-2 py-1 font-mono text-[10px] uppercase text-zinc-400 hover:border-brutalist-cyan hover:text-brutalist-cyan"
          >
            <RotateCcw className="h-3 w-3" /> Shuffle
          </button>
        </div>
        <Slider
          label="Density"
          value={v.density}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(density) => onChange({ density })}
        />
        <Slider
          label="Disorder"
          value={v.disorder}
          min={0}
          max={1}
          step={0.05}
          onChange={(disorder) => onChange({ disorder })}
        />
        {radial && (
          <>
            <Slider
              label="Origin X"
              value={v.originX}
              min={0}
              max={1}
              step={0.05}
              onChange={(originX) => onChange({ originX })}
            />
            <Slider
              label="Origin Y"
              value={v.originY}
              min={0}
              max={1}
              step={0.05}
              onChange={(originY) => onChange({ originY })}
            />
          </>
        )}
      </Section>

      <Section title="Motion">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ playing: !v.playing })}
            className="flex flex-1 items-center justify-center gap-2 border-2 border-white px-2 py-1.5 font-mono text-[11px] uppercase text-white hover:border-brutalist-cyan hover:text-brutalist-cyan"
          >
            {v.playing ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Play
              </>
            )}
          </button>
        </div>
        <Slider
          label={v.playing ? 'Scrub (pause first)' : 'Scrub'}
          value={v.t}
          min={0}
          max={1}
          step={0.001}
          onChange={(t) => onChange({ t })}
          format={(x) => x.toFixed(3)}
        />
        <Slider
          label="Speed"
          value={v.speed}
          min={0.2}
          max={2}
          step={0.1}
          onChange={(speed) => onChange({ speed })}
          format={(x) => `${x.toFixed(1)}×`}
        />
        <Slider
          label="FPS"
          value={v.fps}
          min={6}
          max={60}
          step={2}
          onChange={(fps) => onChange({ fps })}
          format={(x) => String(x)}
        />
      </Section>
    </div>
  );
}
