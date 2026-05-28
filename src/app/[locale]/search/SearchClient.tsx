"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { type SelectedAddress } from "@/components/AddressAutocomplete";
import { saveSearchContext } from "@/lib/searchContext";
import { getTranslations } from "@/lib/i18n";
import SearchRefinementPanel from "./SearchRefinementPanel";
import SearchResults from "./SearchResults";
import styles from "./SearchClient.module.css";

// Lazy-load the map (Leaflet is not SSR-compatible)
const SearchMap = dynamic(() => import("./SearchMap"), {
  ssr: false,
  loading: () => <div className={styles.mapSkeleton} />,
});

export interface SearchResult {
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
  parkingLat:       number | null;
  parkingLng:       number | null;
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

  // ── Map interaction state ─────────────────────────────────────────────────
  const [hoveredCarId,  setHoveredCarId]  = useState<string | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  // Mobile: map overlay visibility
  const [mapVisible, setMapVisible] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const initialAddressObj: SelectedAddress | null =
    initialLat && initialLng && initialAddress
      ? { lat: parseFloat(initialLat), lng: parseFloat(initialLng), label: initialAddress }
      : null;

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (
    newStart:   string,
    newEnd:     string,
    newAddress: SelectedAddress | null,
  ) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const params = new URLSearchParams({ start: newStart, end: newEnd });
    if (newAddress) {
      params.set("lat",     String(newAddress.lat));
      params.set("lng",     String(newAddress.lng));
      params.set("address", newAddress.label);
    }
    router.push(`/${locale}/search?${params.toString()}`, { scroll: false });

    setLoading(true);
    setSelectedCarId(null);
    setHoveredCarId(null);

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

      const res = await fetch("/next-api/public/cars/search", {
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

  // ── Map interaction handlers ──────────────────────────────────────────────

  const handleMarkerHover  = useCallback((id: string | null) => setHoveredCarId(id), []);
  const handleMarkerClick  = useCallback((id: string) => setSelectedCarId(id), []);
  const handleMapClick     = useCallback(() => setSelectedCarId(null), []);
  const handleCardHover    = useCallback((id: string | null) => setHoveredCarId(id), []);
  const handleCardSelect   = useCallback((id: string | null) => setSelectedCarId(id), []);

  // ── Derived values ────────────────────────────────────────────────────────

  const hasAddress = Boolean(address && lat && lng);

  // Cars that can be shown on the map (have lat/lng).
  // useMemo keeps a stable array reference so the SearchMap useEffect([cars])
  // does NOT re-run when only selectedCarId/hoveredCarId changes — without this,
  // every marker click triggers drawMarkers → clearMarkers which destroys the popup.
  const mapCars = useMemo(() =>
    results
      .filter((c): c is SearchResult & { parkingLat: number; parkingLng: number } =>
        c.parkingLat != null && c.parkingLng != null,
      )
      .map(c => ({
        id:              c.id,
        name:            c.name,
        hasPhoto:        c.hasPhoto,
        basePricePerDay: c.basePricePerDay,
        parkingLat:      c.parkingLat,
        parkingLng:      c.parkingLng,
        distanceKm:      c.distanceKm,
      })),
  [results]);

  const mapLabels = {
    openDetails: t.carDetail.viewDetails.replace(" →", ""),
    perDay:      t.search.perDay,
    totalLabel:  t.search.totalLabel,
    showMap:     t.search.showMap,
  };

  // ── Map count badge ───────────────────────────────────────────────────────
  const mapCountLabel = mapCars.length > 0
    ? `${mapCars.length} ${t.search.mapVehicles}`
    : null;

  return (
    <>
      {/* ── Sticky refinement panel ── */}
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

      {/* ── Split layout: list (left) + map (right on desktop) ── */}
      <div className={styles.splitWrapper}>

        {/* ── List pane ── */}
        <div className={`${styles.listPane} ${loading ? styles.listLoading : ""}`}>
          <SearchResults
            results={results}
            start={start}
            end={end}
            locale={locale}
            hasAddress={hasAddress}
            lat={lat}
            lng={lng}
            address={address}
            hoveredCarId={hoveredCarId}
            selectedCarId={selectedCarId}
            onCardHover={handleCardHover}
            onCardSelect={handleCardSelect}
          />
        </div>

        {/* ── Map pane (desktop: sticky right column; mobile: fullscreen overlay) ── */}
        <div
          className={`${styles.mapPane} ${mapVisible ? styles.mapPaneVisible : ""}`}
          aria-hidden={!mapVisible}
        >
          {/* Close button (mobile only) */}
          <button
            type="button"
            className={styles.mapCloseBtn}
            onClick={() => setMapVisible(false)}
            aria-label={t.search.hideMap}
          >
            <X size={14} strokeWidth={2} /> {t.search.hideMap}
          </button>

          {/* Map count badge */}
          {mapCountLabel && (
            <div className={styles.mapBadge} aria-live="polite">
              {mapCountLabel}
            </div>
          )}

          <SearchMap
            cars={mapCars}
            hoveredCarId={hoveredCarId}
            selectedCarId={selectedCarId}
            start={start}
            end={end}
            locale={locale}
            labels={mapLabels}
            visible={mapVisible}
            onMarkerHover={handleMarkerHover}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
          />
        </div>
      </div>

      {/* ── Mobile floating "Show map" button ── */}
      <button
        type="button"
        className={`${styles.fab} ${mapVisible ? styles.fabHidden : ""}`}
        onClick={() => setMapVisible(true)}
        aria-label={t.search.showMap}
        aria-pressed={mapVisible}
      >
        <span className={styles.fabIcon} aria-hidden>🗺</span>
        <span>{t.search.showMap}</span>
        {mapCars.length > 0 && (
          <span className={styles.fabCount}>{mapCars.length}</span>
        )}
      </button>
    </>
  );
}
