import { EventSeverity, SecurityEventData } from './events';

export interface MitreTechniqueData {
  id: string; // e.g. T1046
  name: string; // e.g. Network Service Scanning
  tactic: string; // e.g. Discovery
  risk: EventSeverity;
  detectionCount: number;
  affectedHosts: string[];
  description: string;
  recommendedAction: string;
}

export interface CommunicationPartner {
  ip: string;
  riskStatus: EventSeverity;
  flowCount: number;
}

export interface HostThreatSummary {
  threatName: string;
  severity: EventSeverity;
  eventCount: number;
}

export interface HostDetailsData {
  ipAddress: string;
  hostType: 'Internal' | 'External';
  riskScore: number;
  riskLevel: EventSeverity;
  status: string;
  lastSeen: string;
  riskTrend: string;
  attackRate: string;
  flowCount: number;
  detectedThreats: HostThreatSummary[];
  partners: CommunicationPartner[];
  recentEvents: SecurityEventData[];
  recommendation: {
    action: string;
    risk: EventSeverity;
    reason: string;
  };
}
