# Issue 08: TickerTape Physics Engine, Position Continuity & Chromium Timeline Reset Bug

Status: needs-triage

## Summary

Investigate and document the position-resetting bug encountered when applying momentum deceleration/acceleration to marquee tickers, and establish the robust, production-grade **Continuous Virtual Transform** architecture in React / TypeScript for `@rtkelly13/design-system` and the blog.

---

## 1. Root Cause Analysis: The Chromium Timeline Reset Bug

### The Observed Defect
When implementing momentum braking (easing from nominal cruise speed down to a standstill on `:hover` and accelerating back up on mouse leave), the marquee track periodically snaps or resets its position back to `translateX(0)`.

### The Technical Mechanism of the Failure
Initially, the implementation combined a standard CSS `@keyframes ticker-scroll` with the Web Animations API (`CSSAnimation.playbackRate`):
```javascript
// ATTEMPT 1: WAAPI playbackRate over CSS Animation
tracks.forEach(track => {
  const anim = track.getAnimations()[0];
  if (anim) {
    anim.playbackRate = currentRate; // Drops to 0 on hover
  }
});
```

Two independent failure modes occur in Blink/Chromium:
1. **Zero-Rate Timeline Invalidation**: In Chromium's Web Animations implementation, setting `playbackRate = 0` on a running CSS animation flags the timeline as un-synced or pauses the internal time origin. In certain compositor ticks, re-assigning `playbackRate > 0` causes Chromium to recalculate the animation's `startTime` against the document timeline, effectively resetting `currentTime` to `0s` (snapping the element back to its initial keyframe).
2. **Style Cascade Conflicts**: When combining CSS animation rules (`animation: ticker-scroll 35s linear infinite`) with programmatic timeline manipulations, any CSS selector re-evaluation (such as hover class toggles or container reflows) restarts the CSS animation phase.

---

## 2. The Architectural Solution: Continuous Virtual RAF Transform

Rather than fighting browser-level CSS animation timeline synchronization bugs, the bulletproof architectural solution is a **Continuous Virtual Transform Engine** driven by `requestAnimationFrame`:

$$\text{offset} = (\text{offset} + \text{velocity} \times \text{speed} \times \Delta t) \pmod{\text{loopBoundary}}$$

### Key Architectural Invariants:
1. **Absolute Frame Continuity**: Position is stored as a persistent floating-point scalar (`offsetPx`). It is mathematically impossible for position to snap to `0` because `offsetPx` is strictly monotonic and only wraps around when it crosses `track.scrollWidth / 2`.
2. **Zero-Speed Invariance**: When hover deceleration completes and velocity reaches `0.0`, `offsetPx` simply stops accumulating. The element remains perfectly stationary at the exact pixel where deceleration completed.
3. **Symmetric Easing**: Deceleration and acceleration utilize the exact same mathematical S-curve (`easeInOutCubic` or `easeInOutQuad`).
4. **Normalized Reading Velocity**: Instead of arbitrary fixed durations, velocity is defined in **pixels per second** (e.g. `52 px/s`), ensuring consistent reading speeds regardless of text volume.

---

## 3. Production-Ready Code Implementation

### React Component: `TickerTape.tsx`

