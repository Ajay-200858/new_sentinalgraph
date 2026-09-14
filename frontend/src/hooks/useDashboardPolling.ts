import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import { dashboardApi } from '../utils/api/dashboardApi';
import { simulationApi } from '../utils/api/simulationApi';
import { usePolling } from './usePolling';

/**
 * Hook that manages active-page telemetry polling.
 * Executes polling based on settings.pollingInterval & active route.
 * Updates Zustand store state safely on successful responses without resetting UI.
 */
export const useDashboardPolling = () => {
  const location = useLocation();
  const pollingIntervalSec = useDashboardStore((state) => state.settings.pollingInterval);
  const isPollingActive = useDashboardStore((state) => state.isPollingActive);

  const setDashboardStats = useDashboardStore((state) => state.setDashboardStats);
  const setNetworkGraphData = useDashboardStore((state) => state.setNetworkGraphData);
  const setForecastData = useDashboardStore((state) => state.setForecastData);
  const setSecurityEvents = useDashboardStore((state) => state.setSecurityEvents);
  const setReplayStatus = useDashboardStore((state) => state.setReplayStatus);

  const intervalMs = (pollingIntervalSec || 2) * 1000;

  const handlePollActivePage = useCallback(async () => {
    const pathname = location.pathname;

    try {
      if (pathname.includes('/dashboard/overview') || pathname === '/') {
        const res = await dashboardApi.getDashboardOverview();
        if (res?.stats) {
          setDashboardStats(res.stats);
        }
      } else if (pathname.includes('/dashboard/graph')) {
        const res = await dashboardApi.getNetworkGraph();
        if (res?.nodes && res?.edges) {
          setNetworkGraphData(res.nodes, res.edges);
        }
      } else if (pathname.includes('/dashboard/forecast')) {
        const res = await dashboardApi.getForecast();
        if (res?.currentThreat) {
          setForecastData(res);
        }
      } else if (pathname.includes('/dashboard/events')) {
        const res = await dashboardApi.getSecurityEvents();
        if (res?.events) {
          setSecurityEvents(res.events);
        }
      } else if (pathname.includes('/simulation/replay')) {
        const res = await simulationApi.getSimulationStatus();
        if (res?.status) {
          setReplayStatus(res.status);
        }
      }
    } catch (error) {
      console.warn('[useDashboardPolling] Polling tick encountered error:', error);
    }
  }, [
    location.pathname,
    setDashboardStats,
    setNetworkGraphData,
    setForecastData,
    setSecurityEvents,
    setReplayStatus,
  ]);

  usePolling(handlePollActivePage, intervalMs, {
    enabled: isPollingActive,
    immediate: false,
  });
};

export default useDashboardPolling;
