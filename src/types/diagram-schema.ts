export type NodeType = "rectangle" | "diamond" | "ellipse" | "text";

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
}

export interface DiagramEdge {
  from: string;   // id node
  to: string;     // id node
  label?: string;
}

export interface DiagramDSL {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}