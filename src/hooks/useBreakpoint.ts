"use client";

import { useEffect, useState } from "react";
import { type Breakpoint, mq } from "@/styles/breakpoints";

/**
 * Returns true while the viewport matches the given breakpoint's max-width query.
 *
 * @example
 *   const isPhone  = useBreakpoint("phone");   // true when width ≤ 640 px
 *   const isTablet = useBreakpoint("tablet");  // true when width ≤ 1024 px
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const query = mq[breakpoint];
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
