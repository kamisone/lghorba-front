"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 14 min (JWT expires at 15 min)
const VISIBILITY_THRESHOLD_MS = 5 * 60 * 1000; // re-refresh if tab was hidden > 5 min

export default function TokenRefresher() {
  const router = useRouter();
  const lastRefreshAt = useRef<number>(0);
  const refreshing = useRef(false);

  const refresh = async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const res = await fetch("/next-api/auth/refresh", { method: "POST" });
      if (res.status === 401) {
        await fetch("/next-api/auth", { method: "DELETE" });
        router.replace("/login");
        return;
      }
      lastRefreshAt.current = Date.now();
    } catch {
      // network error — keep trying on next interval
    } finally {
      refreshing.current = false;
    }
  };

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastRefreshAt.current;
        if (elapsed > VISIBILITY_THRESHOLD_MS) refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
