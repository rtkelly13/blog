/**
 * A vertical tab label: `vertical-rl` plus a half turn, so the text runs
 * bottom-to-top the way a book spine or a notebook index tab does on a
 * left-hand edge. Every tab in this family uses it, which is what keeps the
 * whole rail one system rather than six near-misses.
 */
export default function TabLabel({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`[writing-mode:vertical-rl] rotate-180 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-[0.15em] ${className}`}
    >
      {children}
    </span>
  );
}
