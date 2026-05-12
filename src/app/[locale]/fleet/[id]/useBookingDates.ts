"use client";
import { useEffect, useRef, useState } from "react";
import { type DateTimePickerHandle } from "@/components/DateTimePicker";
import { type SelectedAddress } from "@/components/AddressAutocomplete";
import { useResolvedBookingDates } from "@/hooks/useResolvedBookingDates";

export type PrefillSource = "url" | "storage" | null;

function isoToLocalDT(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function useBookingDates(
  urlStart:        string,
  urlEnd:          string,
  deliveryEnabled: boolean,
  deliveryType:    "radius" | "location" | null,
) {
  const searchCtx   = useResolvedBookingDates(urlStart, urlEnd);
  const endPickerRef = useRef<DateTimePickerHandle>(null);

  const [startDateTime, setStartRaw]      = useState("");
  const [endDateTime,   setEndRaw]        = useState("");
  const [startISO,      setStartISO]      = useState("");
  const [endISO,        setEndISO]        = useState("");
  const [prefillSource, setPrefillSource] = useState<PrefillSource>(null);
  const [prefillAddress, setPrefillAddress] = useState<SelectedAddress | null>(null);

  useEffect(() => {
    if (!searchCtx) return;
    setStartRaw(isoToLocalDT(searchCtx.start));
    setEndRaw(isoToLocalDT(searchCtx.end));
    setStartISO(searchCtx.start);
    setEndISO(searchCtx.end);
    setPrefillSource(searchCtx.source);
    if (deliveryEnabled && deliveryType === "radius" && searchCtx.address) {
      setPrefillAddress({ lat: searchCtx.address.lat, lng: searchCtx.address.lng, label: searchCtx.address.label });
    }
  }, [searchCtx, deliveryEnabled, deliveryType]);

  function setStartDateTime(v: string) {
    setStartRaw(v);
    setStartISO(v ? new Date(v).toISOString() : "");
    setPrefillSource(null);
    if (endDateTime && v && new Date(endDateTime) <= new Date(v)) {
      setEndRaw("");
      setEndISO("");
    }
  }

  function setEndDateTime(v: string) {
    setEndRaw(v);
    setEndISO(v ? new Date(v).toISOString() : "");
    setPrefillSource(null);
  }

  function handleStartComplete() {
    setTimeout(() => endPickerRef.current?.openPicker(), 160);
  }

  return {
    startDateTime, endDateTime,
    startISO, endISO,
    prefillSource, setPrefillSource,
    prefillAddress,
    setStartDateTime, setEndDateTime,
    endPickerRef,
    handleStartComplete,
  };
}
