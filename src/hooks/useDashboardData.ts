import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '../api';
import type { DashboardData } from '../types';

/**
 * Dashboard always reads real API data. If the API fails after a successful
 * load, the last successful value stays visible with an explicit error notice.
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiReachable, setApiReachable] = useState(false);

  const reload = useCallback(async (): Promise<DashboardData | null> => {
    setLoading(true);
    try {
      const result = await getDashboard();
      setData(result);
      setError(null);
      setApiReachable(true);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat menghubungi API.');
      setApiReachable(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, apiReachable, reload };
}
