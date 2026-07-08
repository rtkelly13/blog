/**
 * Turn a YouTube watch / youtu.be / live / shorts / embed URL into its
 * privacy-enhanced (`youtube-nocookie`) embed URL, or return null when the
 * string isn't a recognisable YouTube link. The talk page uses this to decide
 * whether a talk's `videoUrl` renders as an inline player (YouTube) or a plain
 * "Watch Recording" link (anything else — Vimeo, a raw file, etc.).
 */
export function youtubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1).split('/')[0] || null;
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else {
      const match = parsed.pathname.match(
        /^\/(?:embed|live|shorts|v)\/([^/]+)/,
      );
      id = match ? match[1] : null;
    }
  }

  // A YouTube video id is exactly 11 URL-safe chars. Anything else (a channel
  // link, a truncated path) falls back to null so the caller shows a link.
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
