// src/constants.ts
var UNICODE_CHARS = {
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502",
  junction: "\u253C",
  arrowRight: "\u25BA",
  arrowLeft: "\u25C4",
  arrowUp: "\u25B2",
  arrowDown: "\u25BC",
  dottedHorizontal: "\u2508",
  dottedVertical: "\u250A"
};
var ASCII_CHARS = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
  junction: "+",
  arrowRight: ">",
  arrowLeft: "<",
  arrowUp: "^",
  arrowDown: "v",
  dottedHorizontal: ".",
  dottedVertical: ":"
};
var DEFAULT_OPTIONS = {
  paddingX: 5,
  paddingY: 5,
  borderPadding: 1,
  asciiOnly: false,
  showCoords: false
};
function getBoxChars(options) {
  return options.asciiOnly ? ASCII_CHARS : UNICODE_CHARS;
}

// src/parser.ts
function detectDiagramType(code) {
  const trimmed = code.trim();
  if (trimmed.startsWith("graph ") || trimmed.startsWith("flowchart ")) {
    return "flowchart";
  }
  if (trimmed.startsWith("sequenceDiagram")) {
    return "sequence";
  }
  return null;
}
function parseFlowchart(code) {
  const lines = code.trim().split("\n");
  const firstLine = lines[0];
  const directionMatch = firstLine.match(/(?:graph|flowchart)\s+(LR|RL|TD|BT)/);
  const direction = directionMatch?.[1] || "LR";
  const nodes = /* @__PURE__ */ new Map();
  const edges = [];
  for (const line of lines.slice(1)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("%%")) {
      continue;
    }
    parseFlowchartLine(trimmedLine, nodes, edges);
  }
  return {
    type: "flowchart",
    direction,
    nodes: Array.from(nodes.values()),
    edges
  };
}
function parseFlowchartLine(line, nodes, edges) {
  const edgeRegex = /(\w+)(?:\[([^\]]+)\])?\s*(-->|---|-\.-|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:\[([^\]]+)\])?/;
  const match = line.match(edgeRegex);
  if (match) {
    const [, fromId, fromLabel, edgeType, edgeLabel, toId, toLabel] = match;
    if (!nodes.has(fromId)) {
      nodes.set(fromId, createNode(fromId, fromLabel || fromId));
    }
    if (!nodes.has(toId)) {
      nodes.set(toId, createNode(toId, toLabel || toId));
    }
    edges.push({
      from: fromId,
      to: toId,
      label: edgeLabel,
      type: edgeType === "-.-" ? "dotted" : edgeType === "==>" ? "thick" : "solid"
    });
  } else {
    const nodeRegex = /(\w+)\[([^\]]+)\]/;
    const nodeMatch = line.match(nodeRegex);
    if (nodeMatch) {
      const [, id, label] = nodeMatch;
      if (!nodes.has(id)) {
        nodes.set(id, createNode(id, label));
      }
    }
  }
}
function createNode(id, label) {
  return {
    id,
    label,
    shape: "rectangle"
  };
}
function parseSequenceDiagram(code) {
  const lines = code.trim().split("\n");
  const participants = /* @__PURE__ */ new Map();
  const messages = [];
  for (const line of lines.slice(1)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("%%")) {
      continue;
    }
    const participantRegex = /participant\s+(\w+)(?:\s+as\s+(.+))?/;
    const partMatch = trimmedLine.match(participantRegex);
    if (partMatch) {
      const [, id, alias] = partMatch;
      participants.set(id, { id, label: alias || id, alias });
      continue;
    }
    const messageRegex = /(\w+)\s*(--?>>?)\s*(\w+):\s*(.+)/;
    const msgMatch = trimmedLine.match(messageRegex);
    if (msgMatch) {
      const [, from, arrow, to, label] = msgMatch;
      if (!participants.has(from)) {
        participants.set(from, { id: from, label: from });
      }
      if (!participants.has(to)) {
        participants.set(to, { id: to, label: to });
      }
      messages.push({
        from,
        to,
        label,
        type: arrow.includes("--") ? "dotted" : "solid"
      });
    }
  }
  return {
    type: "sequence",
    participants: Array.from(participants.values()),
    messages
  };
}
function parseMermaid(code) {
  const diagramType = detectDiagramType(code);
  if (!diagramType) {
    return null;
  }
  switch (diagramType) {
    case "flowchart":
      return parseFlowchart(code);
    case "sequence":
      return parseSequenceDiagram(code);
    default:
      return null;
  }
}

