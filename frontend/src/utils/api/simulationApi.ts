import { API_ENDPOINTS, USE_MOCK_DATA } from '../../config/api';
import { api } from '../api-client';
import { SimulationStatusResponse } from '../../types/api';
import { DatasetName, ReplaySpeed } from '../../types/simulation';
import { mapSimulationStatusResponse } from './mappers';

const MOCK_SIMULATION_STATUS: SimulationStatusResponse = {
  status: 'Stopped',
  selectedDataset: 'CICIDS2017',
  speed: '1x',
  flowsProcessed: 2450,
  totalFlows: 10000,
  attacksDetected: 186,
  currentRisk: 'High',
  duration: '02:14',
};

export const simulationApi = {
  // Fetch current simulation engine execution status
  getSimulationStatus: async (): Promise<SimulationStatusResponse> => {
    if (USE_MOCK_DATA) {
      return MOCK_SIMULATION_STATUS;
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.SIMULATION.STATUS);
      return mapSimulationStatusResponse(response);
    } catch (err) {
      console.warn('[simulationApi] FastAPI simulation status endpoint unavailable. Using mock fallback:', err);
      return MOCK_SIMULATION_STATUS;
    }
  },

  // Trigger start traffic replay dataset execution
  startSimulation: async (
    dataset: DatasetName = 'CICIDS2017',
    speed: ReplaySpeed = '1x'
  ): Promise<SimulationStatusResponse> => {
    const activeStatus: SimulationStatusResponse = {
      ...MOCK_SIMULATION_STATUS,
      status: 'Running',
      selectedDataset: dataset,
      speed,
    };
    if (USE_MOCK_DATA) {
      return activeStatus;
    }
    try {
      const response = await api.post<any>(API_ENDPOINTS.SIMULATION.START, {
        dataset,
        speed,
      });
      return mapSimulationStatusResponse(response);
    } catch (err) {
      console.warn('[simulationApi] FastAPI start simulation endpoint unavailable. Using mock fallback:', err);
      return activeStatus;
    }
  },

  // Trigger stop / pause traffic replay dataset execution
  stopSimulation: async (): Promise<SimulationStatusResponse> => {
    const stoppedStatus: SimulationStatusResponse = {
      ...MOCK_SIMULATION_STATUS,
      status: 'Stopped',
    };
    if (USE_MOCK_DATA) {
      return stoppedStatus;
    }
    try {
      const response = await api.post<any>(API_ENDPOINTS.SIMULATION.STOP);
      return mapSimulationStatusResponse(response);
    } catch (err) {
      console.warn('[simulationApi] FastAPI stop simulation endpoint unavailable. Using mock fallback:', err);
      return stoppedStatus;
    }
  },
};
