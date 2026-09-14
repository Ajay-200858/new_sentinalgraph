import { SecurityEventData } from './events';
import { NetworkNodeData, NetworkEdgeData } from './graph';
import { DatasetName, ReplaySpeed, ReplayStatus } from './simulation';
import { HostDetailsData, MitreTechniqueData } from './analysis';
import {
  AttackDistributionItem,
  CurrentThreatData,
  DashboardStats,
  EscalationCardData,
  RecommendationData,
  RiskProjectionItem,
} from './store';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
}

// 1. Dashboard Overview API Response
export interface DashboardOverviewResponse {
  stats: DashboardStats;
  attackDistribution: AttackDistributionItem[];
  riskProjection: RiskProjectionItem[];
  latestEvents: SecurityEventData[];
}

// 2. Network Topology Graph API Response
export interface NetworkGraphResponse {
  nodes: NetworkNodeData[];
  edges: NetworkEdgeData[];
}

// 3. Forecast / Escalation API Response
export interface ForecastResponse {
  currentThreat: CurrentThreatData;
  escalations: EscalationCardData[];
  recommendation: RecommendationData;
}

// 4. Security Events Stream API Response
export interface SecurityEventsResponse {
  events: SecurityEventData[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// 5. Simulation Execution Status API Response
export interface SimulationStatusResponse {
  status: ReplayStatus;
  selectedDataset: DatasetName;
  speed: ReplaySpeed;
  flowsProcessed: number;
  totalFlows: number;
  attacksDetected: number;
  currentRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  duration: string;
}

// 6. MITRE ATT&CK Matrix API Response
export interface MitreResponse {
  techniques: MitreTechniqueData[];
  totalTechniques: number;
  observedTacticsCount: number;
}

// 7. Host Telemetry Details API Response
export interface HostDetailsResponse {
  host: HostDetailsData;
}
