import { getMDXComponent } from 'mdx-bundler/client';
import { useMemo } from 'react';
import { MDXComponents } from '@/components/MDXComponents';

// Slides are standalone fragments with no layout, so drop the `wrapper`
// component (which would try to require `../layouts/<layout>` and crash).
const { wrapper: _wrapper, ...slideComponents } = MDXComponents;

interface SlideBodyProps {
  /** Compiled MDX code string for a single slide. */
  code: string;
}

/**
 * Renders one compiled slide's MDX body with the shared component map, so
 * <Diagram>, <NoteBlock>, code highlighting etc. work inside a Spectacle slide.
 * Each instance calls `getMDXComponent` exactly once (Rules of Hooks).
 */
export default function SlideBody({ code }: SlideBodyProps) {
  const MDXContent = useMemo(() => getMDXComponent(code), [code]);

  // Fill the slide's full height and center the content vertically so sparse
  // slides read as intentional (not top-clustered with empty space below), and
  // size text up (prose-xl) for projection. The densest slide still fits 768px.
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="prose prose-invert prose-xl max-w-none">
        <MDXContent components={slideComponents} />
      </div>
    </div>
  );
}
