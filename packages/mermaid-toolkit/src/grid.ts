/**
 * Grid-based layout system for ASCII rendering
 *
 * Based on mermaid-ascii Go implementation:
 * - Each node occupies a 3x3 grid space (corners, edges, center)
 * - Grid coordinates map to character positions in output
 * - Intelligent junction merging for line intersections
 */

import type { BoxChars } from './types';

export interface GridCoordinate {
  x: number;
  y: number;
}

export enum CellType {
  Empty = 'empty',
  HorizontalLine = 'horizontal',
  VerticalLine = 'vertical',
  Corner = 'corner',
  Junction = 'junction',
  Arrow = 'arrow',
  Text = 'text',
  Box = 'box',
}

export interface GridCell {
  char: string;
  type: CellType;
  metadata?: {
    nodeId?: string;
    edgeId?: string;
    direction?: 'up' | 'down' | 'left' | 'right';
  };
}

/**
 * Grid represents the 2D character grid for ASCII rendering
 */
export class Grid {
  private cells: Map<string, GridCell> = new Map();
  private minX = Infinity;
  private maxX = -Infinity;
  private minY = Infinity;
  private maxY = -Infinity;
  private chars: BoxChars;

  constructor(chars: BoxChars) {
    this.chars = chars;
  }

  /**
   * Convert coordinate to string key for Map storage
   */
  private coordKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Set a cell at the given coordinate
   */
  set(
    x: number,
    y: number,
    char: string,
    type: CellType,
    metadata?: GridCell['metadata'],
  ): void {
    this.cells.set(this.coordKey(x, y), { char, type, metadata });
    this.updateBounds(x, y);
  }

  /**
   * Get a cell at the given coordinate
   */
  get(x: number, y: number): GridCell | undefined {
    return this.cells.get(this.coordKey(x, y));
  }

  /**
   * Get character at coordinate (empty string if no cell)
   */
  getChar(x: number, y: number): string {
    return this.get(x, y)?.char || ' ';
  }

  /**
   * Update grid bounds as cells are added
   */
  private updateBounds(x: number, y: number): void {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);
  }

  /**
   * Draw a horizontal line from (x1, y) to (x2, y)
   */
  drawHorizontalLine(x1: number, x2: number, y: number): void {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);

    for (let x = startX; x <= endX; x++) {
      const existing = this.get(x, y);
      if (existing?.type === CellType.VerticalLine) {
        // Merge junction
        this.set(x, y, this.chars.junction, CellType.Junction);
      } else if (!existing || existing.type === CellType.Empty) {
        this.set(x, y, this.chars.horizontal, CellType.HorizontalLine);
      }
    }
  }

  /**
   * Draw a vertical line from (x, y1) to (x, y2)
   */
  drawVerticalLine(x: number, y1: number, y2: number): void {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    for (let y = startY; y <= endY; y++) {
      const existing = this.get(x, y);
      if (existing?.type === CellType.HorizontalLine) {
        // Merge junction
        this.set(x, y, this.chars.junction, CellType.Junction);
      } else if (!existing || existing.type === CellType.Empty) {
        this.set(x, y, this.chars.vertical, CellType.VerticalLine);
      }
    }
  }

  /**
   * Draw a box at the given position with the specified dimensions
   */
  drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
  ): void {
    // Top border
    this.set(x, y, this.chars.topLeft, CellType.Box);
    for (let i = 1; i < width - 1; i++) {
      this.set(x + i, y, this.chars.horizontal, CellType.Box);
    }
    this.set(x + width - 1, y, this.chars.topRight, CellType.Box);

    // Side borders
    for (let j = 1; j < height - 1; j++) {
      this.set(x, y + j, this.chars.vertical, CellType.Box);
      this.set(x + width - 1, y + j, this.chars.vertical, CellType.Box);
    }

    // Bottom border
    this.set(x, y + height - 1, this.chars.bottomLeft, CellType.Box);
    for (let i = 1; i < width - 1; i++) {
      this.set(x + i, y + height - 1, this.chars.horizontal, CellType.Box);
    }
    this.set(
      x + width - 1,
      y + height - 1,
      this.chars.bottomRight,
      CellType.Box,
    );

    // Label (centered)
    const labelStartX = x + Math.floor((width - label.length) / 2);
    const labelY = y + Math.floor(height / 2);
    for (let i = 0; i < label.length; i++) {
      this.set(labelStartX + i, labelY, label[i], CellType.Text);
    }
  }

  /**
   * Draw an arrow at the given position pointing in the given direction
   */
  drawArrow(
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
  ): void {
    const arrowChars = {
      up: this.chars.arrowUp,
      down: this.chars.arrowDown,
      left: this.chars.arrowLeft,
      right: this.chars.arrowRight,
    };
    this.set(x, y, arrowChars[direction], CellType.Arrow, { direction });
  }

  /**
   * Draw text at the given position
   */
  drawText(x: number, y: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.set(x + i, y, text[i], CellType.Text);
    }
  }

  /**
   * Render the grid to a string
   */
  render(): string {
    if (this.cells.size === 0) {
      return '';
    }

    const lines: string[] = [];

    for (let y = this.minY; y <= this.maxY; y++) {
      let line = '';
      for (let x = this.minX; x <= this.maxX; x++) {
        line += this.getChar(x, y);
      }
      lines.push(line.trimEnd());
    }

    return lines.join('\n');
  }

  /**
   * Get grid dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.maxX - this.minX + 1,
      height: this.maxY - this.minY + 1,
    };
  }

  /**
   * Clear the grid
   */
  clear(): void {
    this.cells.clear();
    this.minX = Infinity;
    this.maxX = -Infinity;
    this.minY = Infinity;
    this.maxY = -Infinity;
  }
}

