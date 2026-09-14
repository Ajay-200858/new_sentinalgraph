export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';
export const API_TIMEOUT = 10000;

export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  DASHBOARD: {
    OVERVIEW: '/api/dashboard/overview',
    GRAPH: '/api/dashboard/graph',
    FORECAST: '/api/dashboard/forecast',
    EVENTS: '/api/dashboard/events',
  },
  SIMULATION: {
    STATUS: '/api/simulation/status',
    START: '/api/simulation/start',
    STOP: '/api/simulation/stop',
  },
  ANALYSIS: {
    MITRE: '/api/analysis/mitre',
    HOSTS: '/api/analysis/hosts',
  },
} as const;
