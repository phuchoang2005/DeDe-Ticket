import { useEffect, useRef } from 'react';

/**
 * Calls `callback` on an interval while `enabled`. Fires once immediately unless
 * `immediate` is false. Always reads the latest callback, so passing an inline
 * function does not reset the timer.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  { enabled = true, immediate = true }: { enabled?: boolean; immediate?: boolean } = {},
) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    if (immediate) saved.current();
    const timer = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled, immediate]);
}
