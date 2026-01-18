import type {
  MermaidConfig,
  MermaidThemeVariables,
  ThemePreset,
} from './theme-types';

export const RETRO_BRUTALIST_THEME: MermaidThemeVariables = {
  primaryColor: '#00ff00',
  primaryTextColor: '#00ff00',
  primaryBorderColor: '#00ff00',
  lineColor: '#00ff00',
  secondaryColor: '#ff00ff',
  tertiaryColor: '#ffff00',
  background: '#000000',
  mainBkg: '#000000',
  secondBkg: '#1a1a1a',
  mainContrastColor: '#00ff00',
  darkMode: true,
  fontFamily: 'monospace, "Courier New", Courier',
  fontSize: '16px',
  nodeBorder: '#00ff00',
  clusterBkg: '#0a0a0a',
  clusterBorder: '#00ff00',
  defaultLinkColor: '#00ff00',
  titleColor: '#00ff00',
  edgeLabelBackground: '#000000',
  actorBorder: '#00ff00',
  actorBkg: '#000000',
  actorTextColor: '#00ff00',
  actorLineColor: '#00ff00',
  signalColor: '#00ff00',
  signalTextColor: '#00ff00',
  labelBoxBkgColor: '#000000',
  labelBoxBorderColor: '#00ff00',
  labelTextColor: '#00ff00',
  loopTextColor: '#00ff00',
  noteBorderColor: '#ffff00',
  noteBkgColor: '#1a1a00',
  noteTextColor: '#ffff00',
  activationBorderColor: '#00ff00',
  activationBkgColor: '#003300',
  sequenceNumberColor: '#00ff00',
};

export const TERMINAL_THEME: MermaidThemeVariables = {
  primaryColor: '#33ff33',
  primaryTextColor: '#33ff33',
  primaryBorderColor: '#33ff33',
  lineColor: '#33ff33',
  secondaryColor: '#3333ff',
  tertiaryColor: '#ff3333',
  background: '#0c0c0c',
  mainBkg: '#0c0c0c',
  secondBkg: '#1c1c1c',
  mainContrastColor: '#33ff33',
  darkMode: true,
  fontFamily: '"IBM Plex Mono", "Consolas", monospace',
  fontSize: '14px',
  nodeBorder: '#33ff33',
  clusterBkg: '#0a0a0a',
  clusterBorder: '#33ff33',
  defaultLinkColor: '#33ff33',
  titleColor: '#33ff33',
  edgeLabelBackground: '#0c0c0c',
};

export const HIGH_CONTRAST_THEME: MermaidThemeVariables = {
  primaryColor: '#ffffff',
  primaryTextColor: '#000000',
  primaryBorderColor: '#000000',
  lineColor: '#000000',
  secondaryColor: '#ffff00',
  tertiaryColor: '#00ffff',
  background: '#ffffff',
  mainBkg: '#ffffff',
  secondBkg: '#f0f0f0',
  mainContrastColor: '#000000',
  darkMode: false,
  fontFamily: 'Arial, sans-serif',
  fontSize: '18px',
  nodeBorder: '#000000',
  clusterBkg: '#f5f5f5',
  clusterBorder: '#000000',
  defaultLinkColor: '#000000',
  titleColor: '#000000',
  edgeLabelBackground: '#ffffff',
};

export const PASTEL_THEME: MermaidThemeVariables = {
  primaryColor: '#b8e6d5',
  primaryTextColor: '#2c5f4f',
  primaryBorderColor: '#6ba894',
  lineColor: '#6ba894',
  secondaryColor: '#e6b8d5',
  tertiaryColor: '#d5e6b8',
  background: '#fafafa',
  mainBkg: '#ffffff',
  secondBkg: '#f0f0f5',
  mainContrastColor: '#2c5f4f',
  darkMode: false,
  fontFamily: '"Inter", "Helvetica Neue", sans-serif',
  fontSize: '14px',
  nodeBorder: '#6ba894',
  clusterBkg: '#f5f5fa',
  clusterBorder: '#b8e6d5',
  defaultLinkColor: '#6ba894',
  titleColor: '#2c5f4f',
  edgeLabelBackground: '#fafafa',
};

export const THEME_PRESETS: Record<ThemePreset, MermaidConfig> = {
  default: {
    theme: 'default',
  },
  'retro-brutalist': {
    theme: 'base',
    themeVariables: RETRO_BRUTALIST_THEME,
    flowchart: {
      curve: 'linear',
      padding: 8,
    },
    sequence: {
      mirrorActors: false,
      rightAngles: true,
      showSequenceNumbers: true,
    },
  },
  terminal: {
    theme: 'base',
    themeVariables: TERMINAL_THEME,
    flowchart: {
      curve: 'linear',
    },
  },
  dark: {
    theme: 'dark',
  },
  pastel: {
    theme: 'base',
    themeVariables: PASTEL_THEME,
    flowchart: {
      curve: 'basis',
    },
  },
  'high-contrast': {
    theme: 'base',
    themeVariables: HIGH_CONTRAST_THEME,
    flowchart: {
      curve: 'linear',
      padding: 16,
    },
  },
};

export function getPresetConfig(preset: ThemePreset): MermaidConfig {
  return THEME_PRESETS[preset];
}
