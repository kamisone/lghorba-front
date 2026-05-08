"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadSearchContext, saveSearchContext, type SearchAddress } from "@/lib/searchContext";

export interface ResolvedSearchContext {
  start: string;
  end: string;
  source: "url" | "storage";
  address?: SearchAddress;
}

export function useSearchContext(): ResolvedSearchContext | null {
  const params = useSearchParams();
  const urlStart   = params.get("start")   ?? "";
  const urlEnd     = params.get("end")     ?? "";
  const urlLat     = params.get("lat")     ?? "";
  const urlLng     = params.get("lng")     ?? "";
  const urlAddress = params.get("address") ?? "";

  const [ctx, setCtx] = useState<ResolvedSearchContext | null>(null);

  useEffect(() => {
    const now = new Date();
    if (urlStart && urlEnd && new Date(urlStart) > now) {
      const address: SearchAddress | undefined =
        urlLat && urlLng && urlAddress
          ? { lat: parseFloat(urlLat), lng: parseFloat(urlLng), label: urlAddress }
          : undefined;
      saveSearchContext(urlStart, urlEnd, address);
      setCtx({ start: urlStart, end: urlEnd, source: "url", address });
      return;
    }
    const stored = loadSearchContext();
    if (stored && new Date(stored.start) > now) {
      setCtx({ start: stored.start, end: stored.end, source: "storage", address: stored.address });
      return;
    }
    setCtx(null);
  }, [urlStart, urlEnd, urlLat, urlLng, urlAddress]);

  return ctx;
}
