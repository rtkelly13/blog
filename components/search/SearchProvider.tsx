import type { Action } from 'kbar';
import { KBarProvider } from 'kbar';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import DeepSearch from './DeepSearch';
import KBarModal from './KBarModal';

interface Props {
  children: ReactNode;
}

export default function SearchProvider({ children }: Props) {
  const router = useRouter();

  // Static navigation actions; content actions are registered by <DeepSearch />
  // from the lazy-loaded search index.
  const defaultActions: Action[] = [
    {
      id: 'home',
      name: 'Home',
      keywords: 'homepage index',
      shortcut: ['h'],
      section: 'Navigation',
      perform: () => router.push('/'),
    },
    {
      id: 'blog',
      name: 'Blog',
      keywords: 'posts articles writing',
      shortcut: ['b'],
      section: 'Navigation',
      perform: () => router.push('/blog'),
    },
    {
      id: 'tags',
      name: 'Tags',
      keywords: 'categories topics',
      shortcut: ['t'],
      section: 'Navigation',
      perform: () => router.push('/tags'),
    },
    {
      id: 'about',
      name: 'About',
      keywords: 'author info',
      shortcut: ['a'],
      section: 'Navigation',
      perform: () => router.push('/about'),
    },
  ];

  return (
    <KBarProvider actions={defaultActions}>
      <KBarModal />
      <DeepSearch />
      {children}
    </KBarProvider>
  );
}
