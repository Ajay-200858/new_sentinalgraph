import { ThreatAlert, GraphNode, GraphEdge, SystemMetric } from '../types';

export const MOCK_ALERTS: ThreatAlert[] = [
  {
    id: 'ALT-1001',
    title: 'Anomalous Data Exfiltration to Suspicious IP',
    sourceIp: '192.168.1.105',
    targetEntity: 'ext-c2-malicious-domain.io',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    timestamp: '2026-09-14 09:15:00',
    description: 'High volume outbound encrypted traffic detected towards known command & control node.',
    tags: ['Exfiltration', 'C2', 'Network Anomaly'],
  },
  {
    id: 'ALT-1002',
    title: 'Credential Stuffing Attempt Discovered',
    sourceIp: '45.33.22.11',
    targetEntity: 'Auth-Gateway-Primary',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    timestamp: '2026-09-14 08:42:10',
    description: 'Multiple failed authentication requests across distinct user identities in short interval.',
    tags: ['BruteForce', 'Authentication', 'Gateway'],
  },
  {
    id: 'ALT-1003',
    title: 'Privilege Escalation on Production DB Server',
    sourceIp: '10.0.4.12',
    targetEntity: 'Prod-Postgres-Primary',
    severity: 'HIGH',
    status: 'ACTIVE',
    timestamp: '2026-09-14 07:58:33',
    description: 'Unauthorized superuser elevation executed via exploited CVE in local daemon.',
    tags: ['PrivEsc', 'Database', 'CVE-2026-8819'],
  },
  {
    id: 'ALT-1004',
    title: 'Suspicious PowerShell Execution',
    sourceIp: '10.0.2.45',
    targetEntity: 'WKSTN-FINANCE-04',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    timestamp: '2026-09-14 06:12:00',
    description: 'Encoded base64 script execution observed in user session scope.',
    tags: ['Execution', 'PowerShell', 'Endpoint'],
  },
];

export const MOCK_NODES: GraphNode[] = [
  { id: 'node-1', label: 'C2 Control Server', type: 'IP', riskScore: 98, status: 'COMPROMISED' },
  { id: 'node-2', label: 'Finance Workstation 04', type: 'SERVER', riskScore: 75, status: 'SUSPICIOUS' },
  { id: 'node-3', label: 'Production DB Host', type: 'SERVER', riskScore: 88, status: 'COMPROMISED' },
  { id: 'node-4', label: 'Auth Gateway', type: 'SERVER', riskScore: 40, status: 'SUSPICIOUS' },
  { id: 'node-5', label: 'User: admin_dev', type: 'USER', riskScore: 65, status: 'SUSPICIOUS' },
  { id: 'node-6', label: 'CVE-2026-8819', type: 'VULNERABILITY', riskScore: 92, status: 'COMPROMISED' },
];

export const MOCK_EDGES: GraphEdge[] = [
  { id: 'edge-1', source: 'node-1', target: 'node-2', relationship: 'COMMUNICATES_WITH', weight: 4 },
  { id: 'edge-2', source: 'node-2', target: 'node-3', relationship: 'TARGETS', weight: 3 },
  { id: 'edge-3', source: 'node-5', target: 'node-4', relationship: 'AUTHENTICATES_TO', weight: 2 },
  { id: 'edge-4', source: 'node-6', target: 'node-3', relationship: 'EXPLOITS', weight: 5 },
];

export const MOCK_METRICS: SystemMetric[] = [
  { timestamp: '04:00', threatsDetected: 12, anomaliesBlocked: 45, activeNodes: 120, cpuUtilization: 34 },
  { timestamp: '05:00', threatsDetected: 18, anomaliesBlocked: 52, activeNodes: 124, cpuUtilization: 41 },
  { timestamp: '06:00', threatsDetected: 15, anomaliesBlocked: 60, activeNodes: 128, cpuUtilization: 38 },
  { timestamp: '07:00', threatsDetected: 24, anomaliesBlocked: 78, activeNodes: 135, cpuUtilization: 58 },
  { timestamp: '08:00', threatsDetected: 31, anomaliesBlocked: 94, activeNodes: 142, cpuUtilization: 67 },
  { timestamp: '09:00', threatsDetected: 28, anomaliesBlocked: 89, activeNodes: 140, cpuUtilization: 62 },
];
