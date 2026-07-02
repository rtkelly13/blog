import type { MutationCtx } from '../_generated/server';

/**
 * Per-machine rate limiting for the audience-write endpoints (poll submit,
 * question ask/upvote, activity submit, reaction send), so a rowdy room — or a
 * scripted client — can't flood a session. A fixed-window counter kept in the
 * `rateLimits` table: one row per (machineId, kind), reused across windows
 * (patched, never deleted), so the table stays bounded without a reaper.
 *
 * Best-effort by design: `machineId` is the same pseudo-anonymous localStorage
 * id presence/dedup use, so it stops accidental floods and casual abuse, not a
 * determined attacker minting fresh ids.
 *
 * When a call is refused the mutation returns a structured refusal —
 * `{ ok: false, reason: 'rate_limited', retryAfterMs }` — never a silent drop,
 * so the /live UI can tell the attendee when they can retry.
 */

export interface RateLimitConfig {
  /** Max writes allowed per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

/** Per-endpoint limits (per machine, per window). */
export const RATE_LIMITS = {
  'poll:submit': { limit: 10, windowMs: 60_000 },
  'question:ask': { limit: 5, windowMs: 60_000 },
  'question:upvote': { limit: 30, windowMs: 60_000 },
  'activity:submit': { limit: 5, windowMs: 60_000 },
  // Reactions arrive as client-debounced batches (count ≤ 20 per row), so this
  // caps batches per window, not individual taps.
  'reaction:send': { limit: 30, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitKind = keyof typeof RATE_LIMITS;

/** The persisted counter state for one (machineId, kind) window. */
export interface WindowState {
  windowStart: number;
  count: number;
}

export type TokenDecision =
  | { allowed: true; next: WindowState }
  | { allowed: false; retryAfterMs: number };

/**
 * Pure fixed-window token take: given the stored window state (or null for a
 * first-ever call), decide whether one more write is allowed at `now` and what
 * the next state should be. Kept pure so the window logic is unit-testable.
 */
export function takeToken(
  state: WindowState | null,
  config: RateLimitConfig,
  now: number,
): TokenDecision {
  if (!state || now - state.windowStart >= config.windowMs) {
    // Fresh machine or the previous window has elapsed: start a new window.
    return { allowed: true, next: { windowStart: now, count: 1 } };
  }
  if (state.count < config.limit) {
    return {
      allowed: true,
      next: { windowStart: state.windowStart, count: state.count + 1 },
    };
  }
  return {
    allowed: false,
    retryAfterMs: state.windowStart + config.windowMs - now,
  };
}

/** The structured refusal every rate-limited audience mutation returns. */
export type RateLimitedRefusal = {
  ok: false;
  reason: 'rate_limited';
  retryAfterMs: number;
};

/**
 * Consume one rate-limit token for (machineId, kind), persisting the window
 * counter. Returns `null` when the write may proceed, or the structured
 * refusal to return to the client. Call it after the cheap read-only gates and
 * immediately before the mutation's writes, so refused calls write nothing and
 * the limit counts *landed* writes per window.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  machineId: string,
  kind: RateLimitKind,
  now = Date.now(),
): Promise<RateLimitedRefusal | null> {
  const row = await ctx.db
    .query('rateLimits')
    .withIndex('by_machine_kind', (q) =>
      q.eq('machineId', machineId).eq('kind', kind),
    )
    .unique();

  const decision = takeToken(
    row ? { windowStart: row.windowStart, count: row.count } : null,
    RATE_LIMITS[kind],
    now,
  );
  // `=== false` (not `!`): this repo compiles with `strict: false`, where
  // truthiness checks don't narrow discriminated unions but comparisons do.
  if (decision.allowed === false) {
    return {
      ok: false,
      reason: 'rate_limited',
      retryAfterMs: decision.retryAfterMs,
    };
  }
  if (row) {
    await ctx.db.patch(row._id, decision.next);
  } else {
    await ctx.db.insert('rateLimits', { machineId, kind, ...decision.next });
  }
  return null;
}