// src/grid.ts
var Grid = class {
  cells = /* @__PURE__ */ new Map();
  minX = Infinity;
  maxX = -Infinity;
  minY = Infinity;
  maxY = -Infinity;
  chars;
  constructor(chars) {
    this.chars = chars;
  }
  /**
   * Convert coordinate to string key for Map storage
   */
  coordKey(x, y) {
    return `${x},${y}`;
  }
  /**
   * Set a cell at the given coordinate
   */
  set(x, y, char, type, metadata) {
    this.cells.set(this.coordKey(x, y), { char, type, metadata });
    this.updateBounds(x, y);
  }
  /**
   * Get a cell at the given coordinate
   */
  get(x, y) {
    return this.cells.get(this.coordKey(x, y));
  }
  /**
   * Get character at coordinate (empty string if no cell)
   */
  getChar(x, y) {
    return this.get(x, y)?.char || " ";
  }
  /**
   * Update grid bounds as cells are added
   */
  updateBounds(x, y) {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);
  }
  /**
   * Draw a horizontal line from (x1, y) to (x2, y)
   */
  drawHorizontalLine(x1, x2, y) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    for (let x = startX; x <= endX; x++) {
      const existing = this.get(x, y);
      if (existing?.type === "vertical" /* VerticalLine */) {
        this.set(x, y, this.chars.junction, "junction" /* Junction */);
      } else if (!existing || existing.type === "empty" /* Empty */) {
        this.set(x, y, this.chars.horizontal, "horizontal" /* HorizontalLine */);
      }
    }
  }
  /**
   * Draw a vertical line from (x, y1) to (x, y2)
   */
  drawVerticalLine(x, y1, y2) {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    for (let y = startY; y <= endY; y++) {
      const existing = this.get(x, y);
      if (existing?.type === "horizontal" /* HorizontalLine */) {
        this.set(x, y, this.chars.junction, "junction" /* Junction */);
      } else if (!existing || existing.type === "empty" /* Empty */) {
        this.set(x, y, this.chars.vertical, "vertical" /* VerticalLine */);
      }
    }
  }
  /**
   * Draw a box at the given position with the specified dimensions
   */
  drawBox(x, y, width, height, label) {
    this.set(x, y, this.chars.topLeft, "box" /* Box */);
    for (let i = 1; i < width - 1; i++) {
      this.set(x + i, y, this.chars.horizontal, "box" /* Box */);
    }
    this.set(x + width - 1, y, this.chars.topRight, "box" /* Box */);
    for (let j = 1; j < height - 1; j++) {
      this.set(x, y + j, this.chars.vertical, "box" /* Box */);
      this.set(x + width - 1, y + j, this.chars.vertical, "box" /* Box */);
    }
    this.set(x, y + height - 1, this.chars.bottomLeft, "box" /* Box */);
    for (let i = 1; i < width - 1; i++) {
      this.set(x + i, y + height - 1, this.chars.horizontal, "box" /* Box */);
    }
    this.set(
      x + width - 1,
      y + height - 1,
      this.chars.bottomRight,
      "box" /* Box */
    );
    const labelStartX = x + Math.floor((width - label.length) / 2);
    const labelY = y + Math.floor(height / 2);
    for (let i = 0; i < label.length; i++) {
      this.set(labelStartX + i, labelY, label[i], "text" /* Text */);
    }
  }
  /**
   * Draw an arrow at the given position pointing in the given direction
   */
  drawArrow(x, y, direction) {
    const arrowChars = {
      up: this.chars.arrowUp,
      down: this.chars.arrowDown,
      left: this.chars.arrowLeft,
      right: this.chars.arrowRight
    };
    this.set(x, y, arrowChars[direction], "arrow" /* Arrow */, { direction });
  }
  /**
   * Draw text at the given position
   */
  drawText(x, y, text) {
    for (let i = 0; i < text.length; i++) {
      this.set(x + i, y, text[i], "text" /* Text */);
    }
  }
  /**
   * Render the grid to a string
   */
  render() {
    if (this.cells.size === 0) {
      return "";
    }
    const lines = [];
    for (let y = this.minY; y <= this.maxY; y++) {
      let line = "";
      for (let x = this.minX; x <= this.maxX; x++) {
        line += this.getChar(x, y);
      }
      lines.push(line.trimEnd());
    }
    return lines.join("\n");
  }
  /**
   * Get grid dimensions
   */
  getDimensions() {
    return {
      width: this.maxX - this.minX + 1,
      height: this.maxY - this.minY + 1
    };
  }
  /**
   * Clear the grid
   */
  clear() {
    this.cells.clear();
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
  }
};
var FlowchartLayout = class {
  constructor(paddingX = 5, paddingY = 5, borderPadding = 1) {
    this.paddingX = paddingX;
    this.paddingY = paddingY;
    this.borderPadding = borderPadding;
  }
  nodePositions = /* @__PURE__ */ new Map();
  nodeSizes = /* @__PURE__ */ new Map();
  /**
   * Calculate the size of a node based on its label
   */
  calculateNodeSize(label) {
    const labelWidth = label.length;
    const width = labelWidth + this.borderPadding * 2 + 2;
    const height = 3 + this.borderPadding * 2 - 2;
    return { width, height };
  }
  /**
   * Set the position of a node
   */
  setNodePosition(nodeId, x, y) {
    this.nodePositions.set(nodeId, { x, y });
  }
  /**
   * Get the position of a node
   */
  getNodePosition(nodeId) {
    return this.nodePositions.get(nodeId);
  }
  /**
   * Set the size of a node
   */
  setNodeSize(nodeId, width, height) {
    this.nodeSizes.set(nodeId, { width, height });
  }
  /**
   * Get the size of a node
   */
  getNodeSize(nodeId) {
    return this.nodeSizes.get(nodeId);
  }
  /**
   * Calculate center point of a node
   */
  getNodeCenter(nodeId) {
    const pos = this.getNodePosition(nodeId);
    const size = this.getNodeSize(nodeId);
    if (!pos || !size) return void 0;
    return {
      x: pos.x + Math.floor(size.width / 2),
      y: pos.y + Math.floor(size.height / 2)
    };
  }
  /**
   * Get the connection point on a node for drawing edges
   */
  getConnectionPoint(nodeId, direction) {
    const pos = this.getNodePosition(nodeId);
    const size = this.getNodeSize(nodeId);
    if (!pos || !size) return void 0;
    const centerX = Math.floor(size.width / 2);
    const centerY = Math.floor(size.height / 2);
    switch (direction) {
      case "top":
        return { x: pos.x + centerX, y: pos.y };
      case "bottom":
        return { x: pos.x + centerX, y: pos.y + size.height - 1 };
      case "left":
        return { x: pos.x, y: pos.y + centerY };
      case "right":
        return { x: pos.x + size.width - 1, y: pos.y + centerY };
    }
  }
  /**
   * Simple horizontal layout (left to right)
   */
  layoutHorizontal(nodeIds, nodeLabels) {
    let currentX = 0;
    const baseY = 0;
    for (const nodeId of nodeIds) {
      const label = nodeLabels.get(nodeId) || nodeId;
      const size = this.calculateNodeSize(label);
      this.setNodePosition(nodeId, currentX, baseY);
      this.setNodeSize(nodeId, size.width, size.height);
      currentX += size.width + this.paddingX;
    }
  }
  /**
   * Simple vertical layout (top to bottom)
   */
  layoutVertical(nodeIds, nodeLabels) {
    let currentY = 0;
    const baseX = 0;
    for (const nodeId of nodeIds) {
      const label = nodeLabels.get(nodeId) || nodeId;
      const size = this.calculateNodeSize(label);
      this.setNodePosition(nodeId, baseX, currentY);
      this.setNodeSize(nodeId, size.width, size.height);
      currentY += size.height + this.paddingY;
    }
  }
};

