import Link from '@/components/Link';
import { accentOf } from './dividerAccents';
import type { Divider } from './types';

/**
 * The contents of an opened divider — identical in every variation, so only the
 * geometry differs between them. Built on remapped tokens only
 * (`text-white`, `text-zinc-400`, `text-brutalist-*`), so it reads as a lit
 * terminal panel on `dark`/`dim` and as ink on a divider card under `sketch`.
 */
export default function DividerBody({
  divider,
  compact = false,
}: {
  divider: Divider;
  compact?: boolean;
}) {
  const accent = accentOf(divider.accent);

  return (
    <div
      className={`flex h-full min-w-0 flex-col ${compact ? 'gap-2 p-4' : 'gap-3 p-5'}`}
    >
      <p
        className={`font-display font-bold uppercase leading-none text-white ${
          compact ? 'text-base' : 'text-lg'
        }`}
      >
        [ {divider.label} ]
      </p>

      <p className="font-mono text-xs leading-relaxed text-zinc-400">
        <span className={accent.text}>&gt;</span> {divider.hint}
      </p>

      <ul className="space-y-1.5 pt-1">
        {divider.items.map((item) => (
          <li key={item.href} className="flex items-baseline gap-2">
            <span className={`font-mono text-xs ${accent.text}`}>—</span>
            <Link
              href={item.href}
              className={`font-mono text-sm font-bold text-white transition-colors ${accent.hover}`}
            >
              {item.label}
            </Link>
            {item.note ? (
              <span className="font-mono text-[0.7rem] uppercase text-zinc-500">
                {item.note}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