/**
 * Layout calculator for positioning nodes in a flowchart
 */
export class FlowchartLayout {
  private nodePositions: Map<string, GridCoordinate> = new Map();
  private nodeSizes: Map<string, { width: number; height: number }> = new Map();

  constructor(
    private paddingX: number = 5,
    private paddingY: number = 5,
    private borderPadding: number = 1,
  ) {}

  /**
   * Calculate the size of a node based on its label
   */
  calculateNodeSize(label: string): { width: number; height: number } {
    const labelWidth = label.length;
    const width = labelWidth + this.borderPadding * 2 + 2; // +2 for borders
    const height = 3 + this.borderPadding * 2 - 2; // Minimum height for a box
    return { width, height };
  }

  /**
   * Set the position of a node
   */
  setNodePosition(nodeId: string, x: number, y: number): void {
    this.nodePositions.set(nodeId, { x, y });
  }

  /**
   * Get the position of a node
   */
  getNodePosition(nodeId: string): GridCoordinate | undefined {
    return this.nodePositions.get(nodeId);
  }

  /**
   * Set the size of a node
   */
  setNodeSize(nodeId: string, width: number, height: number): void {
    this.nodeSizes.set(nodeId, { width, height });
  }

  /**
   * Get the size of a node
   */
  getNodeSize(nodeId: string): { width: number; height: number } | undefined {
    return this.nodeSizes.get(nodeId);
  }

  /**
   * Calculate center point of a node
   */
  getNodeCenter(nodeId: string): GridCoordinate | undefined {
    const pos = this.getNodePosition(nodeId);
    const size = this.getNodeSize(nodeId);
    if (!pos || !size) return undefined;

    return {
      x: pos.x + Math.floor(size.width / 2),
      y: pos.y + Math.floor(size.height / 2),
    };
  }

  /**
   * Get the connection point on a node for drawing edges
   */
  getConnectionPoint(
    nodeId: string,
    direction: 'top' | 'bottom' | 'left' | 'right',
  ): GridCoordinate | undefined {
    const pos = this.getNodePosition(nodeId);
    const size = this.getNodeSize(nodeId);
    if (!pos || !size) return undefined;

    const centerX = Math.floor(size.width / 2);
    const centerY = Math.floor(size.height / 2);

    switch (direction) {
      case 'top':
        return { x: pos.x + centerX, y: pos.y };
      case 'bottom':
        return { x: pos.x + centerX, y: pos.y + size.height - 1 };
      case 'left':
        return { x: pos.x, y: pos.y + centerY };
      case 'right':
        return { x: pos.x + size.width - 1, y: pos.y + centerY };
    }
  }

  /**
   * Simple horizontal layout (left to right)
   */
  layoutHorizontal(nodeIds: string[], nodeLabels: Map<string, string>): void {
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
  layoutVertical(nodeIds: string[], nodeLabels: Map<string, string>): void {
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
}
