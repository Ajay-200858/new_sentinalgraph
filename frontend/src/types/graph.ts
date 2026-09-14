export type NodeRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Isolated';

export type NodeCategory = 'Internal' | 'External';

export interface NetworkNodeData {
  id: string;
  ip: string;
  type: NodeCategory;
  riskLevel: NodeRiskLevel;
  riskScore: number;
  riskTrend: string;
  flowCount: number;
  attackRate: string;
  lastSeen: string;
  partners: string[];
}

export interface NetworkEdgeData {
  id: string;
  source: string;
  target: string;
  flowCount: number;
  isAttack: boolean;
  label?: string;
}

export interface GraphDataset {
  nodes: NetworkNodeData[];
  edges: NetworkEdgeData[];
}
