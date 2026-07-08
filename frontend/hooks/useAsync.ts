import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<unknown>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Runs an async loader and tracks `data / error / loading`, re-running whenever
 * `deps` change. Replaces the repeated `.then().catch().finally()` blocks in pages.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(
    () => {
      setLoading(true);
      setError(null);
      return fn()
        .then((d) => setData(d))
        .catch((e: any) => setError(e?.message || 'Đã xảy ra lỗi'))
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}
