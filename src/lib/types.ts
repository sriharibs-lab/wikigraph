export interface GraphNode {
  id: string;
  label: string;
  summary?: string;
  thumbnail?: string;
  category: NodeCategory;
  depth: number;
  expanded: boolean;
  size: number;
}

export type NodeCategory =
  | "root"
  | "person"
  | "place"
  | "concept"
  | "event"
  | "science"
  | "art"
  | "organization"
  | "other";

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
