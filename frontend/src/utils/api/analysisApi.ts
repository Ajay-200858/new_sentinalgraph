import { API_ENDPOINTS, USE_MOCK_DATA } from '../../config/api';
import { api } from '../api-client';
import { HostDetailsResponse, MitreResponse } from '../../types/api';
import { MOCK_MITRE_TECHNIQUES } from '../../mocks/mitreData';
import { MOCK_HOSTS_DATA } from '../../mocks/hostsData';
import { mapHostDetailsResponse, mapMitreResponse } from './mappers';

export const analysisApi = {
  // Fetch MITRE ATT&CK Matrix techniques & tactics summary
  getMitreData: async (): Promise<MitreResponse> => {
    const mockMitre: MitreResponse = {
      techniques: MOCK_MITRE_TECHNIQUES,
      totalTechniques: MOCK_MITRE_TECHNIQUES.length,
      observedTacticsCount: 6,
    };
    if (USE_MOCK_DATA) {
      return mockMitre;
    }
    try {
      const response = await api.get<any>(API_ENDPOINTS.ANALYSIS.MITRE);
      return mapMitreResponse(response);
    } catch (err) {
      console.warn('[analysisApi] FastAPI MITRE endpoint unavailable. Using mock fallback:', err);
      return mockMitre;
    }
  },

  // Fetch Host Telemetry Details for a target IP address
  getHostDetails: async (ipAddress: string = '10.0.0.21'): Promise<HostDetailsResponse> => {
    const matchedHost =
      MOCK_HOSTS_DATA[ipAddress] || Object.values(MOCK_HOSTS_DATA)[0];
    const mockHostResponse: HostDetailsResponse = {
      host: matchedHost,
    };
    if (USE_MOCK_DATA) {
      return mockHostResponse;
    }
    try {
      const response = await api.get<any>(`${API_ENDPOINTS.ANALYSIS.HOSTS}/${ipAddress}`);
      return mapHostDetailsResponse(response);
    } catch (err) {
      console.warn(`[analysisApi] FastAPI host details endpoint for ${ipAddress} unavailable. Using mock fallback:`, err);
      return mockHostResponse;
    }
  },
};
