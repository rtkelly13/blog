import { describe, expect, it } from 'vitest';
import {
  applyThemeToMermaid,
  generateMermaidConfig,
  ThemeEngine,
} from '../src/theme-engine';
import { THEME_PRESETS } from '../src/theme-presets';
import type { MermaidConfig, ThemePreset } from '../src/theme-types';

describe('ThemeEngine', () => {
  describe('constructor', () => {
    it('creates engine with preset only', () => {
      const engine = new ThemeEngine({ preset: 'retro-brutalist' });
      const config = engine.getConfig();

      expect(config.theme).toBe('base');
      expect(config.themeVariables?.primaryColor).toBe('#00ff00');
      expect(config.themeVariables?.fontFamily).toContain('monospace');
    });

    it('creates engine with preset and custom variables', () => {
      const engine = new ThemeEngine({
        preset: 'dark',
        customVariables: {
          primaryColor: '#ff0000',
          fontSize: '20px',
        },
      });
      const config = engine.getConfig();

      expect(config.themeVariables?.primaryColor).toBe('#ff0000');
      expect(config.themeVariables?.fontSize).toBe('20px');
    });

    it('creates engine with custom config overrides', () => {
      const engine = new ThemeEngine({
        preset: 'default',
        customConfig: {
          flowchart: {
            curve: 'basis',
            padding: 20,
          },
        },
      });
      const config = engine.getConfig();

      expect(config.flowchart?.curve).toBe('basis');
      expect(config.flowchart?.padding).toBe(20);
    });

    it('merges all options correctly', () => {
      const engine = new ThemeEngine({
        preset: 'terminal',
        customVariables: { primaryColor: '#00ff41' },
        customConfig: { flowchart: { padding: 15 } },
      });
      const config = engine.getConfig();

      expect(config.theme).toBe('base');
      expect(config.themeVariables?.primaryColor).toBe('#00ff41');
      expect(config.flowchart?.padding).toBe(15);
    });
  });

  describe('setThemeVariable', () => {
    it('updates individual theme variable', () => {
      const engine = new ThemeEngine({ preset: 'default' });
      engine.setThemeVariable('primaryColor', '#123456');

      const config = engine.getConfig();
      expect(config.themeVariables?.primaryColor).toBe('#123456');
    });

    it('adds new theme variable', () => {
      const engine = new ThemeEngine({ preset: 'default' });
      engine.setThemeVariable('lineColor', '#abcdef');

      const config = engine.getConfig();
      expect(config.themeVariables?.lineColor).toBe('#abcdef');
    });
  });

  describe('setFlowchartConfig', () => {
    it('updates flowchart configuration', () => {
      const engine = new ThemeEngine({ preset: 'default' });
      engine.setFlowchartConfig({ curve: 'linear', padding: 25 });

      const config = engine.getConfig();
      expect(config.flowchart?.curve).toBe('linear');
      expect(config.flowchart?.padding).toBe(25);
    });
  });

  describe('setSequenceConfig', () => {
    it('updates sequence diagram configuration', () => {
      const engine = new ThemeEngine({ preset: 'default' });
      engine.setSequenceConfig({ mirrorActors: true, rightAngles: false });

      const config = engine.getConfig();
      expect(config.sequence?.mirrorActors).toBe(true);
      expect(config.sequence?.rightAngles).toBe(false);
    });
  });

  describe('generateInitCode', () => {
    it('generates valid JavaScript initialization code', () => {
      const engine = new ThemeEngine({ preset: 'retro-brutalist' });
      const code = engine.generateInitCode();

      expect(code).toContain('mermaid.initialize(');
      expect(code).toContain('"theme": "base"');
      expect(code).toContain('"primaryColor": "#00ff00"');
      expect(code).toContain(');');
    });

    it('generates parseable JSON in init code', () => {
      const engine = new ThemeEngine({ preset: 'dark' });
      const code = engine.generateInitCode();

      const jsonMatch = code.match(/mermaid\.initialize\(([\s\S]+)\);/);
      expect(jsonMatch).toBeTruthy();

      const config = JSON.parse(jsonMatch![1]);
      expect(config.theme).toBe('dark');
    });
  });

  describe('generateTheme', () => {
    it('returns theme object with config and init code', () => {
      const engine = new ThemeEngine({ preset: 'high-contrast' });
      const theme = engine.generateTheme();

      expect(theme.config).toBeDefined();
      expect(theme.initCode).toContain('mermaid.initialize(');
      expect(theme.config.theme).toBe('base');
    });
  });

  describe('applyTheme', () => {
    it('injects theme directive into mermaid code', () => {
      const engine = new ThemeEngine({ preset: 'pastel' });
      const diagram = 'graph LR\n  A --> B';
      const themed = engine.applyTheme(diagram);

      expect(themed).toContain('%%{init:');
      expect(themed).toContain('"theme":"base"');
      expect(themed).toContain('graph LR');
    });

    it('preserves original diagram code', () => {
      const engine = new ThemeEngine({ preset: 'default' });
      const diagram = 'sequenceDiagram\n  Alice->>Bob: Hello';
      const themed = engine.applyTheme(diagram);

      expect(themed).toContain('sequenceDiagram');
      expect(themed).toContain('Alice->>Bob: Hello');
    });

    it('generates valid directive format', () => {
      const engine = new ThemeEngine({ preset: 'terminal' });
      const themed = engine.applyTheme('graph TD\n  A --> B');

      const lines = themed.split('\n');
      expect(lines[0]).toMatch(/^%%\{init:/);
      expect(lines[0]).toMatch(/\}%%$/);
    });
  });

  describe('fromPreset', () => {
    it('creates engine from preset name', () => {
      const engine = ThemeEngine.fromPreset('retro-brutalist');
      const config = engine.getConfig();

      expect(config.themeVariables?.primaryColor).toBe('#00ff00');
    });

    it('works with all preset names', () => {
      const presets: ThemePreset[] = [
        'retro-brutalist',
        'terminal',
        'high-contrast',
        'pastel',
        'dark',
        'default',
      ];

      for (const preset of presets) {
        const engine = ThemeEngine.fromPreset(preset);
        expect(engine.getConfig()).toBeDefined();
      }
    });
  });

  describe('custom', () => {
    it('creates engine with custom configuration', () => {
      const customConfig: Partial<MermaidConfig> = {
        theme: 'base',
        themeVariables: {
          primaryColor: '#custom',
          fontFamily: 'Custom Font',
        },
      };

      const engine = ThemeEngine.custom(customConfig);
      const config = engine.getConfig();

      expect(config.themeVariables?.primaryColor).toBe('#custom');
      expect(config.themeVariables?.fontFamily).toBe('Custom Font');
    });
  });
});

