import { FlowchartLayout, Grid, type GridCoordinate } from '../grid';
import type { BoxChars, FlowchartDiagram } from '../types';

export class FlowchartRenderer {
  private grid: Grid;
  private layout: FlowchartLayout;

  constructor(
    private chars: BoxChars,
    private paddingX: number = 5,
    private paddingY: number = 5,
    private borderPadding: number = 1,
  ) {
    this.grid = new Grid(chars);
    this.layout = new FlowchartLayout(paddingX, paddingY, borderPadding);
  }

  render(diagram: FlowchartDiagram): string {
    this.grid.clear();

    const nodeLabels = new Map<string, string>();
    for (const node of diagram.nodes) {
      nodeLabels.set(node.id, node.label);
    }

    if (diagram.direction === 'LR' || diagram.direction === 'RL') {
      this.layoutHorizontal(diagram, nodeLabels);
    } else {
      this.layoutVertical(diagram, nodeLabels);
    }

    this.drawEdges(diagram);

    return this.grid.render();
  }

  private layoutHorizontal(
    diagram: FlowchartDiagram,
    nodeLabels: Map<string, string>,
  ): void {
    const nodeIds = diagram.nodes.map((n) => n.id);
    this.layout.layoutHorizontal(nodeIds, nodeLabels);

    for (const node of diagram.nodes) {
      this.drawNode(node.id, node.label);
    }
  }

  private layoutVertical(
    diagram: FlowchartDiagram,
    nodeLabels: Map<string, string>,
  ): void {
    const nodeIds = diagram.nodes.map((n) => n.id);
    this.layout.layoutVertical(nodeIds, nodeLabels);

    for (const node of diagram.nodes) {
      this.drawNode(node.id, node.label);
    }
  }

  private drawNode(nodeId: string, label: string): void {
    const pos = this.layout.getNodePosition(nodeId);
    const size = this.layout.getNodeSize(nodeId);

    if (!pos || !size) return;

    this.grid.drawBox(pos.x, pos.y, size.width, size.height, label);
  }

  private drawEdges(diagram: FlowchartDiagram): void {
    for (const edge of diagram.edges) {
      this.drawEdge(edge.from, edge.to, edge.label, diagram.direction);
    }
  }

  private drawEdge(
    fromId: string,
    toId: string,
    label: string | undefined,
    direction: FlowchartDiagram['direction'],
  ): void {
    const isHorizontal = direction === 'LR' || direction === 'RL';
    const fromPoint = this.layout.getConnectionPoint(
      fromId,
      isHorizontal ? 'right' : 'bottom',
    );
    const toPoint = this.layout.getConnectionPoint(
      toId,
      isHorizontal ? 'left' : 'top',
    );

    if (!fromPoint || !toPoint) return;

    if (isHorizontal) {
      this.drawHorizontalEdge(fromPoint, toPoint, label);
    } else {
      this.drawVerticalEdge(fromPoint, toPoint, label);
    }
  }

  private drawHorizontalEdge(
    from: GridCoordinate,
    to: GridCoordinate,
    label?: string,
  ): void {
    this.grid.drawHorizontalLine(from.x, to.x, from.y);
    this.grid.drawArrow(to.x, to.y, 'right');

    if (label) {
      const labelX =
        from.x + Math.floor((to.x - from.x) / 2) - Math.floor(label.length / 2);
      const labelY = from.y - 1;
      this.grid.drawText(labelX, labelY, label);
    }
  }

  private drawVerticalEdge(
    from: GridCoordinate,
    to: GridCoordinate,
    label?: string,
  ): void {
    this.grid.drawVerticalLine(from.x, from.y, to.y);
    this.grid.drawArrow(to.x, to.y, 'down');

    if (label) {
      const labelX = from.x + 2;
      const labelY = from.y + Math.floor((to.y - from.y) / 2);
      this.grid.drawText(labelX, labelY, label);
    }
  }

  getDimensions(): { width: number; height: number } {
    return this.grid.getDimensions();
  }
}
