export interface Project {
  title: string;
  description: string;
  href?: string;
  imgSrc?: string;
  /** Header label shown on the card; defaults to `<title>.md` slugified. */
  filename?: string;
  /** Small ASCII decoration rendered in the card header. */
  asciiArt?: string;
  tags?: string[];
}

const projectsData: Project[] = [
  {
    title: 'Parquet.SourceGenerator',
    description:
      'Zero-reflection C# Roslyn source generator emitting compile-time serializers and deserializers for Parquet.Net. Up to 2.1x faster writes and 57% lower memory overhead with Native AOT verification.',
    href: 'https://github.com/rtkelly13/Parquet.SourceGenerator',
    filename: 'parquet_source_gen.cs',
    asciiArt: '⚡─⚡',
    tags: [
      'C#',
      'Roslyn',
      'Parquet',
      'Source Generator',
      'Native AOT',
      'NuGet',
    ],
  },
  {
    title: 'Parquet.TypeProvider',
    description:
      'High-performance F# Type Provider for Apache Parquet files, providing compile-time strongly typed schema inference and zero-boilerplate data exploration for .fsx scripts, notebooks, and pipelines.',
    href: 'https://github.com/rtkelly13/Parquet.TypeProvider',
    filename: 'parquet_type_provider.fs',
    asciiArt: 'λ─λ',
    tags: ['F#', 'Type Provider', 'Parquet', 'Data Engineering', 'NuGet'],
  },
  {
    title: 'Mermaid Toolkit',
    description:
      'Mermaid.js theme engine with ASCII rendering. Powers the themed diagrams and dual-mode sketch/neon fallbacks on this site.',
    href: 'https://github.com/rtkelly13/mermaid-toolkit',
    filename: 'mermaid_toolkit.ts',
    asciiArt: '◇─◇',
    tags: ['TypeScript', 'Mermaid.js', 'ASCII', 'Design System'],
  },
  {
    title: 'Resultful',
    description:
      'Open-source libraries enabling robust, exceptionless railway-oriented programming with functional error handling patterns in .NET.',
    href: 'https://github.com/Resultful',
    filename: 'resultful.cs',
    asciiArt: '►─►',
    tags: ['.NET', 'C#', 'F#', 'Functional Programming'],
  },
  {
    title: 'Procedural 3D Mazes',
    description:
      '3D procedural maze generator built in Unity 3D with C#, exploring statistical graph properties of generated spaces and graph traversal metrics.',
    href: 'https://github.com/rtkelly13/ProceduralGeneration3DMazes',
    filename: 'procedural_mazes.cs',
    asciiArt: '▓▒░',
    tags: ['Unity 3D', 'C#', 'Algorithms', 'Graph Theory'],
  },
  {
    title: 'This Site & Live Talk Platform',
    description:
      'Next.js + MDX brutalist blog with an interactive live-talks platform: slide decks, presenter view, and Convex-powered audience presence, live Q&A, and reactions.',
    href: 'https://github.com/rtkelly13/blog',
    filename: 'ryankelly_dev.mdx',
    asciiArt: '★─★',
    tags: ['Next.js', 'React', 'Tailwind CSS', 'Convex', 'MDX'],
  },
];

export default projectsData;