// src/renderers/flowchart.ts
var FlowchartRenderer = class {
  constructor(chars, paddingX = 5, paddingY = 5, borderPadding = 1) {
    this.chars = chars;
    this.paddingX = paddingX;
    this.paddingY = paddingY;
    this.borderPadding = borderPadding;
    this.grid = new Grid(chars);
    this.layout = new FlowchartLayout(paddingX, paddingY, borderPadding);
  }
  grid;
  layout;
  render(diagram) {
    this.grid.clear();
    const nodeLabels = /* @__PURE__ */ new Map();
    for (const node of diagram.nodes) {
      nodeLabels.set(node.id, node.label);
    }
    if (diagram.direction === "LR" || diagram.direction === "RL") {
      this.layoutHorizontal(diagram, nodeLabels);
    } else {
      this.layoutVertical(diagram, nodeLabels);
    }
    this.drawEdges(diagram);
    return this.grid.render();
  }
  layoutHorizontal(diagram, nodeLabels) {
    const nodeIds = diagram.nodes.map((n) => n.id);
    this.layout.layoutHorizontal(nodeIds, nodeLabels);
    for (const node of diagram.nodes) {
      this.drawNode(node.id, node.label);
    }
  }
  layoutVertical(diagram, nodeLabels) {
    const nodeIds = diagram.nodes.map((n) => n.id);
    this.layout.layoutVertical(nodeIds, nodeLabels);
    for (const node of diagram.nodes) {
      this.drawNode(node.id, node.label);
    }
  }
  drawNode(nodeId, label) {
    const pos = this.layout.getNodePosition(nodeId);
    const size = this.layout.getNodeSize(nodeId);
    if (!pos || !size) return;
    this.grid.drawBox(pos.x, pos.y, size.width, size.height, label);
  }
  drawEdges(diagram) {
    for (const edge of diagram.edges) {
      this.drawEdge(edge.from, edge.to, edge.label, diagram.direction);
    }
  }
  drawEdge(fromId, toId, label, direction) {
    const isHorizontal = direction === "LR" || direction === "RL";
    const fromPoint = this.layout.getConnectionPoint(
      fromId,
      isHorizontal ? "right" : "bottom"
    );
    const toPoint = this.layout.getConnectionPoint(
      toId,
      isHorizontal ? "left" : "top"
    );
    if (!fromPoint || !toPoint) return;
    if (isHorizontal) {
      this.drawHorizontalEdge(fromPoint, toPoint, label);
    } else {
      this.drawVerticalEdge(fromPoint, toPoint, label);
    }
  }
  drawHorizontalEdge(from, to, label) {
    this.grid.drawHorizontalLine(from.x, to.x, from.y);
    this.grid.drawArrow(to.x, to.y, "right");
    if (label) {
      const labelX = from.x + Math.floor((to.x - from.x) / 2) - Math.floor(label.length / 2);
      const labelY = from.y - 1;
      this.grid.drawText(labelX, labelY, label);
    }
  }
  drawVerticalEdge(from, to, label) {
    this.grid.drawVerticalLine(from.x, from.y, to.y);
    this.grid.drawArrow(to.x, to.y, "down");
    if (label) {
      const labelX = from.x + 2;
      const labelY = from.y + Math.floor((to.y - from.y) / 2);
      this.grid.drawText(labelX, labelY, label);
    }
  }
  getDimensions() {
    return this.grid.getDimensions();
  }
};

