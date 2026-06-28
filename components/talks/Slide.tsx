import { getMDXComponent } from 'mdx-bundler/client';
import { useMemo } from 'react';
import { MDXComponents } from '@/components/MDXComponents';

// Slides are standalone fragments with no layout, so drop the `wrapper`
// component (which would try to require `../layouts/<layout>` and crash).
const { wrapper: _wrapper, ...slideComponents } = MDXComponents;

interface SlideProps {
  /** Compiled MDX code string for a single slide. */
  code: string;
}

/**
 * Renders one compiled slide. Each slide is its own component instance so that
 * `getMDXComponent` is called exactly once per render (Rules of Hooks). Slides
 * share the same component map as blog posts, so <Diagram>, <NoteBlock> etc.
 * work inside a deck.
 */
export default function Slide({ code }: SlideProps) {
  const MDXContent = useMemo(() => getMDXComponent(code), [code]);

  return (
    <div className="slide-content prose prose-invert max-w-none font-mono">
      <MDXContent components={slideComponents} />
    </div>
  );
}
