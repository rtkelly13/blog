import type { ReactNode } from 'react';

interface NoteBlockProps {
  children: ReactNode;
  title?: string;
  color?: 'primary' | 'red' | 'blue' | 'green' | 'yellow' | 'gray';
}

const NoteBlock = ({
  children,
  title = 'Note',
  color = 'primary',
}: NoteBlockProps) => {
  const colors = {
    primary: 'bg-black border-brutalist-cyan text-white',
    red: 'bg-black border-brutalist-pink text-white',
    blue: 'bg-black border-brutalist-cyan text-white',
    green: 'bg-black border-white text-white',
    yellow: 'bg-black border-brutalist-yellow text-white',
    gray: 'bg-zinc-900 border-white text-white',
  };

  const colorClasses = colors[color] || colors.primary;

  return (
    <div
      className={`${colorClasses} border-l-4 border-t-2 border-r-2 border-b-2 px-3 py-2 my-4 font-mono`}
      role="alert"
    >
      <div className="flex">
        <div>
          <p className="font-bold uppercase">[ {title} ]</p>
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default NoteBlock;
