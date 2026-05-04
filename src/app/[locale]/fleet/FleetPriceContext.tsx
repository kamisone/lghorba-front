"use client";

import { createContext, useContext } from "react";

interface PriceInfo { total: number; days: number }

interface FleetPriceCtxValue {
  prices: Map<string, PriceInfo>;
  loadingPrices: boolean;
  hasCtx: boolean;
}

export const FleetPriceContext = createContext<FleetPriceCtxValue>({
  prices: new Map(),
  loadingPrices: false,
  hasCtx: false,
});

export function useFleetPriceContext() {
  return useContext(FleetPriceContext);
}
