/**
 * Configuration options for ASCII rendering
 */
interface AsciiOptions {
    /** Horizontal spacing between nodes (default: 5) */
    paddingX?: number;
    /** Vertical spacing between nodes (default: 5) */
    paddingY?: number;
    /** Padding between text and node border (default: 1) */
    borderPadding?: number;
    /** Use only ASCII characters (+--| instead of ┌──┐) (default: false) */
    asciiOnly?: boolean;
    /** Show grid coordinates for debugging (default: false) */
    showCoords?: boolean;
}
/**
 * Node types supported by the renderer
 */
type NodeShape = 'rectangle' | 'circle' | 'diamond' | 'hexagon' | 'rounded';
/**
 * Edge types supported by the renderer
 */
type EdgeType = 'solid' | 'dotted' | 'thick';
/**
 * Parsed node in the diagram
 */
interface Node {
    id: string;
    label: string;
    shape: NodeShape;
    style?: {
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
    };
}
/**
 * Parsed edge in the diagram
 */
interface Edge {
    from: string;
    to: string;
    label?: string;
    type: EdgeType;
}
/**
 * Participant in a sequence diagram
 */
interface Participant {
    id: string;
    label: string;
    alias?: string;
}
/**
 * Message in a sequence diagram
 */
interface Message {
    from: string;
    to: string;
    label: string;
    type: 'solid' | 'dotted';
    activation?: boolean;
}
/**
 * Parsed flowchart structure
 */
interface FlowchartDiagram {
    type: 'flowchart';
    direction: 'LR' | 'RL' | 'TD' | 'BT';
    nodes: Node[];
    edges: Edge[];
}
/**
 * Parsed sequence diagram structure
 */
interface SequenceDiagram {
    type: 'sequence';
    participants: Participant[];
    messages: Message[];
}
/**
 * Generic parsed diagram
 */
type ParsedDiagram = FlowchartDiagram | SequenceDiagram;
/**
 * Render result
 */
interface RenderResult {
    ascii: string;
    width: number;
    height: number;
    error?: string;
}

interface MermaidThemeVariables {
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
interface MermaidConfig {
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
type ThemePreset = 'default' | 'retro-brutalist' | 'dark' | 'terminal' | 'pastel' | 'high-contrast';
interface ThemeEngineOptions {
    preset?: ThemePreset;
    customConfig?: MermaidConfig;
    customVariables?: MermaidThemeVariables;
}
interface GeneratedTheme {
    config: MermaidConfig;
    cssClasses?: string;
    initCode: string;
}

declare class ThemeEngine {
    private config;
    constructor(options?: ThemeEngineOptions);
    private mergeConfigs;
    getConfig(): MermaidConfig;
    setThemeVariable(key: keyof MermaidThemeVariables, value: string | boolean): void;
    setFlowchartConfig(config: MermaidConfig['flowchart']): void;
    setSequenceConfig(config: MermaidConfig['sequence']): void;
    generateInitCode(): string;
    generateTheme(): GeneratedTheme;
    applyTheme(mermaidCode: string): string;
    static fromPreset(presetName: ThemeEngineOptions['preset']): ThemeEngine;
    static custom(config: MermaidConfig): ThemeEngine;
}
declare function applyThemeToMermaid(mermaidCode: string, options: ThemeEngineOptions): string;
declare function generateMermaidConfig(options: ThemeEngineOptions): MermaidConfig;

declare const THEME_PRESETS: Record<ThemePreset, MermaidConfig>;
declare function getPresetConfig(preset: ThemePreset): MermaidConfig;

declare function mermaidToAscii(mermaidCode: string, options?: AsciiOptions): string;

export { type AsciiOptions, type FlowchartDiagram, type GeneratedTheme, type MermaidConfig, type MermaidThemeVariables, type ParsedDiagram, type RenderResult, type SequenceDiagram, THEME_PRESETS, ThemeEngine, type ThemeEngineOptions, type ThemePreset, applyThemeToMermaid, generateMermaidConfig, getPresetConfig, mermaidToAscii };
