import { ThemeEngine } from '@rtkelly/mermaid-toolkit';
import mermaid from 'mermaid';
import { useEffect, useId, useState } from 'react';
import type { MermaidDiagramProps } from './types';

const themeEngine = new ThemeEngine({
  preset: 'retro-brutalist',
  customVariables: {
    primaryColor: '#22d3ee',
    secondaryColor: '#ec4899',
    tertiaryColor: '#facc15',
  },
});

/**
 * Mermaid diagram renderer with automatic dark/light theme support
 */
export default function MermaidDiagram({ children }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const id = useId().replace(/:/g, '_');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          fontFamily: 'Courier New, monospace',
          ...themeEngine.getConfig(),
        });

        const diagramDef = children.trim();

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
  }, [children, id, mounted]);

  if (error) {
    return (
      <div className="p-4 text-brutalist-pink bg-zinc-900 border-2 border-brutalist-pink font-mono">
        <p className="font-bold uppercase">[ DIAGRAM_ERROR ]</p>
        <p className="text-sm mt-1">{error}</p>
        <pre className="mt-2 text-xs bg-black p-2 border border-white overflow-x-auto">
          {children}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-zinc-900 border-2 border-white animate-pulse">
        <span className="text-zinc-500 font-mono">RENDERING_DIAGRAM...</span>
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
