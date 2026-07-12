import type { ReactNode } from 'react';
import BracketText from './BracketText';

interface Props {
  children: ReactNode;
}

export default function PageTitle({ children }: Props) {
  return (
    <h1 className="text-3xl font-display font-bold leading-tight tracking-tight text-white uppercase sm:text-4xl md:text-5xl border-4 border-double border-white inline-block px-6 py-4">
      <BracketText>{children}</BracketText>
    </h1>
  );
}
