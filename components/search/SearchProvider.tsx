import type { Action } from 'kbar';
import { KBarProvider } from 'kbar';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import KBarModal from './KBarModal';

interface Props {
  children: ReactNode;
}

export default function SearchProvider({ children }: Props) {
  const router = useRouter();
  const [searchActions, setSearchActions] = useState<Action[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Default navigation actions
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

  // Load search index
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const res = await fetch('/search.json');
        const posts = await res.json();
        const actions: Action[] = posts.map(
          (post: {
            slug: string;
            title: string;
            summary?: string;
            date?: string;
          }) => ({
            id: post.slug,
            name: post.title,
            keywords: post.summary || '',
            section: 'Blog Posts',
            subtitle: post.date,
            perform: () => router.push(`/blog/${post.slug}`),
          }),
        );
        setSearchActions(actions);
        setLoaded(true);
      } catch (error) {
        console.error('Failed to load search index:', error);
        setLoaded(true);
      }
    };
    loadSearchData();
  }, [router]);

  return (
    <KBarProvider actions={defaultActions}>
      <KBarModal actions={searchActions} isLoading={!loaded} />
      {children}
    </KBarProvider>
  );
}
