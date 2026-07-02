/**
 * Inline notice shown when an audience write was refused with
 * `{ ok: false, reason: 'rate_limited', retryAfterMs }`. Renders nothing while
 * not limited; pairs with `useRateLimitNotice` for the countdown.
 */
export default function RateLimitNotice({
  secondsLeft,
}: {
  secondsLeft: number | null;
}) {
  if (secondsLeft === null) return null;
  return (
    <p className="border-2 border-brutalist-yellow bg-black p-3 font-mono text-sm text-brutalist-yellow">
      ⚠ Easy there — you've hit the send limit. Try again in {secondsLeft}s.
    </p>
  );
}
