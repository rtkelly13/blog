import { describe, expect, it } from 'vitest';
import {
  RATE_LIMITS,
  type RateLimitConfig,
  takeToken,
} from '../convex/lib/rateLimit';

const config: RateLimitConfig = { limit: 3, windowMs: 60_000 };
const T0 = 1_000_000;

describe('takeToken (fixed-window rate limit)', () => {
  it('allows the first call and opens a window at now', () => {
    const decision = takeToken(null, config, T0);
    expect(decision).toEqual({
      allowed: true,
      next: { windowStart: T0, count: 1 },
    });
  });

  it('increments within the window up to the limit', () => {
    let state = { windowStart: T0, count: 1 };
    for (let i = 2; i <= config.limit; i++) {
      const decision = takeToken(state, config, T0 + i * 1000);
      expect(decision.allowed).toBe(true);
      if (decision.allowed) {
        expect(decision.next).toEqual({ windowStart: T0, count: i });
        state = decision.next;
      }
    }
  });

  it('refuses once the window is full, with the time until it resets', () => {
    const now = T0 + 10_000;
    const decision = takeToken(
      { windowStart: T0, count: config.limit },
      config,
      now,
    );
    expect(decision).toEqual({
      allowed: false,
      retryAfterMs: T0 + config.windowMs - now,
    });
  });

  it('retryAfterMs shrinks as the window ages', () => {
    const early = takeToken(
      { windowStart: T0, count: config.limit },
      config,
      T0 + 1_000,
    );
    const late = takeToken(
      { windowStart: T0, count: config.limit },
      config,
      T0 + 59_000,
    );
    expect(early.allowed).toBe(false);
    expect(late.allowed).toBe(false);
    if (early.allowed === false && late.allowed === false) {
      expect(early.retryAfterMs).toBe(59_000);
      expect(late.retryAfterMs).toBe(1_000);
    }
  });

  it('starts a fresh window once the previous one has elapsed', () => {
    const now = T0 + config.windowMs;
    const decision = takeToken(
      { windowStart: T0, count: config.limit },
      config,
      now,
    );
    expect(decision).toEqual({
      allowed: true,
      next: { windowStart: now, count: 1 },
    });
  });

  it('a stale window resets even when under the limit', () => {
    const now = T0 + config.windowMs + 5_000;
    const decision = takeToken({ windowStart: T0, count: 1 }, config, now);
    expect(decision).toEqual({
      allowed: true,
      next: { windowStart: now, count: 1 },
    });
  });

  it('exhausting a real endpoint config refuses on the call after the limit', () => {
    const { limit } = RATE_LIMITS['question:ask'];
    let state: { windowStart: number; count: number } | null = null;
    for (let i = 0; i < limit; i++) {
      const decision = takeToken(state, RATE_LIMITS['question:ask'], T0 + i);
      expect(decision.allowed).toBe(true);
      if (decision.allowed) state = decision.next;
    }
    const refused = takeToken(state, RATE_LIMITS['question:ask'], T0 + limit);
    expect(refused.allowed).toBe(false);
  });
});
