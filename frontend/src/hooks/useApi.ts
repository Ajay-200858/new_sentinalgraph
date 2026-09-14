import { useState, useCallback } from 'react';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useApi = <T>(initialData: T | null = null) => {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (apiCall: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiCall();
        setData(result);
        return result;
      } catch (err: any) {
        const errorMessage =
          err?.message || 'Unable to refresh security telemetry data.';
        setError(errorMessage);
        console.error('[useApi Execution Error]:', errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, loading, error, execute, setData, setLoading, setError };
};

export default useApi;
