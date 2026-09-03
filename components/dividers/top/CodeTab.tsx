import type { ReactNode } from 'react';

/**
 * One tab inside a `CodeTabs`. A marker component — `CodeTabs` reads its
 * `label` and renders its children into a panel, the same way `IdeaDeck` reads
 * `IdeaSlide`. Rendered on its own it is just its children, so a tab that ends
 * up outside a `CodeTabs` still shows its code rather than vanishing.
 */
export default function CodeTab({
  children,
}: {
  /** Tab text: the language, tool or filename. Read by `CodeTabs`. */
  label: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}
