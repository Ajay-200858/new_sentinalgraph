import { SecurityEventData, EventSeverity } from './events';
import { NetworkNodeData, NetworkEdgeData } from './graph';
import { DatasetName, ReplaySpeed, ReplayStatus, SimulationSettingsState } from './simulation';

export interface DashboardStats {
  totalFlowsProcessed: number;
  attacksDetected: number;
  hostsIsolated: number;
  currentRiskLevel: number;
  riskStatus: EventSeverity;
}

export interface AttackDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface RiskProjectionItem {
  time: string;
  currentRisk: number;
  projectedRisk: number;
}

export interface CurrentThreatData {
  threatName: string;
  probability: number;
  riskLevel: EventSeverity;
  explanation: string;
  affectedHostCount: number;
  primaryHost: string;
  detectedTime: string;
}

export interface EscalationCardData {
  id: string;
  threatName: string;
  probability: number;
  timeline: string;
  mitreTactic: string;
  mitreId: string;
  affectedHosts: string[];
  severity: EventSeverity;
  recommendedAction: string;
}

export interface RecommendationData {
  action: string;
  reason: string;
  relatedThreat: string;
  riskLevel: EventSeverity;
  affectedHost: string;
  hostIp: string;
  confidenceScore: number;
}

export interface ForecastData {
  currentThreat: CurrentThreatData;
  escalations: EscalationCardData[];
  recommendation: RecommendationData;
}

export interface SimulationStoreState {
  selectedDataset: DatasetName;
  replaySpeed: ReplaySpeed;
  replayStatus: ReplayStatus;
  flowsProcessed: number;
  totalFlows: number;
  duration: string;
}

export interface DashboardStoreState {
  stats: DashboardStats;
  attackDistribution: AttackDistributionItem[];
  riskProjection: RiskProjectionItem[];
  securityEvents: SecurityEventData[];
  graphNodes: NetworkNodeData[];
  graphEdges: NetworkEdgeData[];
  forecast: ForecastData;
  simulation: SimulationStoreState;
  settings: SimulationSettingsState;
  isPollingActive: boolean;
}

export interface DashboardStoreActions {
  setDashboardStats: (stats: Partial<DashboardStats>) => void;
  setRiskLevel: (level: number, status?: EventSeverity) => void;
  setSecurityEvents: (events: SecurityEventData[]) => void;
  setNetworkGraphData: (nodes: NetworkNodeData[], edges: NetworkEdgeData[]) => void;
  setForecastData: (forecast: Partial<ForecastData>) => void;
  setSelectedDataset: (dataset: DatasetName) => void;
  setReplaySpeed: (speed: ReplaySpeed) => void;
  setReplayStatus: (status: ReplayStatus) => void;
  setFlowsProcessed: (count: number | ((prev: number) => number)) => void;
  updateSettings: (settings: Partial<SimulationSettingsState>) => void;
  resetSimulation: () => void;
  setIsPollingActive: (active: boolean) => void;
}

export type DashboardStore = DashboardStoreState & DashboardStoreActions;
