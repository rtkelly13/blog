import { NoteBlock as SystemNoteBlock } from '@rtkelly/design-system';
import React, { type ReactNode } from 'react';

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
  const getType = () => {
    switch (color) {
      case 'red':
        return 'warning';
      case 'yellow':
        return 'important';
      case 'green':
        return 'tip';
      default:
        return 'note';
    }
  };

  return (
    <SystemNoteBlock type={getType()} title={title}>
      {children}
    </SystemNoteBlock>
  );
};

export default NoteBlock;