// src/theme-presets.ts
var RETRO_BRUTALIST_THEME = {
  primaryColor: "#00ff00",
  primaryTextColor: "#00ff00",
  primaryBorderColor: "#00ff00",
  lineColor: "#00ff00",
  secondaryColor: "#ff00ff",
  tertiaryColor: "#ffff00",
  background: "#000000",
  mainBkg: "#000000",
  secondBkg: "#1a1a1a",
  mainContrastColor: "#00ff00",
  darkMode: true,
  fontFamily: 'monospace, "Courier New", Courier',
  fontSize: "16px",
  nodeBorder: "#00ff00",
  clusterBkg: "#0a0a0a",
  clusterBorder: "#00ff00",
  defaultLinkColor: "#00ff00",
  titleColor: "#00ff00",
  edgeLabelBackground: "#000000",
  actorBorder: "#00ff00",
  actorBkg: "#000000",
  actorTextColor: "#00ff00",
  actorLineColor: "#00ff00",
  signalColor: "#00ff00",
  signalTextColor: "#00ff00",
  labelBoxBkgColor: "#000000",
  labelBoxBorderColor: "#00ff00",
  labelTextColor: "#00ff00",
  loopTextColor: "#00ff00",
  noteBorderColor: "#ffff00",
  noteBkgColor: "#1a1a00",
  noteTextColor: "#ffff00",
  activationBorderColor: "#00ff00",
  activationBkgColor: "#003300",
  sequenceNumberColor: "#00ff00"
};
var TERMINAL_THEME = {
  primaryColor: "#33ff33",
  primaryTextColor: "#33ff33",
  primaryBorderColor: "#33ff33",
  lineColor: "#33ff33",
  secondaryColor: "#3333ff",
  tertiaryColor: "#ff3333",
  background: "#0c0c0c",
  mainBkg: "#0c0c0c",
  secondBkg: "#1c1c1c",
  mainContrastColor: "#33ff33",
  darkMode: true,
  fontFamily: '"IBM Plex Mono", "Consolas", monospace',
  fontSize: "14px",
  nodeBorder: "#33ff33",
  clusterBkg: "#0a0a0a",
  clusterBorder: "#33ff33",
  defaultLinkColor: "#33ff33",
  titleColor: "#33ff33",
  edgeLabelBackground: "#0c0c0c"
};
var HIGH_CONTRAST_THEME = {
  primaryColor: "#ffffff",
  primaryTextColor: "#000000",
  primaryBorderColor: "#000000",
  lineColor: "#000000",
  secondaryColor: "#ffff00",
  tertiaryColor: "#00ffff",
  background: "#ffffff",
  mainBkg: "#ffffff",
  secondBkg: "#f0f0f0",
  mainContrastColor: "#000000",
  darkMode: false,
  fontFamily: "Arial, sans-serif",
  fontSize: "18px",
  nodeBorder: "#000000",
  clusterBkg: "#f5f5f5",
  clusterBorder: "#000000",
  defaultLinkColor: "#000000",
  titleColor: "#000000",
  edgeLabelBackground: "#ffffff"
};
var PASTEL_THEME = {
  primaryColor: "#b8e6d5",
  primaryTextColor: "#2c5f4f",
  primaryBorderColor: "#6ba894",
  lineColor: "#6ba894",
  secondaryColor: "#e6b8d5",
  tertiaryColor: "#d5e6b8",
  background: "#fafafa",
  mainBkg: "#ffffff",
  secondBkg: "#f0f0f5",
  mainContrastColor: "#2c5f4f",
  darkMode: false,
  fontFamily: '"Inter", "Helvetica Neue", sans-serif',
  fontSize: "14px",
  nodeBorder: "#6ba894",
  clusterBkg: "#f5f5fa",
  clusterBorder: "#b8e6d5",
  defaultLinkColor: "#6ba894",
  titleColor: "#2c5f4f",
  edgeLabelBackground: "#fafafa"
};
var THEME_PRESETS = {
  default: {
    theme: "default"
  },
  "retro-brutalist": {
    theme: "base",
    themeVariables: RETRO_BRUTALIST_THEME,
    flowchart: {
      curve: "linear",
      padding: 8
    },
    sequence: {
      mirrorActors: false,
      rightAngles: true,
      showSequenceNumbers: true
    }
  },
  terminal: {
    theme: "base",
    themeVariables: TERMINAL_THEME,
    flowchart: {
      curve: "linear"
    }
  },
  dark: {
    theme: "dark"
  },
  pastel: {
    theme: "base",
    themeVariables: PASTEL_THEME,
    flowchart: {
      curve: "basis"
    }
  },
  "high-contrast": {
    theme: "base",
    themeVariables: HIGH_CONTRAST_THEME,
    flowchart: {
      curve: "linear",
      padding: 16
    }
  }
};
function getPresetConfig(preset) {
  return THEME_PRESETS[preset];
}

