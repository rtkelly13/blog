import { getPresetConfig } from './theme-presets';
import type {
  GeneratedTheme,
  MermaidConfig,
  MermaidThemeVariables,
  ThemeEngineOptions,
} from './theme-types';

export class ThemeEngine {
  private config: MermaidConfig;

  constructor(options: ThemeEngineOptions = {}) {
    if (options.preset) {
      this.config = getPresetConfig(options.preset);
    } else {
      this.config = {};
    }

    if (options.customConfig) {
      this.config = this.mergeConfigs(this.config, options.customConfig);
    }

    if (options.customVariables) {
      this.config.themeVariables = {
        ...this.config.themeVariables,
        ...options.customVariables,
      };
    }
  }

  private mergeConfigs(
    base: MermaidConfig,
    override: MermaidConfig,
  ): MermaidConfig {
    return {
      ...base,
      ...override,
      themeVariables: {
        ...base.themeVariables,
        ...override.themeVariables,
      },
      flowchart: {
        ...base.flowchart,
        ...override.flowchart,
      },
      sequence: {
        ...base.sequence,
        ...override.sequence,
      },
      gantt: {
        ...base.gantt,
        ...override.gantt,
      },
      class: {
        ...base.class,
        ...override.class,
      },
      state: {
        ...base.state,
        ...override.state,
      },
      er: {
        ...base.er,
        ...override.er,
      },
      pie: {
        ...base.pie,
        ...override.pie,
      },
      gitGraph: {
        ...base.gitGraph,
        ...override.gitGraph,
      },
      journey: {
        ...base.journey,
        ...override.journey,
      },
    };
  }

  getConfig(): MermaidConfig {
    return this.config;
  }

  setThemeVariable(
    key: keyof MermaidThemeVariables,
    value: string | boolean,
  ): void {
    if (!this.config.themeVariables) {
      this.config.themeVariables = {};
    }
    (this.config.themeVariables as any)[key] = value;
  }

  setFlowchartConfig(config: MermaidConfig['flowchart']): void {
    this.config.flowchart = {
      ...this.config.flowchart,
      ...config,
    };
  }

  setSequenceConfig(config: MermaidConfig['sequence']): void {
    this.config.sequence = {
      ...this.config.sequence,
      ...config,
    };
  }

  generateInitCode(): string {
    const configJson = JSON.stringify(this.config, null, 2);
    return `mermaid.initialize(${configJson});`;
  }

  generateTheme(): GeneratedTheme {
    return {
      config: this.config,
      initCode: this.generateInitCode(),
    };
  }

  applyTheme(mermaidCode: string): string {
    const lines = mermaidCode.trim().split('\n');
    const firstLine = lines[0];

    const directiveComment = `%%{init: ${JSON.stringify(this.config)}}%%`;

    if (firstLine.startsWith('%%{init:')) {
      lines[0] = directiveComment;
    } else {
      lines.unshift(directiveComment);
    }

    return lines.join('\n');
  }

  static fromPreset(presetName: ThemeEngineOptions['preset']): ThemeEngine {
    return new ThemeEngine({ preset: presetName });
  }

  static custom(config: MermaidConfig): ThemeEngine {
    return new ThemeEngine({ customConfig: config });
  }
}

export function applyThemeToMermaid(
  mermaidCode: string,
  options: ThemeEngineOptions,
): string {
  const engine = new ThemeEngine(options);
  return engine.applyTheme(mermaidCode);
}

export function generateMermaidConfig(
  options: ThemeEngineOptions,
): MermaidConfig {
  const engine = new ThemeEngine(options);
  return engine.getConfig();
}
