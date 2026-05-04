"use client";

import { useState, useEffect, useRef } from "react";
import { FleetPriceContext } from "./FleetPriceContext";
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

// ── Storage helpers ────────────────────────────────────────────────────────────

interface SearchCtx { start: string; end: string }
interface PriceInfo  { total: number; days: number }

const LS_KEY = "car_search_context";
const LS_TTL = 7 * 24 * 60 * 60 * 1000;

function loadStoredSearch(): SearchCtx | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { start?: string; end?: string; savedAt?: number };
    if (!p.start || !p.end || !p.savedAt) return null;
    if (Date.now() - p.savedAt > LS_TTL) { localStorage.removeItem(LS_KEY); return null; }
    if (new Date(p.start) <= new Date()) return null;
    return { start: p.start, end: p.end };
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  carIds:   string[];
  children: React.ReactNode;
}

export default function FleetGrid({ carIds, children }: Props) {
  const [prices,        setPrices]        = useState<Map<string, PriceInfo>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [ctx,           setCtx]           = useState<SearchCtx | null>(null);
  const initDone = useRef(false);

  // Read search context from localStorage on mount
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const stored = loadStoredSearch();
    if (stored) setCtx(stored);
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
        fetch(
          `/next-api/public/cars/${carId}/price?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
          { signal: controller.signal },
        ).then(r => r.ok ? (r.json() as Promise<{ totalPrice: number; numberOfDays: number }>) : null)
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