// src/theme-engine.ts
var ThemeEngine = class _ThemeEngine {
  config;
  constructor(options = {}) {
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
        ...options.customVariables
      };
    }
  }
  mergeConfigs(base, override) {
    return {
      ...base,
      ...override,
      themeVariables: {
        ...base.themeVariables,
        ...override.themeVariables
      },
      flowchart: {
        ...base.flowchart,
        ...override.flowchart
      },
      sequence: {
        ...base.sequence,
        ...override.sequence
      },
      gantt: {
        ...base.gantt,
        ...override.gantt
      },
      class: {
        ...base.class,
        ...override.class
      },
      state: {
        ...base.state,
        ...override.state
      },
      er: {
        ...base.er,
        ...override.er
      },
      pie: {
        ...base.pie,
        ...override.pie
      },
      gitGraph: {
        ...base.gitGraph,
        ...override.gitGraph
      },
      journey: {
        ...base.journey,
        ...override.journey
      }
    };
  }
  getConfig() {
    return this.config;
  }
  setThemeVariable(key, value) {
    if (!this.config.themeVariables) {
      this.config.themeVariables = {};
    }
    this.config.themeVariables[key] = value;
  }
  setFlowchartConfig(config) {
    this.config.flowchart = {
      ...this.config.flowchart,
      ...config
    };
  }
  setSequenceConfig(config) {
    this.config.sequence = {
      ...this.config.sequence,
      ...config
    };
  }
  generateInitCode() {
    const configJson = JSON.stringify(this.config, null, 2);
    return `mermaid.initialize(${configJson});`;
  }
  generateTheme() {
    return {
      config: this.config,
      initCode: this.generateInitCode()
    };
  }
  applyTheme(mermaidCode) {
    const lines = mermaidCode.trim().split("\n");
    const firstLine = lines[0];
    const directiveComment = `%%{init: ${JSON.stringify(this.config)}}%%`;
    if (firstLine.startsWith("%%{init:")) {
      lines[0] = directiveComment;
    } else {
      lines.unshift(directiveComment);
    }
    return lines.join("\n");
  }
  static fromPreset(presetName) {
    return new _ThemeEngine({ preset: presetName });
  }
  static custom(config) {
    return new _ThemeEngine({ customConfig: config });
  }
};
function applyThemeToMermaid(mermaidCode, options) {
  const engine = new ThemeEngine(options);
  return engine.applyTheme(mermaidCode);
}
function generateMermaidConfig(options) {
  const engine = new ThemeEngine(options);
  return engine.getConfig();
}

