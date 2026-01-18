export interface MermaidThemeVariables {
  primaryColor?: string;
  primaryTextColor?: string;
  primaryBorderColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  background?: string;
  mainBkg?: string;
  secondBkg?: string;
  mainContrastColor?: string;
  darkMode?: boolean;
  fontFamily?: string;
  fontSize?: string;
  nodeBorder?: string;
  clusterBkg?: string;
  clusterBorder?: string;
  defaultLinkColor?: string;
  titleColor?: string;
  edgeLabelBackground?: string;
  actorBorder?: string;
  actorBkg?: string;
  actorTextColor?: string;
  actorLineColor?: string;
  signalColor?: string;
  signalTextColor?: string;
  labelBoxBkgColor?: string;
  labelBoxBorderColor?: string;
  labelTextColor?: string;
  loopTextColor?: string;
  noteBorderColor?: string;
  noteBkgColor?: string;
  noteTextColor?: string;
  activationBorderColor?: string;
  activationBkgColor?: string;
  sequenceNumberColor?: string;
}

export interface MermaidConfig {
  theme?: 'default' | 'dark' | 'forest' | 'neutral' | 'base';
  themeVariables?: MermaidThemeVariables;
  flowchart?: {
    curve?: 'basis' | 'linear' | 'cardinal';
    padding?: number;
    nodeSpacing?: number;
    rankSpacing?: number;
    diagramPadding?: number;
    useMaxWidth?: boolean;
    defaultRenderer?: 'dagre-d3' | 'dagre-wrapper' | 'elk';
  };
  sequence?: {
    diagramMarginX?: number;
    diagramMarginY?: number;
    actorMargin?: number;
    width?: number;
    height?: number;
    boxMargin?: number;
    boxTextMargin?: number;
    noteMargin?: number;
    messageMargin?: number;
    mirrorActors?: boolean;
    bottomMarginAdj?: number;
    useMaxWidth?: boolean;
    rightAngles?: boolean;
    showSequenceNumbers?: boolean;
  };
  gantt?: {
    titleTopMargin?: number;
    barHeight?: number;
    barGap?: number;
    topPadding?: number;
    leftPadding?: number;
    gridLineStartPadding?: number;
    fontSize?: number;
    numberSectionStyles?: number;
    axisFormat?: string;
    useMaxWidth?: boolean;
  };
  journey?: {
    diagramMarginX?: number;
    diagramMarginY?: number;
    actorMargin?: number;
    width?: number;
    height?: number;
    boxMargin?: number;
    boxTextMargin?: number;
    noteMargin?: number;
    messageMargin?: number;
  };
  class?: {
    arrowMarkerAbsolute?: boolean;
    useMaxWidth?: boolean;
  };
  state?: {
    dividerMargin?: number;
    sizeUnit?: number;
    padding?: number;
    textHeight?: number;
    titleShift?: number;
    noteMargin?: number;
    forkWidth?: number;
    forkHeight?: number;
    miniPadding?: number;
    fontSizeFactor?: number;
    fontSize?: number;
    labelHeight?: number;
    edgeLengthFactor?: string;
    compositTitleSize?: number;
    radius?: number;
  };
  er?: {
    diagramPadding?: number;
    layoutDirection?: 'TB' | 'BT' | 'RL' | 'LR';
    minEntityWidth?: number;
    minEntityHeight?: number;
    entityPadding?: number;
    stroke?: string;
    fill?: string;
    fontSize?: number;
    useMaxWidth?: boolean;
  };
  pie?: {
    useMaxWidth?: boolean;
  };
  gitGraph?: {
    diagramPadding?: number;
    nodeLabel?: {
      width?: number;
      height?: number;
      x?: number;
      y?: number;
    };
    mainBranchName?: string;
    showCommitLabel?: boolean;
    showBranches?: boolean;
  };
}

export type ThemePreset =
  | 'default'
  | 'retro-brutalist'
  | 'dark'
  | 'terminal'
  | 'pastel'
  | 'high-contrast';

export interface ThemeEngineOptions {
  preset?: ThemePreset;
  customConfig?: MermaidConfig;
  customVariables?: MermaidThemeVariables;
}

export interface GeneratedTheme {
  config: MermaidConfig;
  cssClasses?: string;
  initCode: string;
}
