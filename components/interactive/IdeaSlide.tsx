import type { ReactNode } from 'react';

export interface IdeaSlideProps {
  /** Shown in the deck header and used as the dot's accessible label. */
  title: string;
  children: ReactNode;
}

/**
 * One slide of an <IdeaDeck>. Deliberately a plain, dependency-free component:
 * it's registered statically in MDXComponents (the deck itself is dynamic), so
 * it must not pull motion or any other heavy import into page bundles.
 */
const IdeaSlide = ({ children }: IdeaSlideProps) => <>{children}</>;

export default IdeaSlide;
