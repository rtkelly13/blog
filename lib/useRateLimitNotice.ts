import { useCallback, useEffect, useState } from 'react';

export interface RateLimitNoticeState {
  /** Seconds until the next attempt is allowed; null when not limited. */
  secondsLeft: number | null;
  /** Arm the notice from a mutation's `{ retryAfterMs }` refusal. */
  notify: (retryAfterMs: number) => void;
}

/**
 * Countdown state for the audience-write rate limits. When a mutation returns
 * `{ ok: false, reason: 'rate_limited', retryAfterMs }`, call `notify` with the
 * refusal's `retryAfterMs`; `secondsLeft` then ticks down to null, so the UI
 * can show the attendee they've hit the limit and when they can retry.
 */
export function useRateLimitNotice(): RateLimitNoticeState {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);

  useEffect(() => {
    if (until !== null && now >= until) setUntil(null);
  }, [now, until]);

  const notify = useCallback((retryAfterMs: number) => {
    const at = Date.now();
    setNow(at);
    setUntil(at + Math.max(0, retryAfterMs));
  }, []);

  const secondsLeft =
    until === null ? null : Math.max(1, Math.ceil((until - now) / 1000));
  return { secondsLeft, notify };
}
