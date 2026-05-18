"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type SelectedAddress } from "@/components/AddressAutocomplete";
import { saveSearchContext } from "@/lib/searchContext";
import { getTranslations } from "@/lib/i18n";
import SearchRefinementPanel from "./SearchRefinementPanel";
import SearchResults from "./SearchResults";
import styles from "./SearchClient.module.css";

interface SearchResult {
  id:               string;
  name:             string;
  description:      string | null;
  hasPhoto:         boolean;
  brand:            string | null;
  model:            string | null;
  finishing:        string | null;
  modelYear:        number | null;
  vehicleType:      string | null;
  energy:           string | null;
  gearbox:          string | null;
  numberOfSeats:    number | null;
  basePricePerDay:  number | null;
  parkingAddress:   string | null;
  deliveryEnabled:      boolean;
  deliveryType:         string | null;
  deliveryRadiusKm:     number | null;
  deliveryRadiusPrice:  number | null;
  distanceKm:           number | null;
  deliveryAvailable:    boolean;
}

interface Props {
  initialResults: SearchResult[];
  initialStart:   string;
  initialEnd:     string;
  initialLat:     string;
  initialLng:     string;
  initialAddress: string;
  locale:         string;
}

export default function SearchClient({
  initialResults,
  initialStart,
  initialEnd,
  initialLat,
  initialLng,
  initialAddress,
  locale,
}: Props) {
  const router = useRouter();
  const t      = getTranslations(locale);

  const [results,  setResults]  = useState<SearchResult[]>(initialResults);
  const [start,    setStart]    = useState(initialStart);
  const [end,      setEnd]      = useState(initialEnd);
  const [lat,      setLat]      = useState(initialLat);
  const [lng,      setLng]      = useState(initialLng);
  const [address,  setAddress]  = useState(initialAddress);
  const [loading,  setLoading]  = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const initialAddressObj: SelectedAddress | null =
    initialLat && initialLng && initialAddress
      ? { lat: parseFloat(initialLat), lng: parseFloat(initialLng), label: initialAddress }
      : null;

  const handleSearch = useCallback(async (
    newStart:   string,
    newEnd:     string,
    newAddress: SelectedAddress | null,
  ) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Sync URL without triggering a server re-render scroll jump
    const params = new URLSearchParams({ start: newStart, end: newEnd });
    if (newAddress) {
      params.set("lat",     String(newAddress.lat));
      params.set("lng",     String(newAddress.lng));
      params.set("address", newAddress.label);
    }
    router.push(`/${locale}/search?${params.toString()}`, { scroll: false });

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        startDateTime: newStart,
        endDateTime:   newEnd,
        lang:          locale,
      };
      if (newAddress) {
        body.addressLat   = newAddress.lat;
        body.addressLng   = newAddress.lng;
        body.addressLabel = newAddress.label;
      }

      const res  = await fetch("/next-api/public/cars/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  ctrl.signal,
        cache:   "no-store",
      });

      if (!res.ok) { setLoading(false); return; }

      const data = await res.json() as SearchResult[];
      setResults(data);
      setStart(newStart);
      setEnd(newEnd);
      setLat(newAddress  ? String(newAddress.lat) : "");
      setLng(newAddress  ? String(newAddress.lng) : "");
      setAddress(newAddress ? newAddress.label : "");

      // Persist for cross-page pre-fill
      saveSearchContext(newStart, newEnd,
        newAddress ? { lat: newAddress.lat, lng: newAddress.lng, label: newAddress.label } : undefined,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // keep existing results on network error
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [locale, router]);

  const hasAddress = Boolean(address && lat && lng);

  return (
    <>
      <SearchRefinementPanel
        initialStart={initialStart}
        initialEnd={initialEnd}
        initialAddress={initialAddressObj}
        labels={{
          fromLabel:          t.search.fromLabel,
          toLabel:            t.search.toLabel,
          addressLabel:       t.search.addressLabel,
          addressPlaceholder: t.search.addressPlaceholder,
          addressOptional:    t.search.addressOptional,
          searchBtn:          t.search.searchBtn,
          searching:          t.search.searching,
          dateError:          t.search.dateError,
          anyLocation:        t.search.anyLocation,
          modifySearch:       t.search.backToSearch,
        }}
        loading={loading}
        onSearch={handleSearch}
      />

      <div className={`${styles.resultsWrap} ${loading ? styles.resultsLoading : ""}`}>
        <SearchResults
          results={results}
          start={start}
          end={end}
          locale={locale}
          hasAddress={hasAddress}
          lat={lat}
          lng={lng}
          address={address}
        />
      </div>
    </>
  );
}
