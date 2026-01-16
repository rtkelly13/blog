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
    primary: 'bg-primary-100 border-primary-500 text-primary-900',
    red: 'bg-red-100 border-red-500 text-red-900',
    blue: 'bg-blue-100 border-blue-500 text-blue-900',
    green: 'bg-green-100 border-green-500 text-green-900',
    yellow: 'bg-yellow-100 border-yellow-500 text-yellow-900',
    gray: 'bg-gray-100 border-gray-500 text-gray-900',
  };

  const colorClasses = colors[color] || colors.primary;

  return (
    <div
      className={`${colorClasses} border-t-8 rounded-b px-3 py-1 shadow-md my-4`}
      role="alert"
    >
      <div className="flex">
        <div>
          <p className="font-bold">{title}</p>
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default NoteBlock;
