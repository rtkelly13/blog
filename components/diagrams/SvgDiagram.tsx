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
      <div className="flex items-center justify-center w-full h-32 bg-zinc-900 border-2 border-white animate-pulse">
        <span className="text-zinc-500 font-mono">LOADING_DIAGRAM...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-brutalist-pink bg-zinc-900 border-2 border-brutalist-pink font-mono">
        <p className="font-bold uppercase">[ DIAGRAM_LOAD_ERROR ]</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs mt-2 text-zinc-500">Source: {src}</p>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-zinc-900 border-2 border-white animate-pulse">
        <span className="text-zinc-500 font-mono">LOADING_DIAGRAM...</span>
      </div>
    );
  }

  return (
    <div
      className="svg-diagram w-full max-w-full overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
