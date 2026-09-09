import { useTheme } from 'next-themes';
import { useState } from 'react';

import siteMetadata from '@/data/siteMetadata';
import { isDarkLevel } from '@/lib/themePolarity';

interface Props {
  mapping: string;
}

const Giscus = ({ mapping }: Props) => {
  const [enableLoadComments, setEnabledLoadComments] = useState(true);
  const { theme, resolvedTheme } = useTheme();
  const commentsTheme =
    siteMetadata.comment.giscusConfig.themeURL === ''
      ? // Asked of the design system, so a new level lands on the right side
        // of this on its own. See lib/themePolarity.ts for what this replaced.
        isDarkLevel(resolvedTheme ?? theme)
        ? siteMetadata.comment.giscusConfig.darkTheme
        : siteMetadata.comment.giscusConfig.theme
      : siteMetadata.comment.giscusConfig.themeURL;

  const COMMENTS_ID = 'comments-container';

  function LoadComments() {
    setEnabledLoadComments(false);
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', siteMetadata.comment.giscusConfig.repo);
    script.setAttribute(
      'data-repo-id',
      siteMetadata.comment.giscusConfig.repositoryId,
    );
    script.setAttribute(
      'data-category',
      siteMetadata.comment.giscusConfig.category,
    );
    script.setAttribute(
      'data-category-id',
      siteMetadata.comment.giscusConfig.categoryId,
    );
    script.setAttribute('data-mapping', mapping);
    script.setAttribute(
      'data-reactions-enabled',
      siteMetadata.comment.giscusConfig.reactions,
    );
    script.setAttribute(
      'data-emit-metadata',
      siteMetadata.comment.giscusConfig.metadata,
    );
    script.setAttribute('data-theme', commentsTheme);
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    const comments = document.getElementById(COMMENTS_ID);
    if (comments) comments.appendChild(script);

    return () => {
      const comments = document.getElementById(COMMENTS_ID);
      if (comments) comments.innerHTML = '';
    };
  }

  return (
    <div className="pt-6 pb-6 text-center text-gray-700 dark:text-gray-300">
      {enableLoadComments && (
        <button onClick={LoadComments}>Load Comments</button>
      )}
      <div className="giscus" id={COMMENTS_ID} />
    </div>
  );
};

export default Giscus;
