export type EventSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type EventTypeCategory = 'DoS' | 'DDoS' | 'PortScan' | 'Benign' | 'Anomalous Auth' | 'Data Exfiltration';

export interface SecurityEventData {
  id: string;
  timestamp: string;
  sourcePort: number;
  destinationPort: number;
  eventType: string;
  severity: EventSeverity;
  riskScore: number;
  sourceIp: string;
  destinationIp: string;
  status: string;
  description?: string;
}

export interface EventFilterState {
  searchQuery: string;
  severity: EventSeverity | 'ALL';
  eventType: string | 'ALL';
}