// src/index.ts
function mermaidToAscii(mermaidCode, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  try {
    const result = renderMermaid(mermaidCode, opts);
    if (result.error) {
      return createFallbackOutput(mermaidCode, result.error);
    }
    return result.ascii;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createFallbackOutput(mermaidCode, message);
  }
}
function renderMermaid(code, options) {
  const diagram = parseMermaid(code);
  if (!diagram) {
    return {
      ascii: "",
      width: 0,
      height: 0,
      error: `Unsupported diagram type. Only 'graph', 'flowchart', and 'sequenceDiagram' are supported.`
    };
  }
  const chars = getBoxChars(options);
  if (diagram.type === "flowchart") {
    const renderer = new FlowchartRenderer(
      chars,
      options.paddingX,
      options.paddingY,
      options.borderPadding
    );
    const ascii = renderer.render(diagram);
    const dimensions = renderer.getDimensions();
    return {
      ascii,
      width: dimensions.width,
      height: dimensions.height
    };
  }
  if (diagram.type === "sequence") {
    return {
      ascii: "[Sequence diagram rendering not yet implemented]",
      width: 0,
      height: 0
    };
  }
  return {
    ascii: "",
    width: 0,
    height: 0,
    error: "Unknown error occurred"
  };
}
function createFallbackOutput(originalCode, error) {
  return `[ASCII RENDER ERROR]
${error}

Original Mermaid code:
\`\`\`mermaid
${originalCode}
\`\`\``;
}
export {
  THEME_PRESETS,
  ThemeEngine,
  applyThemeToMermaid,
  generateMermaidConfig,
  getPresetConfig,
  mermaidToAscii
};
