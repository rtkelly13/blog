/* eslint-disable react/display-name */

import type { MDXComponents as MDXComponentsType } from 'mdx/types';
import { getMDXComponent } from 'mdx-bundler/client';
import type React from 'react';
import { useMemo } from 'react';
import Diagram from './diagrams/Diagram';
import Image from './Image';
import CustomLink from './Link';
import NoteBlock from './NoteBlock';
import Pre from './Pre';
import TOCInline from './TOCInline';

const Wrapper: React.ComponentType<{ layout: string }> = ({
  layout,
  ...rest
}) => {
  const Layout = require(`../layouts/${layout}`).default;
  return <Layout {...rest} />;
};

export const MDXComponents: MDXComponentsType = {
  Image: Image as any,
  TOCInline,
  Diagram,
  NoteBlock,
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
