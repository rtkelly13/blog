import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { SvgDiagramProps } from './types';

/**
 * SVG diagram renderer with optional dark mode source
 *
 * Supports two modes:
 * 1. Single source with CSS variable theming (recommended for new diagrams)
 * 2. Dual source with darkSrc for different light/dark versions
 */
export default function SvgDiagram({ src, darkSrc }: SvgDiagramProps) {
  const { resolvedTheme } = useTheme();
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchSvg = async () => {
      try {
        // Choose source based on theme if darkSrc is provided
        const isDark = resolvedTheme === 'dark';
        const svgSrc = darkSrc && isDark ? darkSrc : src;

        const response = await fetch(svgSrc);
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.statusText}`);
        }

        let content = await response.text();

        // Add theme-aware class to the SVG for CSS variable support
        content = content.replace(/<svg/, '<svg class="diagram-svg"');

        setSvgContent(content);
        setError(null);
      } catch (err) {
        console.error('SVG loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load SVG');
        setSvgContent(null);
      }
    };

    fetchSvg();
  }, [src, darkSrc, resolvedTheme, mounted]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <span className="text-gray-400 dark:text-gray-500">
          Loading diagram...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="font-medium">Failed to load diagram</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs mt-2 text-gray-500">Source: {src}</p>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <span className="text-gray-400 dark:text-gray-500">
          Loading diagram...
        </span>
      </div>
    );
  }

  return (
    <div
      className="svg-diagram w-full max-w-full overflow-x-auto flex justify-center"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Loading trusted SVG files
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
