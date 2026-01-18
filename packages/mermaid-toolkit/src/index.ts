import { DEFAULT_OPTIONS, getBoxChars } from './constants';
import { parseMermaid } from './parser';
import { FlowchartRenderer } from './renderers/flowchart';
import type { AsciiOptions, RenderResult } from './types';

export {
  applyThemeToMermaid,
  generateMermaidConfig,
  ThemeEngine,
} from './theme-engine';
export { getPresetConfig, THEME_PRESETS } from './theme-presets';
export type {
  GeneratedTheme,
  MermaidConfig,
  MermaidThemeVariables,
  ThemeEngineOptions,
  ThemePreset,
} from './theme-types';
export type {
  AsciiOptions,
  FlowchartDiagram,
  ParsedDiagram,
  RenderResult,
  SequenceDiagram,
} from './types';

export function mermaidToAscii(
  mermaidCode: string,
  options: AsciiOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const result = renderMermaid(mermaidCode, opts);
    if (result.error) {
      return createFallbackOutput(mermaidCode, result.error);
    }
    return result.ascii;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createFallbackOutput(mermaidCode, message);
  }
}

function renderMermaid(
  code: string,
  options: Required<AsciiOptions>,
): RenderResult {
  const diagram = parseMermaid(code);

  if (!diagram) {
    return {
      ascii: '',
      width: 0,
      height: 0,
      error: `Unsupported diagram type. Only 'graph', 'flowchart', and 'sequenceDiagram' are supported.`,
    };
  }

  const chars = getBoxChars(options);

  if (diagram.type === 'flowchart') {
    const renderer = new FlowchartRenderer(
      chars,
      options.paddingX,
      options.paddingY,
      options.borderPadding,
    );
    const ascii = renderer.render(diagram);
    const dimensions = renderer.getDimensions();
    return {
      ascii,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  if (diagram.type === 'sequence') {
    return {
      ascii: '[Sequence diagram rendering not yet implemented]',
      width: 0,
      height: 0,
    };
  }

  return {
    ascii: '',
    width: 0,
    height: 0,
    error: 'Unknown error occurred',
  };
}

function createFallbackOutput(originalCode: string, error: string): string {
  return `[ASCII RENDER ERROR]
${error}

Original Mermaid code:
\`\`\`mermaid
${originalCode}
\`\`\``;
}
