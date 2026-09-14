import { create } from 'zustand';
import { SentinelState, SeverityLevel } from '../types';
import { MOCK_ALERTS, MOCK_NODES, MOCK_EDGES } from '../services/mockData';

export const useSentinelStore = create<SentinelState>((set) => ({
  alerts: [],
  selectedAlertId: null,
  nodes: [],
  edges: [],
  isLoading: false,
  filterSeverity: 'ALL',

  setSelectedAlertId: (id: string | null) => set({ selectedAlertId: id }),

  setFilterSeverity: (severity: SeverityLevel | 'ALL') => set({ filterSeverity: severity }),

  fetchDashboardData: async () => {
    set({ isLoading: true });
    // Simulate network delay for realistic state experience
    await new Promise((resolve) => setTimeout(resolve, 300));
    set({
      alerts: MOCK_ALERTS,
      nodes: MOCK_NODES,
      edges: MOCK_EDGES,
      isLoading: false,
    });
  },
}));
