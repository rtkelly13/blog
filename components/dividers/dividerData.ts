import type { Divider } from './types';

/**
 * The site's navigation expressed as dividers. Mirrors `data/headerNavLinks`,
 * grouped into sections — a rail has the height to show a section's pages
 * where the header bar only had room for the section.
 *
 * Accents follow the per-section rule in `components/AGENTS.md`, so the tab a
 * reader arrives on is the colour of the `PageHeader` they arrive at: cyan is
 * the default, talks are pink, ideas are yellow.
 */
export const SITE_DIVIDERS: Divider[] = [
  {
    id: 'blog',
    label: 'BLOG',
    accent: 'cyan',
    items: [
      { href: '/blog', label: 'Posts' },
      { href: '/series', label: 'Series' },
      { href: '/tags', label: 'Tags' },
    ],
  },
  {
    id: 'talks',
    label: 'TALKS',
    accent: 'pink',
    items: [
      { href: '/talks', label: 'Talks' },
      { href: '/live', label: 'Live' },
    ],
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    accent: 'cyan',
    items: [
      { href: '/projects', label: 'Projects' },
      { href: '/experiments', label: 'Experiments' },
    ],
  },
  {
    id: 'ideas',
    label: 'IDEAS',
    accent: 'yellow',
    items: [
      { href: '/ideas', label: 'Workbench' },
      { href: '/design-sandbox', label: 'Sandbox' },
    ],
  },
  {
    id: 'about',
    label: 'ABOUT',
    accent: 'cyan',
    items: [
      { href: '/about', label: 'About' },
      { href: '/cv', label: 'CV' },
    ],
  },
];
