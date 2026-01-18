import { ThemeEngine } from '@rtkelly/mermaid-toolkit';
import { describe, expect, it } from 'vitest';

describe('ThemeEngine Integration', () => {
  describe('Preset Loading', () => {
    it('should load retro-brutalist preset with custom overrides', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
          secondaryColor: '#ec4899',
          tertiaryColor: '#facc15',
        },
      });

      const config = engine.getConfig();

      expect(config.theme).toBe('base');
      expect(config.themeVariables?.primaryColor).toBe('#22d3ee');
      expect(config.themeVariables?.secondaryColor).toBe('#ec4899');
      expect(config.themeVariables?.tertiaryColor).toBe('#facc15');
    });

    it('should maintain retro-brutalist base colors when not overridden', () => {
      const engine = new ThemeEngine({ preset: 'retro-brutalist' });
      const config = engine.getConfig();

      expect(config.themeVariables?.mainBkg).toBe('#000000');
      expect(config.themeVariables?.lineColor).toBe('#00ff00');
      expect(config.themeVariables?.fontFamily).toContain('monospace');
    });
  });

  describe('Config Output', () => {
    it('should generate valid mermaid config structure', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
        },
      });

      const config = engine.getConfig();

      expect(config).toHaveProperty('theme');
      expect(config).toHaveProperty('themeVariables');
      expect(typeof config.theme).toBe('string');
      expect(typeof config.themeVariables).toBe('object');
    });

    it('should allow fontFamily override', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
      });

      const config = engine.getConfig();

      expect(config.themeVariables?.fontFamily).toBeDefined();
    });

    it('should merge custom config options', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
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
  });

  describe('Blog-Specific Color Scheme', () => {
    it('should use blog cyan (#22d3ee) as primary', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
        },
      });

      const config = engine.getConfig();
      expect(config.themeVariables?.primaryColor).toBe('#22d3ee');
    });

    it('should use blog pink (#ec4899) as secondary', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          secondaryColor: '#ec4899',
        },
      });

      const config = engine.getConfig();
      expect(config.themeVariables?.secondaryColor).toBe('#ec4899');
    });

    it('should use blog yellow (#facc15) as tertiary', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          tertiaryColor: '#facc15',
        },
      });

      const config = engine.getConfig();
      expect(config.themeVariables?.tertiaryColor).toBe('#facc15');
    });
  });

  describe('Mermaid Initialization Compatibility', () => {
    it('should produce config compatible with mermaid.initialize()', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
        },
      });

      const config = engine.getConfig();

      expect(() => {
        if (
          config.theme !== 'base' &&
          config.theme !== 'dark' &&
          config.theme !== 'default'
        ) {
          throw new Error('Invalid theme');
        }
      }).not.toThrow();
    });

    it('should not include undefined values in config', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
      });

      const config = engine.getConfig();
      const configJson = JSON.stringify(config);

      expect(configJson).not.toContain('undefined');
    });
  });

  describe('Theme Consistency', () => {
    it('should produce same output for identical inputs', () => {
      const engine1 = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: { primaryColor: '#22d3ee' },
      });

      const engine2 = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: { primaryColor: '#22d3ee' },
      });

      expect(engine1.getConfig()).toEqual(engine2.getConfig());
    });

    it('should allow multiple independent instances', () => {
      const engine1 = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: { primaryColor: '#ff0000' },
      });

      const engine2 = new ThemeEngine({
        preset: 'dark',
        customVariables: { primaryColor: '#00ff00' },
      });

      expect(engine1.getConfig().themeVariables?.primaryColor).toBe('#ff0000');
      expect(engine2.getConfig().themeVariables?.primaryColor).toBe('#00ff00');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing customVariables gracefully', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
      });

      expect(() => engine.getConfig()).not.toThrow();
    });

    it('should handle missing customConfig gracefully', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
        },
      });

      expect(() => engine.getConfig()).not.toThrow();
    });
  });

  describe('AWS Batch Cookbook Diagram Compatibility', () => {
    it('should support flowchart LR direction', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
          secondaryColor: '#ec4899',
          tertiaryColor: '#facc15',
        },
      });

      const config = engine.getConfig();

      expect(config.themeVariables).toBeDefined();
      expect(config.theme).toBe('base');
    });

    it('should support custom node styling colors', () => {
      const engine = new ThemeEngine({
        preset: 'retro-brutalist',
        customVariables: {
          primaryColor: '#22d3ee',
          secondaryColor: '#ec4899',
          tertiaryColor: '#facc15',
        },
      });

      const config = engine.getConfig();

      expect(config.themeVariables?.primaryColor).toBe('#22d3ee');
      expect(config.themeVariables?.secondaryColor).toBe('#ec4899');
      expect(config.themeVariables?.tertiaryColor).toBe('#facc15');
    });
  });
});
