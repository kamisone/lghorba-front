"use client";
import { useCallback, useEffect, useState } from "react";
import { getTranslations } from "@/lib/i18n";

export interface PriceBreakdownItem {
  startDate:    string;
  endDate:      string;
  pricePerDay:  number;
  days:         number;
  subtotal:     number;
  label:        string | null;
}

export interface PriceResult {
  totalPrice:      number;
  numberOfDays:    number;
  breakdown:       PriceBreakdownItem[];
  basePricePerDay: number | null;
}

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
      const [availRes, priceRes] = await Promise.all([
        fetch(`/next-api/public/cars/${carId}/availability?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`),
        fetch(`/next-api/public/cars/${carId}/price?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`),
      ]);
      if (availRes.ok) {
        const data = await availRes.json();
        setAvailable(data.available ?? false);
      }
      if (priceRes.ok) {
        const data: PriceResult = await priceRes.json();
        setPriceResult(data);
      }
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
