import { buildHeaderSvg } from '@/lib/og/headerImage';

interface PostHeaderImageProps {
  title: string;
  slug: string;
  tags?: string[];
  date?: string;
  /** Aspect variant: on-page hero (2:1) vs social card (1.91:1). */
  variant?: 'banner' | 'og';
  className?: string;
}

/**
 * Deterministic, asset-free post hero. Renders the shared SVG engine inline so
 * the on-page banner is pixel-identical to the rasterised OG card produced by
 * `scripts/generate-og-images.mjs` (both call `buildHeaderSvg`). Inline SVG
 * means no network request and crisp rendering at any size; the site's loaded
 * webfonts apply automatically.
 */
export default function PostHeaderImage({
  title,
  slug,
  tags,
  date,
  variant = 'banner',
  className,
}: PostHeaderImageProps) {
  const dims =
    variant === 'og'
      ? { width: 1200, height: 630 }
      : { width: 1200, height: 600 };

  const svg = buildHeaderSvg({ title, slug, tags, date, ...dims });

  // Non-user SVG generated locally from post metadata (text is XML-escaped
  // inside the engine), so inlining it is safe.
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
