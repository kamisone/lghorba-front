"use client";
import { useCallback, useEffect, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { api, type PriceResult } from "@/lib/api";

export type { PriceBreakdownItem, PriceResult } from "@/lib/api";

export function useBookingPricing(
  carId:        string,
  startISO:     string,
  endISO:       string,
  locale:       string,
  dateErrorMsg: string,
) {
  const t = getTranslations(locale);

  const [available,   setAvailable]   = useState<boolean | null>(null);
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [checking,    setChecking]    = useState(false);
  const [dateError,   setDateError]   = useState("");

  const fetchAvailabilityAndPrice = useCallback(async (start: string, end: string) => {
    setChecking(true);
    setAvailable(null);
    setPriceResult(null);
    try {
      const [availData, priceData] = await Promise.all([
        api.cars.checkAvailability(carId, start, end),
        api.cars.getPrice(carId, start, end),
      ]);
      setAvailable(availData.available ?? false);
      setPriceResult(priceData);
    } catch {
      // network error — leave states null
    } finally {
      setChecking(false);
    }
  }, [carId]);

  useEffect(() => {
    if (!startISO || !endISO) {
      setAvailable(null);
      setPriceResult(null);
      setDateError("");
      return;
    }
    const start = new Date(startISO);
    const end   = new Date(endISO);
    if (start <= new Date()) {
      setDateError(t.booking.pickupFuture);
      setAvailable(null);
      setPriceResult(null);
      return;
    }
    if (end <= start) {
      setDateError(dateErrorMsg);
      setAvailable(null);
      setPriceResult(null);
      return;
    }
    setDateError("");
    fetchAvailabilityAndPrice(startISO, endISO);
  }, [startISO, endISO, fetchAvailabilityAndPrice, dateErrorMsg, t.booking.pickupFuture]);

  return { available, priceResult, checking, dateError };
}
