"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TokenRefresher() {
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let isRefreshing = false;
    let queue: Array<() => void> = [];

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const input = args[0];
      const url = input instanceof Request ? input.url : String(input);

      // Never intercept auth endpoints — avoids infinite loops
      if (url.includes("/next-api/auth")) {
        return originalFetch(...args);
      }

      const res = await originalFetch(...args);
      if (res.status !== 401) return res;

      // Another refresh is already in flight — queue this retry
      if (isRefreshing) {
        return new Promise<Response>((resolve) => {
          queue.push(() => resolve(originalFetch(...args)));
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await originalFetch("/next-api/auth/refresh", { method: "POST" });

        if (refreshRes.ok) {
          // New access token set — flush queued retries then retry this one
          queue.forEach(fn => fn());
          queue = [];
          isRefreshing = false;
          return originalFetch(...args);
        }

        // Refresh token also expired → force re-login
        queue = [];
        isRefreshing = false;
        await originalFetch("/next-api/auth", { method: "DELETE" });
        router.replace("/login");
        return res;
      } catch {
        queue = [];
        isRefreshing = false;
        return res;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
