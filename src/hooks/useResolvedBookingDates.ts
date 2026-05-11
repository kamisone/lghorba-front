"use client";

import { useEffect, useState } from "react";
import { loadSearchContext, type SearchContext } from "@/lib/searchContext";

export type ResolvedBookingDates = {
  start:    string;
  end:      string;
  source:   "url" | "storage";
  address?: SearchContext["address"];
};

/**
 * Single source of truth for booking-panel / search-context date resolution.
 *
 * Resolution order:
 *   1. URL params (urlStart / urlEnd) — validated as future dates
 *   2. localStorage (loadSearchContext) — validated as future dates
 *   3. null  (nothing usable)
 *
 * Accepts the raw URL params as arguments (passed from the server component via
 * props) rather than re-reading them through useSearchParams(), so there is no
 * Suspense boundary requirement and no risk of diverging from what the server
 * already parsed.
 *
 * The initial useState value mirrors what will be computed in the first
 * useEffect run so that the SSR output and client initial render agree —
 * this avoids React hydration warnings when URL params are present.
 */
export function useResolvedBookingDates(
  urlStart: string,
  urlEnd:   string,
): ResolvedBookingDates | null {
  const [resolved, setResolved] = useState<ResolvedBookingDates | null>(() =>
    // Optimistic initial value: trust URL params exist (server already checked).
    // useEffect will validate against "now" and refine on the client.
    urlStart && urlEnd ? { start: urlStart, end: urlEnd, source: "url" } : null,
  );

  useEffect(() => {
    const now = new Date();

    if (urlStart && urlEnd && new Date(urlStart) > now) {
      // URL params are present and the start date is still in the future.
      // Pull the stored delivery address if available — it was saved separately
      // by the search-results page and is not carried in the car-detail URL.
      const stored = loadSearchContext();
      setResolved({
        start:   urlStart,
        end:     urlEnd,
        source:  "url",
        address: stored?.address,
      });
      return;
    }

    // URL params absent or stale — fall back to localStorage.
    const stored = loadSearchContext();
    if (stored && new Date(stored.start) > now) {
      setResolved({
        start:   stored.start,
        end:     stored.end,
        source:  "storage",
        address: stored.address,
      });
      return;
    }

    setResolved(null);
  }, [urlStart, urlEnd]);

  return resolved;
}
