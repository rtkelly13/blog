import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SocialIcon from '../components/social-icons';
import { BlueskyIcon } from '../components/social-icons/icons';

describe('SocialIcon component', () => {
  it('renders nothing when href is omitted or empty', () => {
    const html1 = renderToStaticMarkup(
      React.createElement(SocialIcon, { kind: 'bluesky', href: '' }),
    );
    expect(html1).toBe('');

    const html2 = renderToStaticMarkup(
      React.createElement(SocialIcon, { kind: 'github', href: undefined }),
    );
    expect(html2).toBe('');
  });

  it('renders a Bluesky link with correct attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(SocialIcon, {
        kind: 'bluesky',
        href: 'https://bsky.app/profile/rtkelly.dev',
      }),
    );

    expect(html).toContain('href="https://bsky.app/profile/rtkelly.dev"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Bluesky icon');
  });

  it('exports BlueskyIcon SVG component', () => {
    expect(BlueskyIcon).toBeDefined();
  });
});
