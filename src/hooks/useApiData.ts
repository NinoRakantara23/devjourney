import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * Small async reader used by management pages. It keeps the last successful
 * value visible when a later refresh fails, so the UI never pretends a write
 * succeeded while the API is unreachable.
 */
export function useApiData<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    try {
      const result = await loaderRef.current();
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat menghubungi API.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // The caller owns the dependency list; loaderRef always points at the latest loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, reload };
}
