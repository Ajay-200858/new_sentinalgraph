import { useEffect, useRef } from 'react';

export interface UsePollingOptions {
  enabled?: boolean;
  immediate?: boolean;
}

/**
 * Reusable polling hook.
 * Executes `callback` at the specified `intervalMs` when `enabled` is true.
 * Ensures clean interval teardown on unmount, interval change, or disable.
 */
export const usePolling = (
  callback: () => void | Promise<void>,
  intervalMs: number,
  options: UsePollingOptions = {}
) => {
  const { enabled = true, immediate = false } = options;
  const savedCallback = useRef(callback);

  // Always keep reference to the latest callback to prevent stale closures
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    if (immediate) {
      savedCallback.current();
    }

    const timer = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs, enabled, immediate]);
};

export default usePolling;
