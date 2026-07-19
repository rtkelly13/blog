/* eslint-disable react/display-name */

import type { MDXComponents as MDXComponentsType } from 'mdx/types';
import { getMDXComponent } from 'mdx-bundler/client';
import dynamic from 'next/dynamic';
import type React from 'react';
import { useMemo } from 'react';
import Diagram from './diagrams/Diagram';
import Image from './Image';
import IdeaSlide from './interactive/IdeaSlide';
import CustomLink from './Link';
import NoteBlock from './NoteBlock';
import Pre from './Pre';
import References from './References';
import TalkStatsChart from './TalkStatsChart';
import TOCInline from './TOCInline';
import {
  BreakTimer,
  EmojiTop5,
  LivePoll,
  OrderedActions,
  QuestionQueue,
} from './talks';

const Wrapper: React.ComponentType<{ layout: string }> = ({
  layout,
  ...rest
}) => {
  const Layout = require(`../layouts/${layout}`).default;
  return <Layout {...rest} />;
};

// Interactive components are heavy (motion, @xyflow/react), so they load as
// separate client chunks only on pages that actually mount them — same pattern
// as the Mermaid renderer inside Diagram. IdeaSlide stays a static import: it's
// a dependency-free marker component the deck reads its slides from.
const InteractiveLoading = () => (
  <div className="my-6 flex h-32 w-full animate-pulse items-center justify-center border-2 border-white bg-zinc-900">
    <span className="font-mono text-zinc-500">LOADING_INTERACTIVE...</span>
  </div>
);

const IdeaDeck = dynamic(() => import('./interactive/IdeaDeck'), {
  ssr: false,
  loading: InteractiveLoading,
});

const Walkthrough = dynamic(() => import('./interactive/Walkthrough'), {
  ssr: false,
  loading: InteractiveLoading,
});

const QueryRouter = dynamic(() => import('./interactive/QueryRouter'), {
  ssr: false,
  loading: InteractiveLoading,
});

const Terminal = dynamic(() => import('./interactive/Terminal'), {
  ssr: false,
  loading: InteractiveLoading,
});

const FileTree = dynamic(() => import('./interactive/FileTree'), {
  ssr: false,
  loading: InteractiveLoading,
});

const MapReduceViz = dynamic(() => import('./interactive/MapReduceViz'), {
  ssr: false,
  loading: InteractiveLoading,
});

const RailwayTrack = dynamic(() => import('./interactive/RailwayTrack'), {
  ssr: false,
  loading: InteractiveLoading,
});

const MvuLoop = dynamic(() => import('./interactive/MvuLoop'), {
  ssr: false,
  loading: InteractiveLoading,
});

const DepResolve = dynamic(() => import('./interactive/DepResolve'), {
  ssr: false,
  loading: InteractiveLoading,
});

export const MDXComponents: MDXComponentsType = {
  Image: Image as any,
  TOCInline,
  Diagram,
  NoteBlock,
  References,
  DepResolve,
  FileTree,
  IdeaDeck,
  IdeaSlide,
  MapReduceViz,
  MvuLoop,
  RailwayTrack,
  QueryRouter,
  Terminal,
  Walkthrough,
  BreakTimer,
  EmojiTop5,
  LivePoll,
  OrderedActions,
  QuestionQueue,
  TalkStatsChart,
  a: CustomLink,
  pre: Pre,
  wrapper: Wrapper,
};

interface Props {
  layout: string;
  mdxSource: string;
  [key: string]: unknown;
}

export const MDXLayoutRenderer = ({ layout, mdxSource, ...rest }: Props) => {
  const MDXLayout = useMemo(() => getMDXComponent(mdxSource), [mdxSource]);

  return <MDXLayout layout={layout} components={MDXComponents} {...rest} />;
};
