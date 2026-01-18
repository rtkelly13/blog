import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function PageTitle({ children }: Props) {
  return (
    <h1 className="text-3xl font-mono font-bold leading-9 tracking-tight text-white uppercase sm:text-4xl sm:leading-10 md:text-5xl md:leading-14 border-4 border-double border-white inline-block px-6 py-4">
      [ {children} ]
    </h1>
  );
}
