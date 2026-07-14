/**
 * Renders a `useRunAction` error (or nothing). Shared by every presenter
 * control surface — /admin panels, the console sidebar, and slide-embedded
 * launch/reveal controls — so a lapsed admin session shows the thrown
 * "Unauthorized…" instead of a silently dead button.
 */
export default function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="font-mono text-xs text-brutalist-pink">{error}</p>;
}
