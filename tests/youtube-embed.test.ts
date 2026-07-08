import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl } from '../lib/utils/youtubeEmbed';

const EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('youtubeEmbedUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?t=42',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ])('embeds YouTube URL: %s', (url) => {
    expect(youtubeEmbedUrl(url)).toBe(EMBED);
  });

  it('keeps extra query params off the embed (only the id is used)', () => {
    expect(
      youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc'),
    ).toBe(EMBED);
  });

  it.each([
    'https://vimeo.com/123456789',
    'https://example.com/talk.mp4',
    '/talks/foo/present?printMode=true',
    'not a url',
    '',
    // A channel/playlist link is not a single video.
    'https://www.youtube.com/@someone',
    'https://www.youtube.com/playlist?list=PL123',
    // An id of the wrong length is rejected rather than embedded blindly.
    'https://youtu.be/short',
  ])('returns null for non-embeddable URL: %s', (url) => {
    expect(youtubeEmbedUrl(url)).toBeNull();
  });
});
