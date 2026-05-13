"use client";
import { useEffect, useRef, useState } from "react";
import { type DateTimePickerHandle } from "@/components/DateTimePicker";
import { type SelectedAddress } from "@/components/AddressAutocomplete";
import { useResolvedBookingDates } from "@/hooks/useResolvedBookingDates";
import { isoToLocalDT } from "@/lib/dateUtils";

export type PrefillSource = "url" | "storage" | null;

export function useBookingDates(
  urlStart:        string,
  urlEnd:          string,
  deliveryEnabled: boolean,
  deliveryType:    "radius" | "location" | null,
  businessTz:      string = "Europe/Paris",
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
    setStartRaw(isoToLocalDT(searchCtx.start, businessTz));
    setEndRaw(isoToLocalDT(searchCtx.end, businessTz));
    setStartISO(searchCtx.start);
    setEndISO(searchCtx.end);
    setPrefillSource(searchCtx.source);
    if (deliveryEnabled && deliveryType === "radius" && searchCtx.address) {
      setPrefillAddress({ lat: searchCtx.address.lat, lng: searchCtx.address.lng, label: searchCtx.address.label });
    }
  }, [searchCtx, deliveryEnabled, deliveryType, businessTz]);

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
