import { HostDetailsData } from '../types/analysis';
import { MOCK_SECURITY_EVENTS } from './eventsData';

export const MOCK_HOSTS_DATA: Record<string, HostDetailsData> = {
  '10.0.0.21': {
    ipAddress: '10.0.0.21',
    hostType: 'Internal',
    riskScore: 82,
    riskLevel: 'High',
    status: 'Under Investigation',
    lastSeen: '2 minutes ago',
    riskTrend: 'Increasing (+14%)',
    attackRate: '18.4%',
    flowCount: 1245,
    detectedThreats: [
      { threatName: 'PortScan Probe', severity: 'High', eventCount: 24 },
      { threatName: 'DoS Flooding', severity: 'Medium', eventCount: 8 },
      { threatName: 'DDoS Amplification', severity: 'Critical', eventCount: 3 },
    ],
    partners: [
      { ip: '10.0.0.5', riskStatus: 'Low', flowCount: 420 },
      { ip: '10.0.0.12', riskStatus: 'Medium', flowCount: 310 },
      { ip: '10.0.0.35', riskStatus: 'High', flowCount: 890 },
      { ip: '192.168.1.20', riskStatus: 'Low', flowCount: 150 },
    ],
    recentEvents: MOCK_SECURITY_EVENTS.slice(0, 5),
    recommendation: {
      action: 'Investigate and consider isolating the affected host',
      risk: 'High',
      reason: 'Multiple suspicious scanning and denial-of-service events detected on host 10.0.0.21.',
    },
  },

  '10.0.0.35': {
    ipAddress: '10.0.0.35',
    hostType: 'Internal',
    riskScore: 94,
    riskLevel: 'Critical',
    status: 'Active Threat',
    lastSeen: 'Just now',
    riskTrend: 'Escalating (+28%)',
    attackRate: '42.1%',
    flowCount: 3820,
    detectedThreats: [
      { threatName: 'Privilege Escalation', severity: 'Critical', eventCount: 18 },
      { threatName: 'C2 Communication', severity: 'Critical', eventCount: 12 },
      { threatName: 'Data Exfiltration', severity: 'High', eventCount: 9 },
    ],
    partners: [
      { ip: '10.0.0.21', riskStatus: 'High', flowCount: 890 },
      { ip: '185.220.101.5', riskStatus: 'Critical', flowCount: 2450 },
      { ip: '10.0.4.12', riskStatus: 'Critical', flowCount: 1100 },
    ],
    recentEvents: MOCK_SECURITY_EVENTS.slice(2, 7),
    recommendation: {
      action: 'Isolate Host Node Immediately',
      risk: 'Critical',
      reason: 'Host 10.0.0.35 actively communicating with external C2 node and attempting database exfiltration.',
    },
  },

  '10.0.0.42': {
    ipAddress: '10.0.0.42',
    hostType: 'Internal',
    riskScore: 48,
    riskLevel: 'Medium',
    status: 'Monitoring',
    lastSeen: '5 minutes ago',
    riskTrend: 'Stable',
    attackRate: '6.2%',
    flowCount: 890,
    detectedThreats: [
      { threatName: 'Suspicious Auth Attempt', severity: 'Medium', eventCount: 5 },
      { threatName: 'PortScan Listener', severity: 'Low', eventCount: 2 },
    ],
    partners: [
      { ip: '10.0.0.5', riskStatus: 'Low', flowCount: 340 },
      { ip: '192.168.1.10', riskStatus: 'Low', flowCount: 550 },
    ],
    recentEvents: MOCK_SECURITY_EVENTS.slice(5, 10),
    recommendation: {
      action: 'Audit User Session Logs',
      risk: 'Medium',
      reason: 'Intermittent authentication anomalies observed on workstation 10.0.0.42.',
    },
  },

  '192.168.1.10': {
    ipAddress: '192.168.1.10',
    hostType: 'Internal',
    riskScore: 12,
    riskLevel: 'Low',
    status: 'Normal',
    lastSeen: 'Just now',
    riskTrend: 'Decreasing (-2%)',
    attackRate: '0.1%',
    flowCount: 650,
    detectedThreats: [
      { threatName: 'Benign Replication', severity: 'Low', eventCount: 1 },
    ],
    partners: [
      { ip: '10.0.0.42', riskStatus: 'Medium', flowCount: 550 },
      { ip: '8.8.8.8', riskStatus: 'Low', flowCount: 100 },
    ],
    recentEvents: MOCK_SECURITY_EVENTS.slice(10, 15),
    recommendation: {
      action: 'No Action Required',
      risk: 'Low',
      reason: 'Host behavior consistent with baseline normal network activity.',
    },
  },
};
