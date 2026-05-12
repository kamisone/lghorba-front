"use client";
import { useEffect, useState } from "react";
import { type SelectedAddress } from "@/components/AddressAutocomplete";

export interface DeliveryLocationOption {
  id:       string;
  label:    string;
  address:  string;
  lat:      number;
  lng:      number;
  radiusKm: number;
  price:    number | null;
}

export interface DeliveryValidation {
  available: boolean;
  fee:       number | null;
}

export function useDeliveryMode(
  carId:          string,
  deliveryEnabled: boolean,
  deliveryType:    "radius" | "location" | null,
  deliveryLocations: DeliveryLocationOption[],
  initialAddress: SelectedAddress | null,
) {
  const [deliveryMode,       setDeliveryMode]       = useState<"pickup" | "delivery">("pickup");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [deliveryAddress,    setDeliveryAddress]    = useState<SelectedAddress | null>(null);
  const [deliveryValidation, setDeliveryValidation] = useState<DeliveryValidation | null>(null);
  const [checkingDelivery,   setCheckingDelivery]   = useState(false);

  // Apply prefill address from search context (set once when it arrives)
  useEffect(() => {
    if (!initialAddress) return;
    setDeliveryAddress(initialAddress);
    setDeliveryMode("delivery");
  }, [initialAddress]);

  // Validate delivery address for radius mode
  useEffect(() => {
    if (!deliveryEnabled || deliveryType !== "radius" || deliveryMode !== "delivery" || !deliveryAddress) {
      setDeliveryValidation(null);
      return;
    }
    const controller = new AbortController();
    setCheckingDelivery(true);
    setDeliveryValidation(null);
    fetch(`/next-api/public/cars/${carId}/delivery/validate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressLat:   deliveryAddress.lat,
        addressLng:   deliveryAddress.lng,
        addressLabel: deliveryAddress.label,
      }),
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() as Promise<DeliveryValidation> : null)
      .then(data => { if (data) setDeliveryValidation(data); })
      .catch(() => {/* ignore abort */})
      .finally(() => setCheckingDelivery(false));
    return () => controller.abort();
  }, [carId, deliveryEnabled, deliveryType, deliveryMode, deliveryAddress]);

  const selectedLoc = deliveryLocations.find(l => l.id === selectedLocationId) ?? null;

  const activeDeliveryFee: number = deliveryEnabled && deliveryMode === "delivery"
    ? deliveryType === "location"
      ? (selectedLoc?.price ?? 0)
      : (deliveryValidation?.available ? (deliveryValidation.fee ?? 0) : 0)
    : 0;

  const deliveryReady = !deliveryEnabled || deliveryMode === "pickup"
    || (deliveryType === "location" && selectedLocationId !== null)
    || (deliveryType === "radius"   && deliveryValidation?.available === true && !checkingDelivery);

  return {
    deliveryMode,       setDeliveryMode,
    selectedLocationId, setSelectedLocationId,
    deliveryAddress,    setDeliveryAddress,
    deliveryValidation, setDeliveryValidation,
    checkingDelivery,
    selectedLoc,
    activeDeliveryFee,
    deliveryReady,
  };
}
