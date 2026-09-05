"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface QueryResult<T> {
  data: T | undefined;
  /** True only on the first load; a refetch sets `isRefreshing` instead. */
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | undefined;
  /** Re-runs the query, keeping the previous data visible while it does. */
  refetch: () => Promise<void>;
  /** Replaces the cached value without a round trip (optimistic updates). */
  setData: (update: T | ((previous: T | undefined) => T)) => void;
}

/**
 * Runs an async read and tracks loading, refreshing and error state.
 *
 * This is deliberately small rather than a data-fetching library: the app is
 * online-only, so there is no cache to persist or invalidate across sessions,
 * and every screen wants the same four states (loading / error / empty / data).
 *
 * `deps` behaves like a `useEffect` dependency list — change it and the query
 * re-runs. Results from a superseded run are discarded, so a fast second query
 * can never be overwritten by a slow first one.
 */
export function useQuery<T>(
  run: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean } = {},
): QueryResult<T> {
  const enabled = options.enabled ?? true;

  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Identifies the newest run so stale responses can be dropped.
  const runIdRef = useRef(0);
  const runRef = useRef(run);
  const hasLoadedRef = useRef(false);

  // Keeps the latest callback without making it a dependency of `execute`,
  // which would re-run the query on every parent render.
  useEffect(() => {
    runRef.current = run;
  });

  const execute = useCallback(async () => {
    const runId = ++runIdRef.current;

    if (hasLoadedRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError(undefined);

    try {
      const result = await runRef.current();
      if (runId !== runIdRef.current) return; // superseded
      setDataState(result);
      hasLoadedRef.current = true;
    } catch (cause) {
      if (runId !== runIdRef.current) return;
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      if (runId === runIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }
    void execute();
    // `deps` is the caller's dependency list, spread so React compares each item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, execute, ...deps]);

  const setData = useCallback((update: T | ((previous: T | undefined) => T)) => {
    setDataState((previous) =>
      typeof update === "function" ? (update as (p: T | undefined) => T)(previous) : update,
    );
  }, []);

  return { data, isLoading, isRefreshing, error, refetch: execute, setData };
}
