/* Copyright 2024 Marimo. All rights reserved. */
import { DependencyList, useState, useEffect } from "react";

/**
 * A hook that loads data asynchronously.
 * Handles loading and error states, and prevents race conditions.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: DependencyList
): {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    loader()
      .then((data) => {
        if (isCancelled) {
          return;
        }
        setData(data);
        setError(undefined);
      })
      .catch((error_) => {
        if (isCancelled) {
          return;
        }
        setError(error_);
      })
      .finally(() => {
        if (isCancelled) {
          return;
        }
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
