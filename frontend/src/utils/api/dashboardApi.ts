import { API_ENDPOINTS, USE_MOCK_DATA } from '../../config/api';
import { api } from '../api-client';
import {
  DashboardOverviewResponse,
  ForecastResponse,
  NetworkGraphResponse,
  SecurityEventsResponse,
} from '../../types/api';
import { MOCK_SECURITY_EVENTS } from '../../mocks/eventsData';
import { MOCK_GRAPH_DATA } from '../../mocks/graphData';
import {
  INITIAL_CURRENT_THREAT,
  INITIAL_ESCALATIONS,
  INITIAL_RECOMMENDATION,
} from '../../store/dashboardStore';
import {
  mapDashboardOverviewResponse,
  mapForecastResponse,
  mapNetworkGraphResponse,
  mapSecurityEventsResponse,
} from './mappers';

const MOCK_OVERVIEW_RESPONSE: DashboardOverviewResponse = {
  stats: {
    totalFlowsProcessed: 12450,
    attacksDetected: 328,
    hostsIsolated: 12,
    currentRiskLevel: 78,
    riskStatus: 'High',
  },
  attackDistribution: [
    { name: 'DDoS', value: 420, color: '#ff0000' },
    { name: 'DoS', value: 310, color: '#ff0055' },
    { name: 'PortScan', value: 240, color: '#ffaa00' },
    { name: 'Benign', value: 1480, color: '#00ff88' },
  ],
  riskProjection: [
    { time: 'Now', currentRisk: 68, projectedRisk: 68 },
    { time: '+1min', currentRisk: 72, projectedRisk: 75 },
    { time: '+3min', currentRisk: 78, projectedRisk: 85 },
    { time: '+5min', currentRisk: 74, projectedRisk: 92 },
  ],
  latestEvents: MOCK_SECURITY_EVENTS.slice(0, 5),
};

export const dashboardApi = {
  // Backend Service Health Check
  checkHealth: async (): Promise<{ status: string; service: string }> => {
    if (USE_MOCK_DATA) {
      return { status: 'healthy', service: 'sentinelgraph-mock' };
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.HEALTH);
      return response?.data || response || { status: 'healthy', service: 'sentinelgraph-backend' };
    } catch (err) {
      console.warn('[dashboardApi] Health endpoint check failed:', err);
      return { status: 'degraded', service: 'sentinelgraph-backend' };
    }
  },

  // Fetch Overview telemetry summary
  getDashboardOverview: async (): Promise<DashboardOverviewResponse> => {
    if (USE_MOCK_DATA) {
      return MOCK_OVERVIEW_RESPONSE;
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.DASHBOARD.OVERVIEW);
      return mapDashboardOverviewResponse(response);
    } catch (err) {
      console.warn('[dashboardApi] FastAPI overview endpoint unavailable. Using mock fallback:', err);
      return MOCK_OVERVIEW_RESPONSE;
    }
  },

  // Fetch Network Topology nodes & edges
  getNetworkGraph: async (): Promise<NetworkGraphResponse> => {
    const mockGraph: NetworkGraphResponse = {
      nodes: MOCK_GRAPH_DATA.nodes,
      edges: MOCK_GRAPH_DATA.edges,
    };
    if (USE_MOCK_DATA) {
      return mockGraph;
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.DASHBOARD.GRAPH);
      return mapNetworkGraphResponse(response);
    } catch (err) {
      console.warn('[dashboardApi] FastAPI graph endpoint unavailable. Using mock fallback:', err);
      return mockGraph;
    }
  },

  // Fetch Threat Forecast & Escalation cards
  getForecast: async (): Promise<ForecastResponse> => {
    const mockForecast: ForecastResponse = {
      currentThreat: INITIAL_CURRENT_THREAT,
      escalations: INITIAL_ESCALATIONS,
      recommendation: INITIAL_RECOMMENDATION,
    };
    if (USE_MOCK_DATA) {
      return mockForecast;
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.DASHBOARD.FORECAST);
      return mapForecastResponse(response);
    } catch (err) {
      console.warn('[dashboardApi] FastAPI forecast endpoint unavailable. Using mock fallback:', err);
      return mockForecast;
    }
  },

  // Fetch Security Events stream
  getSecurityEvents: async (): Promise<SecurityEventsResponse> => {
    const mockEvents: SecurityEventsResponse = {
      events: MOCK_SECURITY_EVENTS,
      totalCount: MOCK_SECURITY_EVENTS.length,
      page: 1,
      pageSize: MOCK_SECURITY_EVENTS.length,
    };
    if (USE_MOCK_DATA) {
      return mockEvents;
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.DASHBOARD.EVENTS);
      return mapSecurityEventsResponse(response);
    } catch (err) {
      console.warn('[dashboardApi] FastAPI security events endpoint unavailable. Using mock fallback:', err);
      return mockEvents;
    }
  },
};
