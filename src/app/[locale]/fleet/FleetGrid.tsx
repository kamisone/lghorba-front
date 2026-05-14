"use client";

import { useState, useEffect } from "react";
import { FleetPriceContext } from "./FleetPriceContext";
import { loadSearchContext } from "@/lib/searchContext";
import { api } from "@/lib/api";
import styles from "./fleet.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FleetCar {
  id: string;
  name: string;
  description: string | null;
  hasPhoto: boolean;
  isAvailable: boolean;
  nextAvailableDate?: string | null;
  vehicleType?: string | null;
  energy?: string | null;
  gearbox?: string | null;
  numberOfSeats?: number | null;
  mileage?: string | null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchCtx { start: string; end: string }
interface PriceInfo  { total: number; days: number }

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  carIds:   string[];
  children: React.ReactNode;
}

export default function FleetGrid({ carIds, children }: Props) {
  const [prices,        setPrices]        = useState<Map<string, PriceInfo>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [ctx,           setCtx]           = useState<SearchCtx | null>(null);

  // Read search context from localStorage on mount
  useEffect(() => {
    const stored = loadSearchContext();
    if (stored && new Date(stored.start) > new Date()) {
      setCtx({ start: stored.start, end: stored.end });
    }
  }, []);

  // Fetch prices for all cars when context is known
  useEffect(() => {
    if (!ctx || carIds.length === 0) return;
    const { start, end } = ctx;
    const controller = new AbortController();
    setLoadingPrices(true);
    setPrices(new Map());

    Promise.allSettled(
      carIds.map(carId =>
        api.cars.getPrice(carId, start, end, controller.signal).catch(() => null)
      )
    ).then(settled => {
      if (controller.signal.aborted) return;
      const map = new Map<string, PriceInfo>();
      settled.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(carIds[i], { total: r.value.totalPrice, days: r.value.numberOfDays });
        }
      });
      setPrices(map);
      setLoadingPrices(false);
    });

    return () => controller.abort();
  }, [ctx, carIds]);

  return (
    <FleetPriceContext.Provider value={{ prices, loadingPrices, hasCtx: ctx !== null }}>
      <div className={styles.grid}>{children}</div>
    </FleetPriceContext.Provider>
  );
}
