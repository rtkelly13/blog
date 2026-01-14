import mermaid, { type MermaidConfig } from 'mermaid';
import { useTheme } from 'next-themes';
import { useEffect, useId, useState } from 'react';
import type { MermaidDiagramProps } from './types';

// Mermaid theme configuration
const lightThemeConfig: Partial<MermaidConfig> = {
  theme: 'base' as const,
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#1f2937',
    primaryBorderColor: '#60a5fa',
    secondaryColor: '#10b981',
    secondaryTextColor: '#1f2937',
    secondaryBorderColor: '#34d399',
    tertiaryColor: '#f3f4f6',
    tertiaryTextColor: '#1f2937',
    tertiaryBorderColor: '#d1d5db',
    lineColor: '#6b7280',
    textColor: '#1f2937',
    mainBkg: '#ffffff',
    nodeBorder: '#9ca3af',
    clusterBkg: '#f9fafb',
    clusterBorder: '#e5e7eb',
    titleColor: '#111827',
    edgeLabelBackground: '#ffffff',
    nodeTextColor: '#1f2937',
  },
};

const darkThemeConfig: Partial<MermaidConfig> = {
  theme: 'base' as const,
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f3f4f6',
    primaryBorderColor: '#60a5fa',
    secondaryColor: '#10b981',
    secondaryTextColor: '#f3f4f6',
    secondaryBorderColor: '#34d399',
    tertiaryColor: '#374151',
    tertiaryTextColor: '#f3f4f6',
    tertiaryBorderColor: '#4b5563',
    lineColor: '#9ca3af',
    textColor: '#f3f4f6',
    mainBkg: '#1f2937',
    nodeBorder: '#6b7280',
    clusterBkg: '#111827',
    clusterBorder: '#374151',
    titleColor: '#f9fafb',
    edgeLabelBackground: '#1f2937',
    nodeTextColor: '#f3f4f6',
  },
};

/**
 * Mermaid diagram renderer with automatic dark/light theme support
 */
export default function MermaidDiagram({ children }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, '_');

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        // Configure mermaid based on current theme
        const isDark = resolvedTheme === 'dark';
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          ...(isDark ? darkThemeConfig : lightThemeConfig),
        });

        // Clean up the diagram definition (trim and normalize whitespace)
        const diagramDef = children.trim();

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${id}`,
          diagramDef,
        );

        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to render diagram',
        );
        setSvg('');
      }
    };

    renderDiagram();
  }, [children, resolvedTheme, id]);

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="font-medium">Diagram Error</p>
        <p className="text-sm mt-1">{error}</p>
        <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-x-auto">
          {children}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <span className="text-gray-400 dark:text-gray-500">
          Rendering diagram...
        </span>
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram w-full max-w-full overflow-x-auto"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid generates safe SVG
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
