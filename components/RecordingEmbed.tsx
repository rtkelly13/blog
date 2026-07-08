import { youtubeEmbedUrl } from '@/lib/utils/youtubeEmbed';

/**
 * Inline recording player for a talk. Renders a responsive 16:9 YouTube embed
 * when `url` is a recognisable YouTube link; renders nothing otherwise (the talk
 * page falls back to a "Watch Recording" link for non-embeddable URLs). This is
 * the archival counterpart to the live Convex room — the recording captures the
 * whole projected surface (slides *and* demos), which the slide-sync can't.
 */
export default function RecordingEmbed({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;

  return (
    <section className="mt-10 border-t-2 border-white pt-8">
      <h2 className="mb-4 font-mono text-xs uppercase text-brutalist-cyan">
        Recording
      </h2>
      <div className="relative aspect-video border-2 border-white shadow-hard-md">
        <iframe
          src={embed}
          title={`${title} — recording`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
