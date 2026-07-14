export interface Project {
  title: string;
  description: string;
  href?: string;
  imgSrc?: string;
  /** Header label shown on the card; defaults to `<title>.md` slugified. */
  filename?: string;
  /** Small ASCII decoration rendered in the card header. */
  asciiArt?: string;
}

const projectsData: Project[] = [
  {
    title: 'Mermaid Toolkit',
    description:
      'Mermaid.js theme engine with ASCII rendering. Powers the themed diagrams (and their text-mode fallbacks) on this site.',
    href: 'https://github.com/rtkelly13/mermaid-toolkit',
    filename: 'mermaid_toolkit.ts',
    asciiArt: '◇─◇',
  },
  {
    title: 'This Site',
    description:
      'Next.js + MDX brutalist blog with a live-talks platform: MDX-authored slide decks, presenter view, and Convex-powered audience presence, Q&A, polls, and reactions.',
    href: 'https://github.com/rtkelly13/blog',
    filename: 'ryankelly_dev.mdx',
    asciiArt: '▓▒░',
  },
];

export default projectsData;
