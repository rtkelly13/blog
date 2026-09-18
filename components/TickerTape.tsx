import { type ReactNode, useEffect, useRef } from 'react';

export interface TickerTapeProps {
  /** Sequence of strings or React elements to cycle continuously. */
  items: ReactNode[];
  /** Velocity in pixels per second (default 52). */
  pixelsPerSecond?: number;
  /** Fixed sticky positioning at top of viewport. */
  sticky?: boolean;
  /** Trailing child component docked to the right edge (e.g. <TelemetryGauge /> or CTA). */
  endAddon?: ReactNode;
  /** Section title prefix displayed before the rolling marquee. */
  title?: string;
  /** Deceleration duration in seconds when hovered (default 0.7s). */
  brakeDuration?: number;
  /** Acceleration duration in seconds when hover leaves (default 0.9s). */
  spoolDuration?: number;
  /** Optional callback receiving current normalized velocity rate (0.0 to 1.0) and percentage. */
  onVelocityChange?: (rate: number, percentage: number) => void;
  className?: string;
}

/** Cubic easing curves for symmetric momentum braking and flywheel spooling */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Terminal Marquee TickerTape component.
 *
 * Implements a continuous virtual RAF transform engine that decouples animation
 * from CSS @keyframes, completely eliminating the Chromium animation timeline
 * reset bug upon hover state toggling. Features momentum-based hover braking,
 * dynamic velocity normalization, sticky docking, and a trailing endAddon slot.
 */
export default function TickerTape({
  items,
  pixelsPerSecond = 52,
  sticky = false,
  endAddon,
  title = 'TERMINAL // LATEST_DISPATCHES',
  brakeDuration = 0.7,
  spoolDuration = 0.9,
  onVelocityChange,
  className = '',
}: TickerTapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Animation physics state (persisted across renders via refs)
  const physicsRef = useRef({
    currentRate: 1.0,
    targetRate: 1.0,
    rampStartRate: 1.0,
    rampStartTime: 0,
    scrollPos: 0,
    lastTime: 0,
    isHovered: false,
  });

  useEffect(() => {
    let animationFrameId: number;

    const tick = (now: number) => {
      const state = physicsRef.current;

      if (!state.lastTime) {
        state.lastTime = now;
        state.rampStartTime = now;
      }

      const dt = Math.min(0.1, (now - state.lastTime) / 1000); // clamp dt to avoid massive leap on background tab
      state.lastTime = now;

      // 1. Calculate rate transition with easing
      if (state.currentRate !== state.targetRate) {
        const duration =
          state.targetRate === 0.0 ? brakeDuration : spoolDuration;
        const elapsed = (now - state.rampStartTime) / 1000;
        const progress = Math.min(
          1.0,
          Math.max(0.0, elapsed / Math.max(0.001, duration)),
        );
        const eased =
          state.targetRate === 0.0
            ? easeOutCubic(progress)
            : easeInCubic(progress);

        state.currentRate =
          state.rampStartRate +
          (state.targetRate - state.rampStartRate) * eased;

        if (progress >= 1.0) {
          state.currentRate = state.targetRate;
        }

        const currentPct = Math.round(state.currentRate * 100);
        onVelocityChange?.(state.currentRate, currentPct);
      }

      // 2. Advance virtual scroll position without resetting
      const track = trackRef.current;
      if (track) {
        const loopBoundary = track.scrollWidth / 2;
        if (loopBoundary > 0) {
          state.scrollPos += state.currentRate * pixelsPerSecond * dt;
          if (state.scrollPos >= loopBoundary) {
            state.scrollPos %= loopBoundary;
          }
          track.style.transform = `translate3d(-${state.scrollPos}px, 0, 0)`;
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [pixelsPerSecond, brakeDuration, spoolDuration, onVelocityChange]);

  const handleMouseEnter = () => {
    const state = physicsRef.current;
    state.isHovered = true;
    state.targetRate = 0.0;
    state.rampStartRate = state.currentRate;
    state.rampStartTime = performance.now();
  };

  const handleMouseLeave = () => {
    const state = physicsRef.current;
    state.isHovered = false;
    state.targetRate = 1.0;
    state.rampStartRate = state.currentRate;
    state.rampStartTime = performance.now();
  };

  const stickyClasses = sticky
    ? 'fixed top-0 left-0 right-0 z-50 shadow-hard-md'
    : 'relative';

  return (
    <div
      ref={containerRef}
      data-slot="ticker-tape"
      className={`${stickyClasses} flex items-stretch border-y-2 border-white bg-black font-mono text-xs text-white overflow-hidden select-none ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Optional leading section title */}
      {title && (
        <div className="flex items-center px-3.5 py-2.5 border-r-2 border-white bg-zinc-950 text-accent-primary font-bold tracking-wider text-[11px] whitespace-nowrap z-10 shrink-0">
          <span className="mr-2 text-zinc-500">&gt;</span>
          {title}
        </div>
      )}

      {/* Marquee viewport */}
      <div className="relative flex-1 overflow-hidden py-2.5 flex items-center">
        <div
          ref={trackRef}
          className="flex whitespace-nowrap will-change-transform"
          style={{ transform: 'translate3d(0, 0, 0)' }}
        >
          {/* Primary Sequence */}
          <div className="flex items-center gap-8 px-4 shrink-0">
            {items.map((item, idx) => (
              <span
                key={`ticker-item-a-${idx}`}
                className="inline-flex items-center gap-3"
              >
                <span className="text-zinc-600 font-bold">/</span>
                <span className="text-zinc-200 font-medium hover:text-white transition-colors">
                  {item}
                </span>
              </span>
            ))}
          </div>
          {/* Duplicate Sequence for seamless infinite loop */}
          <div
            className="flex items-center gap-8 px-4 shrink-0"
            aria-hidden="true"
          >
            {items.map((item, idx) => (
              <span
                key={`ticker-item-b-${idx}`}
                className="inline-flex items-center gap-3"
              >
                <span className="text-zinc-600 font-bold">/</span>
                <span className="text-zinc-200 font-medium hover:text-white transition-colors">
                  {item}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Trailing docked slot (endAddon) */}
      {endAddon && (
        <div className="flex items-stretch border-l-2 border-white bg-zinc-950 z-10 shrink-0">
          {endAddon}
        </div>
      )}
    </div>
  );
}
