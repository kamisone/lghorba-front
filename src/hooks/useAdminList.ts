"use client";

import { useCallback, useEffect, useState } from "react";

export function useAdminList<T>(url: string) {
  const [data, setData]       = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (res.ok) {
        setData(await res.json());
      } else {
        setError("Failed to load");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}
