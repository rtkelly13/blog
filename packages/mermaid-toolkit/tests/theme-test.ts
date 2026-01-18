import { applyThemeToMermaid, ThemeEngine } from '../src/index';

const diagram = `graph LR
  A[Start] --> B{Decision}
  B -->|Yes| C[Good]
  B -->|No| D[Bad]`;

console.log('=== RETRO BRUTALIST THEME ===');
const retroEngine = ThemeEngine.fromPreset('retro-brutalist');
console.log(retroEngine.generateInitCode());
console.log('\nApplied to diagram:');
console.log(applyThemeToMermaid(diagram, { preset: 'retro-brutalist' }));

console.log('\n=== TERMINAL THEME ===');
const terminalEngine = ThemeEngine.fromPreset('terminal');
console.log(terminalEngine.generateInitCode());

console.log('\n=== HIGH CONTRAST THEME ===');
const hcEngine = ThemeEngine.fromPreset('high-contrast');
console.log(hcEngine.generateInitCode());

console.log('\n=== CUSTOM THEME ===');
const customEngine = new ThemeEngine({
  preset: 'retro-brutalist',
  customVariables: {
    primaryColor: '#ff00ff',
    lineColor: '#ff00ff',
  },
});
console.log(customEngine.generateInitCode());
console.log('\nApplied to diagram:');
console.log(customEngine.applyTheme(diagram));
