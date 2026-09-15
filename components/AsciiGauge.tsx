import type { HTMLAttributes } from 'react';

export type AsciiGaugeVariant =
  | 'block'
  | 'shade'
  | 'line'
  | 'ascii'
  | 'braille';

export interface AsciiGaugeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Current value between min and max. */
  value: number;
  /** Minimum value range (default 0). */
  min?: number;
  /** Maximum value range (default 100). */
  max?: number;
  /** Optional target or benchmark threshold value. When provided, renders a target pin inside the bar. */
  target?: number;
  /** Total character length of inner bar (excluding brackets, default 10). */
  length?: number;
  /** Enclosing boundary characters (default ['[', ']']). Pass null for bare meter. */
  brackets?: [string, string] | null;
  /** Visual glyph set (default 'block'). */
  variant?: AsciiGaugeVariant;
  /** Accent role token for filled glyphs (default 'primary'). */
  accent?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'success'
    | 'warning'
    | 'danger';
  /** Show numeric percentage readout after bar (default false). */
  showValue?: boolean;
  /** Custom formatter for numeric readout. */
  valueFormat?: (value: number, ratio: number) => string;
}

const GLYPH_SETS: Record<
  AsciiGaugeVariant,
  { fill: string; empty: string; target: string; shades?: string[] }
> = {
  block: { fill: '█', empty: '░', target: '|' },
  shade: { fill: '▓', empty: '░', target: '|', shades: ['▓', '▒', '░'] },
  line: { fill: '=', empty: '-', target: '|' },
  ascii: { fill: '#', empty: '-', target: '|' },
  braille: { fill: '⣿', empty: '⠀', target: '⡇' },
};

const ACCENT_TEXT_CLASSES: Record<
  NonNullable<AsciiGaugeProps['accent']>,
  string
> = {
  primary: 'text-accent-primary',
  secondary: 'text-accent-secondary',
  tertiary: 'text-accent-tertiary',
  success: 'text-intent-success',
  warning: 'text-intent-warning',
  danger: 'text-intent-danger',
};

/**
 * Foundational zero-dependency monospace meter primitive.
 *
 * Emits pure UTF-8 character progress bars and benchmark comparisons for terminal HUDs,
 * CLI logs, and table cells. Supports benchmark target pins, multiple glyph variants,
 * and conforms to strict 0px border radius and accessible role="meter".
 */
export default function AsciiGauge({
  value,
  min = 0,
  max = 100,
  target,
  length = 10,
  brackets = ['[', ']'],
  variant = 'block',
  accent = 'primary',
  showValue = false,
  valueFormat,
  className = '',
  ...props
}: AsciiGaugeProps) {
  const span = Math.max(0.0001, max - min);
  const clampedValue = Math.min(max, Math.max(min, value));
  const ratio = Math.min(1, Math.max(0, (clampedValue - min) / span));
  const filledCount = Math.round(ratio * length);

  const glyphs = GLYPH_SETS[variant] ?? GLYPH_SETS.block;
  const targetIndex =
    target !== undefined && target >= min && target <= max
      ? Math.min(
          length - 1,
          Math.max(0, Math.round(((target - min) / span) * length)),
        )
      : null;

  // Build character array
  const chars: { char: string; isFilled: boolean; isTarget: boolean }[] = [];

  for (let i = 0; i < length; i++) {
    const isTarget = targetIndex !== null && i === targetIndex;
    if (isTarget && i >= filledCount) {
      chars.push({ char: glyphs.target, isFilled: false, isTarget: true });
    } else if (i < filledCount) {
      if (variant === 'shade' && glyphs.shades) {
        // Gradient density near the edge of the filled region
        const shadeIndex = Math.min(
          glyphs.shades.length - 1,
          Math.floor((1 - i / filledCount) * glyphs.shades.length),
        );
        chars.push({
          char: glyphs.shades[shadeIndex],
          isFilled: true,
          isTarget,
        });
      } else {
        chars.push({ char: glyphs.fill, isFilled: true, isTarget });
      }
    } else {
      chars.push({ char: glyphs.empty, isFilled: false, isTarget });
    }
  }

  const [openBracket, closeBracket] = brackets ?? ['', ''];
  const formattedValue = valueFormat
    ? valueFormat(clampedValue, ratio)
    : `${Math.round(ratio * 100)}%`;

  const accentClass = ACCENT_TEXT_CLASSES[accent] ?? 'text-accent-primary';

  return (
    // biome-ignore lint/a11y/useSemanticElements: custom monospace ASCII character rendering
    <span
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={min}
      aria-valuemax={max}
      data-slot="ascii-gauge"
      className={`inline-flex items-center font-mono text-xs select-none tracking-tight ${className}`}
      {...props}
    >
      {openBracket && <span className="text-zinc-500">{openBracket}</span>}
      <span className="inline-flex">
        {chars.map((item, idx) => (
          <span
            key={`gauge-char-${idx}`}
            className={
              item.isTarget
                ? 'text-intent-warning font-bold'
                : item.isFilled
                  ? accentClass
                  : 'text-zinc-600'
            }
          >
            {item.char}
          </span>
        ))}
      </span>
      {closeBracket && <span className="text-zinc-500">{closeBracket}</span>}
      {showValue && (
        <span className="ml-1.5 font-mono text-xs font-bold text-zinc-300">
          {formattedValue}
        </span>
      )}
    </span>
  );
}
