"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TokenRefresher() {
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let isRefreshing = false;
    let queue: Array<{ resolve: (r: Response) => void; retry: () => Promise<Response> }> = [];

    function drainQueue(succeeded: boolean, fallback?: Response) {
      const pending = queue;
      queue = [];
      isRefreshing = false;
      if (succeeded) {
        pending.forEach(({ resolve, retry }) => resolve(retry()));
      } else {
        pending.forEach(({ resolve }) => resolve(fallback!));
      }
    }

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
          queue.push({ resolve, retry: () => originalFetch(...args) });
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await originalFetch("/next-api/auth/refresh", { method: "POST" });

        if (refreshRes.ok) {
          // New access token set — flush queued retries then retry this one
          drainQueue(true);
          return originalFetch(...args);
        }

        // Refresh token also expired → force re-login
        drainQueue(false, res);
        await originalFetch("/next-api/auth", { method: "DELETE" });
        router.replace("/login");
        return res;
      } catch {
        drainQueue(false, res);
        return res;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
