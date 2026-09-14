import { create } from 'zustand';
import { DashboardStore } from '../types/store';
import { MOCK_SECURITY_EVENTS } from '../mocks/eventsData';
import { MOCK_GRAPH_DATA } from '../mocks/graphData';

export const INITIAL_CURRENT_THREAT = {
  threatName: 'PortScan & Reconnaissance Probe',
  probability: 76,
  riskLevel: 'High' as const,
  explanation:
    'Automated reconnaissance probe detected scanning internal subnet 10.0.4.0/24 for unpatched CVEs.',
  affectedHostCount: 4,
  primaryHost: '10.0.4.12 (Prod-Postgres-Primary)',
  detectedTime: '2 minutes ago',
};

export const INITIAL_ESCALATIONS = [
  {
    id: 'ESC-101',
    threatName: 'Privilege Escalation Execution',
    probability: 88,
    timeline: '+1 minute',
    mitreTactic: 'Privilege Escalation',
    mitreId: 'TA0004 / T1068',
    affectedHosts: ['10.0.4.12', '192.168.1.105'],
    severity: 'Critical' as const,
    recommendedAction: 'Isolate Host 10.0.4.12',
  },
  {
    id: 'ESC-102',
    threatName: 'Database Data Exfiltration',
    probability: 74,
    timeline: '+3 minutes',
    mitreTactic: 'Exfiltration',
    mitreId: 'TA0010 / T1041',
    affectedHosts: ['10.0.4.12', '185.220.101.5'],
    severity: 'High' as const,
    recommendedAction: 'Block C2 Outbound Traffic',
  },
  {
    id: 'ESC-103',
    threatName: 'Lateral Network Spreading',
    probability: 62,
    timeline: '+5 minutes',
    mitreTactic: 'Lateral Movement',
    mitreId: 'TA0008 / T1021',
    affectedHosts: ['10.0.1.1', '192.168.1.50'],
    severity: 'High' as const,
    recommendedAction: 'Segment Subnet 10.0.1.0/24',
  },
  {
    id: 'ESC-104',
    threatName: 'Persistence Mechanism Installation',
    probability: 45,
    timeline: '+10 minutes',
    mitreTactic: 'Persistence',
    mitreId: 'TA0003 / T1543',
    affectedHosts: ['10.0.2.88'],
    severity: 'Medium' as const,
    recommendedAction: 'Audit Scheduled Tasks',
  },
];

export const INITIAL_RECOMMENDATION = {
  action: 'Isolate Host 10.0.4.12 (Prod-Postgres-Primary)',
  reason:
    'High likelihood (88%) of imminent database exfiltration following privilege escalation on host 10.0.4.12.',
  relatedThreat: 'Lateral Data Exfiltration',
  riskLevel: 'Critical' as const,
  affectedHost: 'Prod-Postgres-Primary',
  hostIp: '10.0.4.12',
  confidenceScore: 94,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  // A. Dashboard Statistics
  stats: {
    totalFlowsProcessed: 12450,
    attacksDetected: 328,
    hostsIsolated: 12,
    currentRiskLevel: 78,
    riskStatus: 'High',
  },

  // B. Attack Distribution
  attackDistribution: [
    { name: 'DDoS', value: 420, color: '#ff0000' },
    { name: 'DoS', value: 310, color: '#ff0055' },
    { name: 'PortScan', value: 240, color: '#ffaa00' },
    { name: 'Benign', value: 1480, color: '#00ff88' },
  ],

  // C. Risk Projection
  riskProjection: [
    { time: 'Now', currentRisk: 68, projectedRisk: 68 },
    { time: '+1min', currentRisk: 72, projectedRisk: 75 },
    { time: '+3min', currentRisk: 78, projectedRisk: 85 },
    { time: '+5min', currentRisk: 74, projectedRisk: 92 },
  ],

  // D. Security Events
  securityEvents: MOCK_SECURITY_EVENTS,

  // E. Network Graph Data
  graphNodes: MOCK_GRAPH_DATA.nodes,
  graphEdges: MOCK_GRAPH_DATA.edges,

  // F. Forecast Data
  forecast: {
    currentThreat: INITIAL_CURRENT_THREAT,
    escalations: INITIAL_ESCALATIONS,
    recommendation: INITIAL_RECOMMENDATION,
  },

  // G. Simulation State
  simulation: {
    selectedDataset: 'CICIDS2017',
    replaySpeed: '1x',
    replayStatus: 'Stopped',
    flowsProcessed: 2450,
    totalFlows: 10000,
    duration: '02:14',
  },

  // H. Settings
  settings: {
    speed: '1x',
    dataset: 'CICIDS2017',
    autoStart: false,
    pollingInterval: 2,
    darkTheme: true,
  },

  // I. Polling Streaming Status
  isPollingActive: true,

  // ACTIONS
  setDashboardStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),

  setRiskLevel: (level, status) =>
    set((state) => ({
      stats: {
        ...state.stats,
        currentRiskLevel: level,
        ...(status ? { riskStatus: status } : {}),
      },
    })),

  setSecurityEvents: (events) => set({ securityEvents: events }),

  setNetworkGraphData: (nodes, edges) =>
    set({
      graphNodes: nodes,
      graphEdges: edges,
    }),

  setForecastData: (forecastUpdate) =>
    set((state) => ({
      forecast: { ...state.forecast, ...forecastUpdate },
    })),

  setSelectedDataset: (dataset) =>
    set((state) => ({
      simulation: { ...state.simulation, selectedDataset: dataset },
      settings: { ...state.settings, dataset },
    })),

  setReplaySpeed: (speed) =>
    set((state) => ({
      simulation: { ...state.simulation, replaySpeed: speed },
      settings: { ...state.settings, speed },
    })),

  setReplayStatus: (status) =>
    set((state) => ({
      simulation: { ...state.simulation, replayStatus: status },
    })),

  setFlowsProcessed: (countOrFn) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        flowsProcessed:
          typeof countOrFn === 'function'
            ? countOrFn(state.simulation.flowsProcessed)
            : countOrFn,
      },
    })),

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
      simulation: {
        ...state.simulation,
        ...(newSettings.speed ? { replaySpeed: newSettings.speed } : {}),
        ...(newSettings.dataset ? { selectedDataset: newSettings.dataset } : {}),
      },
    })),

  resetSimulation: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        replayStatus: 'Stopped',
        flowsProcessed: 0,
      },
    })),

  setIsPollingActive: (active) => set({ isPollingActive: active }),
}));