describe('applyThemeToMermaid helper', () => {
  it('applies theme with preset', () => {
    const diagram = 'graph LR\n  A --> B';
    const themed = applyThemeToMermaid(diagram, { preset: 'dark' });

    expect(themed).toContain('%%{init:');
    expect(themed).toContain('graph LR');
  });

  it('applies theme with custom variables', () => {
    const diagram = 'graph TD\n  Start --> End';
    const themed = applyThemeToMermaid(diagram, {
      preset: 'default',
      customVariables: { primaryColor: '#test' },
    });

    expect(themed).toContain('%%{init:');
    expect(themed).toContain('"primaryColor":"#test"');
  });
});

describe('generateMermaidConfig helper', () => {
  it('generates config from options', () => {
    const config = generateMermaidConfig({ preset: 'retro-brutalist' });

    expect(config.theme).toBe('base');
    expect(config.themeVariables?.primaryColor).toBe('#00ff00');
  });

  it('merges custom variables', () => {
    const config = generateMermaidConfig({
      preset: 'dark',
      customVariables: { fontSize: '18px' },
    });

    expect(config.themeVariables?.fontSize).toBe('18px');
  });
});

describe('Theme Presets', () => {
  describe('retro-brutalist', () => {
    it('has green-on-black terminal aesthetic', () => {
      const config = THEME_PRESETS['retro-brutalist'];

      expect(config.themeVariables?.primaryColor).toBe('#00ff00');
      expect(config.themeVariables?.background).toBe('#000000');
      expect(config.themeVariables?.fontFamily).toContain('monospace');
      expect(config.themeVariables?.darkMode).toBe(true);
    });

    it('uses linear curves and sharp corners', () => {
      const config = THEME_PRESETS['retro-brutalist'];

      expect(config.flowchart?.curve).toBe('linear');
      expect(config.sequence?.rightAngles).toBe(true);
    });
  });

  describe('terminal', () => {
    it('has IBM Plex Mono font', () => {
      const config = THEME_PRESETS.terminal;

      expect(config.themeVariables?.fontFamily).toContain('IBM Plex Mono');
    });

    it('has classic green terminal color', () => {
      const config = THEME_PRESETS.terminal;

      expect(config.themeVariables?.primaryColor).toBe('#33ff33');
    });
  });

  describe('high-contrast', () => {
    it('has accessibility-focused colors', () => {
      const config = THEME_PRESETS['high-contrast'];

      expect(config.themeVariables?.primaryColor).toBe('#ffffff');
      expect(config.themeVariables?.background).toBe('#ffffff');
      expect(config.themeVariables?.lineColor).toBe('#000000');
    });

    it('has larger font size', () => {
      const config = THEME_PRESETS['high-contrast'];

      expect(config.themeVariables?.fontSize).toBe('18px');
    });
  });

  describe('pastel', () => {
    it('has soft modern colors', () => {
      const config = THEME_PRESETS.pastel;

      expect(config.themeVariables?.primaryColor).toBe('#b8e6d5');
      expect(config.themeVariables?.secondaryColor).toBe('#e6b8d5');
      expect(config.themeVariables?.tertiaryColor).toBe('#d5e6b8');
    });
  });

  describe('dark and default', () => {
    it('dark theme uses base', () => {
      const config = THEME_PRESETS.dark;
      expect(config.theme).toBe('dark');
    });

    it('default theme uses base', () => {
      const config = THEME_PRESETS.default;
      expect(config.theme).toBe('default');
    });
  });

  it('all presets have valid structure', () => {
    const presets: ThemePreset[] = [
      'retro-brutalist',
      'terminal',
      'high-contrast',
      'pastel',
      'dark',
      'default',
    ];

    for (const preset of presets) {
      const config = THEME_PRESETS[preset];
      expect(config).toBeDefined();
      expect(config.theme).toBeDefined();
    }
  });
});

describe('Type Safety', () => {
  it('ThemeEngine constructor accepts valid options', () => {
    const validOptions = {
      preset: 'retro-brutalist' as ThemePreset,
      customVariables: {
        primaryColor: '#test',
        fontSize: '16px',
      },
      customConfig: {
        flowchart: {
          curve: 'basis' as const,
          padding: 10,
        },
      },
    };

    const engine = new ThemeEngine(validOptions);
    expect(engine).toBeDefined();
  });

  it('setThemeVariable accepts valid keys', () => {
    const engine = new ThemeEngine({ preset: 'default' });

    engine.setThemeVariable('primaryColor', '#test');
    engine.setThemeVariable('fontSize', '14px');
    engine.setThemeVariable('fontFamily', 'Arial');

    expect(engine.getConfig().themeVariables).toBeDefined();
  });
});
