import type { Divider } from './types';

/**
 * The site's navigation expressed as dividers. Mirrors `data/headerNavLinks`,
 * but a divider carries more than a link does — a hint and the destinations
 * inside the section — because a divider has room the header bar never had.
 * That extra room is the whole argument for the pattern.
 */
export const SITE_DIVIDERS: Divider[] = [
  {
    id: 'blog',
    label: 'BLOG',
    hint: 'Long-form writing on agents, architecture and the toolchain.',
    accent: 'cyan',
    items: [
      { href: '/blog', label: 'All posts', note: 'latest first' },
      { href: '/series', label: 'Series', note: 'multi-part' },
      { href: '/tags', label: 'Tags', note: 'by topic' },
    ],
  },
  {
    id: 'talks',
    label: 'TALKS',
    hint: 'Decks, recordings and the live audience platform.',
    accent: 'pink',
    items: [
      { href: '/talks', label: 'All talks' },
      { href: '/live', label: 'Live session', note: 'realtime' },
    ],
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    hint: 'Things that ship — packages, tools and open source.',
    accent: 'yellow',
    items: [
      { href: '/projects', label: 'Project index' },
      { href: '/experiments', label: 'Experiments', note: 'prototypes' },
    ],
  },
  {
    id: 'ideas',
    label: 'IDEAS',
    hint: 'The workbench: sparks and drafts before they become posts.',
    accent: 'cyan',
    items: [
      { href: '/ideas', label: 'Idea workbench' },
      { href: '/design-sandbox', label: 'Design sandbox' },
    ],
  },
  {
    id: 'about',
    label: 'ABOUT',
    hint: 'Who is writing this, and how to get hold of them.',
    accent: 'white',
    items: [
      { href: '/about', label: 'About' },
      { href: '/cv', label: 'CV', note: 'printable' },
    ],
  },
];