```tsx
import React, { useRef, useEffect, useState, ReactNode } from 'react';

export interface TickerTapeItem {
  id: string;
  label: string;
  href?: string;
}

export interface TickerTapeProps {
  items: TickerTapeItem[];
  pixelsPerSecond?: number;         // default: 52 px/s
  rampDurationMs?: number;          // default: 850ms
  physics?: 'flywheel' | 'viscous' | 'linear';
  sticky?: boolean;
  endAddon?: ReactNode;             // trailing slot, e.g. <TelemetryGauge />
  className?: string;
}

const EASING_CURVES = {
  // S-Curve cubic easing for heavy mechanical inertia
  flywheel: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // Quadratic easing for snappier braking/spooling
  viscous: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  linear: (t: number) => t,
};

export function TickerTape({
  items,
  pixelsPerSecond = 52,
  rampDurationMs = 850,
  physics = 'flywheel',
  sticky = false,
  endAddon,
  className = '',
}: TickerTapeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [velocity, setVelocity] = useState(1.0);
  const [motionState, setMotionState] = useState<'CRUISE' | 'BRAKING' | 'HALTED' | 'SPOOLING'>('CRUISE');

  // Physics state refs (preserved across renders)
  const stateRef = useRef({
    currentVelocity: 1.0,
    targetVelocity: 1.0,
    rampStartVelocity: 1.0,
    rampStartTime: performance.now(),
    offset: 0,
    lastTime: performance.now(),
  });

  const handleMouseEnter = () => {
    const s = stateRef.current;
    s.targetVelocity = 0.0;
    s.rampStartVelocity = s.currentVelocity;
    s.rampStartTime = performance.now();
  };

  const handleMouseLeave = () => {
    const s = stateRef.current;
    s.targetVelocity = 1.0;
    s.rampStartVelocity = s.currentVelocity;
    s.rampStartTime = performance.now();
  };

  useEffect(() => {
    let animId: number;
    const easeFn = EASING_CURVES[physics] || EASING_CURVES.flywheel;

    const tick = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min((now - s.lastTime) / 1000, 0.1);
      s.lastTime = now;

      // 1. Ramp velocity
      if (s.currentVelocity !== s.targetVelocity) {
        const elapsed = now - s.rampStartTime;
        const progress = Math.min(elapsed / rampDurationMs, 1.0);
        const eased = easeFn(progress);
        s.currentVelocity = s.rampStartVelocity + (s.targetVelocity - s.rampStartVelocity) * eased;
        if (progress >= 1.0) s.currentVelocity = s.targetVelocity;

        // Update state labels
        if (s.currentVelocity === 0) setMotionState('HALTED');
        else if (s.targetVelocity === 0) setMotionState('BRAKING');
        else if (s.targetVelocity === 1 && s.currentVelocity < 1) setMotionState('SPOOLING');
        else setMotionState('CRUISE');

        setVelocity(s.currentVelocity);
      }

      // 2. Accumulate position and translate
      const track = trackRef.current;
      if (track) {
        const loopBoundary = track.scrollWidth / 2;
        if (loopBoundary > 0) {
          s.offset += s.currentVelocity * pixelsPerSecond * dt;
          if (s.offset >= loopBoundary) {
            s.offset %= loopBoundary;
          }
          track.style.transform = `translate3d(-${s.offset}px, 0, 0)`;
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [pixelsPerSecond, rampDurationMs, physics]);

  return (
    <div
      className={`relative flex items-stretch border-b-2 border-border-strong bg-surface-sunken overflow-hidden ${
        sticky ? 'sticky top-0 z-40 shadow-hard-xs' : ''
      } ${className}`}
    >
      <div
        className="flex-1 py-2 font-mono text-xs font-bold uppercase tracking-widest overflow-hidden whitespace-nowrap select-none cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div ref={trackRef} className="inline-flex items-center gap-8 will-change-transform">
          {/* Primary items */}
          {items.map((item) => (
            <span key={`a-${item.id}`} className="inline-flex items-center gap-3 text-text-muted">
              <span className="w-1.5 h-1.5 bg-accent-primary flex-shrink-0" />
              <span className="text-text-primary">{item.label}</span>
            </span>
          ))}
          {/* 1:1 Duplicated items for seamless loop modulo */}
          {items.map((item) => (
            <span key={`b-${item.id}`} className="inline-flex items-center gap-3 text-text-muted" aria-hidden="true">
              <span className="w-1.5 h-1.5 bg-accent-primary flex-shrink-0" />
              <span className="text-text-primary">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Optional Trailing Addon Slot */}
      {endAddon && (
        <div className="flex items-stretch border-l-2 border-border-strong bg-surface-raised z-10 flex-shrink-0 shadow-[-4px_0_0_0_var(--shadow-color)]">
          {endAddon}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Verification & Validation Evidence

In the accompanying live preview (`preview.html`):
1. Hovering the cursor over the ticker smoothly decelerates the tape down to 0% at the exact position under the mouse.
2. Holding hover indefinitely maintains absolute stationary position—**no resets, no jitter, no jumping**.
3. Releasing mouse hover spools velocity smoothly back up from that exact position.
4. Switching themes between **Midnight** and **Sketch** preserves the running offset without interruption.

## Acceptance Criteria

- [ ] Zero position snapping or phase reset when entering or leaving hover state.
- [ ] Uses hardware-accelerated `translate3d` loop without CSS keyframe conflicts.
- [ ] Respects `prefers-reduced-motion` by freezing position and enabling native horizontal scroll/wrap.
- [ ] Seamless loop wrapping via `offset %= scrollWidth / 2`.
