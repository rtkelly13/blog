import { useEffect } from 'react';
import { spaceGroteskFamily } from '@/lib/fonts';

/**
 * Marks `<html>` with `data-display-font="space-grotesk"` once that webfont has
 * actually loaded. Bracketed headings key an optical-centering nudge off this
 * attribute (see css/tailwind.css) so the correction — which is specific to
 * Space Grotesk's bracket metrics — never applies to the size-adjusted swap
 * fallback or a different display font.
 *
 * Renders nothing. Mounted once in _app, so it never remounts on navigation.
 * `document.fonts.load()` (not just `.check()`) is used because webfonts load
 * lazily: `document.fonts.ready` can resolve before the font is requested,
 * whereas `load()` actively triggers the fetch and resolves when it's ready.
 */
export default function DisplayFontFlag() {
  useEffect(() => {
    if (!document.fonts?.load) return;

    const query = `700 1em ${spaceGroteskFamily}`;
    const mark = () => {
      document.documentElement.dataset.displayFont = 'space-grotesk';
    };

    try {
      if (document.fonts.check(query)) {
        mark();
        return;
      }
      document.fonts.load(query).then((faces) => {
        if (faces.length > 0) mark();
      }, undefined);
    } catch {
      // Font Loading API unavailable / malformed query: leave the flag unset.
    }
  }, []);

  return null;
}
