import { getMDXComponent } from 'mdx-bundler/client';
import { useMemo } from 'react';
import { MDXComponents } from '@/components/MDXComponents';
import { withoutLiveComponents } from './liveComponents';

// Slides are standalone fragments with no layout, so drop the `wrapper`
// component (which would try to require `../layouts/<layout>` and crash).
const { wrapper: _wrapper, ...slideComponents } = MDXComponents;

// Built once rather than per render: the map is the same for every slide, and
// rebuilding it would give `MDXContent` a new `components` object each time.
const renderComponents = withoutLiveComponents(slideComponents);

interface SlideBodyProps {
  /** Compiled MDX code string for a single slide. */
  code: string;
  /**
   * Leave out the components that only mean something in a live room — the
   * poll, the question queue, the timers.
   *
   * For a surface with no Convex behind it and nobody to participate: a frame
   * renderer, a print export. Without this those components render whatever
   * they do with no data, which is a loading state or a zero count baked into
   * the output — worse than absence, because it looks like a bug rather than a
   * choice. See `liveComponents.ts`.
   */
  omitLive?: boolean;
}

/**
 * Renders one compiled slide's MDX body with the shared component map, so
 * <Diagram>, <NoteBlock>, code highlighting etc. work inside a Spectacle slide.
 * Each instance calls `getMDXComponent` exactly once (Rules of Hooks).
 */
export default function SlideBody({ code, omitLive = false }: SlideBodyProps) {
  const MDXContent = useMemo(() => getMDXComponent(code), [code]);

  // Fill the slide's full height and center the content vertically so sparse
  // slides read as intentional (not top-clustered with empty space below), and
  // size text up (prose-xl) for projection. The densest slide still fits 768px.
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="prose prose-invert prose-xl max-w-none">
        <MDXContent
          components={omitLive ? renderComponents : slideComponents}
        />
      </div>
    </div>
  );
}
