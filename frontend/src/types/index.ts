export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export interface ThreatAlert {
  id: string;
  title: string;
  sourceIp: string;
  targetEntity: string;
  severity: SeverityLevel;
  status: AlertStatus;
  timestamp: string;
  description: string;
  tags: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'IP' | 'DOMAIN' | 'MALWARE' | 'USER' | 'SERVER' | 'VULNERABILITY';
  riskScore: number;
  status: 'COMPROMISED' | 'SUSPICIOUS' | 'SAFE';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'COMMUNICATES_WITH' | 'EXPLOITS' | 'AUTHENTICATES_TO' | 'TARGETS';
  weight: number;
}

export interface SystemMetric {
  timestamp: string;
  threatsDetected: number;
  anomaliesBlocked: number;
  activeNodes: number;
  cpuUtilization: number;
}

export interface SentinelState {
  alerts: ThreatAlert[];
  selectedAlertId: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLoading: boolean;
  filterSeverity: SeverityLevel | 'ALL';
  setSelectedAlertId: (id: string | null) => void;
  setFilterSeverity: (severity: SeverityLevel | 'ALL') => void;
  fetchDashboardData: () => Promise<void>;
}
