"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { saveSearchContext } from "@/lib/searchContext";
import { api } from "@/lib/api";
import styles from "./search.module.css";

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

type SortKey = "relevance" | "price_asc" | "price_desc" | "distance";

const DIST_MAX_KM = 50;

interface Props {
  results:      SearchResult[];
  start:        string;
  end:          string;
  locale:       string;
  hasAddress:   boolean;
  lat?:         string;
  lng?:         string;
  address?:     string;
  // ── Map sync props ────────────────────────────────────────────────────────
  hoveredCarId?:  string | null;
  selectedCarId?: string | null;
  onCardHover?:   (id: string | null) => void;
  onCardSelect?:  (id: string | null) => void;
}

export default function SearchResults({
  results,
  start,
  end,
  locale,
  hasAddress,
  lat,
  lng,
  address,
  hoveredCarId  = null,
  selectedCarId = null,
  onCardHover,
  onCardSelect,
}: Props) {
  const t     = getTranslations(locale);
  const enums = t.carEnums;

  const [sort,          setSort]          = useState<SortKey>("relevance");
  const [prices,        setPrices]        = useState<Map<string, { total: number; days: number }>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState(false);

  // ── Card refs for scroll-into-view when a marker is clicked ──────────────
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setCardRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else    cardRefs.current.delete(id);
  }, []);

  // ── Scroll selected card into view when selection comes from the map ──────
  useEffect(() => {
    if (!selectedCarId) return;
    const el = cardRefs.current.get(selectedCarId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedCarId]);

  // ── Persist search context ────────────────────────────────────────────────
  useEffect(() => {
    if (!start || !end) return;
    const addr = lat && lng && address
      ? { lat: parseFloat(lat), lng: parseFloat(lng), label: address }
      : undefined;
    saveSearchContext(start, end, addr);
  }, [start, end, lat, lng, address]);

  // ── Fetch total prices for all results ────────────────────────────────────
  useEffect(() => {
    if (!start || !end || results.length === 0) {
      setPrices(new Map());
      setLoadingPrices(false);
      return;
    }
    const controller = new AbortController();
    setLoadingPrices(true);
    setPrices(new Map());
    Promise.allSettled(
      results.map(car =>
        api.cars.getPrice(car.id, start, end, controller.signal).catch(() => null)
      )
    ).then(settled => {
      if (controller.signal.aborted) return;
      const map = new Map<string, { total: number; days: number }>();
      settled.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(results[i].id, { total: r.value.totalPrice, days: r.value.numberOfDays });
        }
      });
      setPrices(map);
      setLoadingPrices(false);
    });
    return () => controller.abort();
  }, [results, start, end]);

  // ── Invalid params guard ──────────────────────────────────────────────────
  if (!start || !end) {
    return (
      <div className={styles.main}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>{t.search.invalidParams}</p>
        </div>
      </div>
    );
  }

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = hasAddress
    ? results.filter(c => c.distanceKm === null || c.distanceKm <= DIST_MAX_KM)
    : results;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_asc")  return (a.basePricePerDay ?? Infinity) - (b.basePricePerDay ?? Infinity);
    if (sort === "price_desc") return (b.basePricePerDay ?? 0) - (a.basePricePerDay ?? 0);
    if (sort === "distance")   return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    if (a.deliveryAvailable !== b.deliveryAvailable) return a.deliveryAvailable ? -1 : 1;
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  const excludedCount = results.length - filtered.length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getDistanceBadge(km: number): { label: string; cls: string } {
    if (km < 10)  return { label: t.search.distClose,  cls: styles.distClose  };
    if (km <= 15) return { label: t.search.distNearby, cls: styles.distNearby };
    return               { label: t.search.distFar,    cls: styles.distFar    };
  }

  function fmtDist(km: number): string {
    return km < 1
      ? `${Math.round(km * 1000)} ${t.search.distM}`
      : `${km} ${t.search.distKm}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.main}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <p className={styles.count}>
            {sorted.length === 0
              ? t.search.noResults
              : `${sorted.length} ${sorted.length > 1 ? t.search.vehiclesPlural : t.search.vehiclesSingular}`}
          </p>
          {hasAddress && (
            <span className={styles.radiusChip}>
              📍 {t.search.distRadius}
              {excludedCount > 0 && (
                <span className={styles.radiusChipCount}>{` · ${excludedCount} ${t.search.hidden}`}</span>
              )}
            </span>
          )}
        </div>
        {sorted.length > 0 && (
          <div className={styles.sortWrap}>
            <label className={styles.sortLabel}>{t.search.sortBy}</label>
            <select
              className={styles.sortSelect}
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
            >
              <option value="relevance">{t.search.sortRelevance}</option>
              {hasAddress && <option value="distance">{t.search.sortDistance}</option>}
              <option value="price_asc">{t.search.sortPriceAsc}</option>
              <option value="price_desc">{t.search.sortPriceDesc}</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {sorted.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔍</span>
          <h2 className={styles.emptyTitle}>{t.search.noResults}</h2>
          <p className={styles.emptySub}>{t.search.noResultsSub}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sorted.map(car => {
            const badge     = hasAddress && car.distanceKm != null ? getDistanceBadge(car.distanceKm) : null;
            const priceInfo = prices.get(car.id);

            // ── Card state classes ──────────────────────────────────────────
            const isSelected = car.id === selectedCarId;
            const isHovered  = car.id === hoveredCarId && !isSelected;
            const wrapperCls = [
              styles.cardWrapper,
              isSelected ? styles.cardSelected : "",
              isHovered  ? styles.cardHovered  : "",
            ].filter(Boolean).join(" ");

            return (
              <article
                key={car.id}
                ref={setCardRef(car.id)}
                className={wrapperCls}
                onMouseEnter={() => onCardHover?.(car.id)}
                onMouseLeave={() => onCardHover?.(null)}
              >
                <Link
                  href={`/${locale}/fleet/${car.id}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`}
                  className={styles.card}
                  onClick={() => onCardSelect?.(car.id)}
                  target="_blank"
                >
                  <div className={styles.cardPhoto}>
                    {car.hasPhoto ? (
                      <Image
                        src={`/next-api/public/cars/${car.id}/photo`}
                        alt={car.name}
                        fill
                        className={styles.cardImg}
                        sizes="(max-width: 640px) 100vw, 380px"
                      />
                    ) : (
                      <div className={styles.cardPhotoPlaceholder}>🚗</div>
                    )}
                    {badge && (
                      <span className={`${styles.distanceBadge} ${badge.cls}`}>
                        {fmtDist(car.distanceKm!)} · {badge.label}
                      </span>
                    )}
                    {car.deliveryEnabled && (
                      <span className={`${styles.deliveryBadge} ${car.deliveryAvailable ? styles.deliveryYes : styles.deliveryNo}`}>
                        {car.deliveryAvailable ? "🚚 " + t.search.deliveryAvail : "📍 " + t.search.pickupOnly}
                      </span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <h2 className={styles.cardName}>{car.name}</h2>
                      {(car.basePricePerDay != null || priceInfo != null || (start && end && loadingPrices)) && (
                        <div className={styles.cardPrice}>
                          {priceInfo ? (
                            <>
                              <span className={styles.cardPriceTotal}>€{priceInfo.total.toFixed(2)}</span>
                              <span className={styles.cardPriceSub}>{t.search.totalLabel} · {priceInfo.days} {t.search.days}</span>
                            </>
                          ) : car.basePricePerDay != null ? (
                            <>
                              <span className={styles.cardPriceNum}>{car.basePricePerDay} €</span>
                              <span className={styles.cardPriceSub}>/{t.search.perDay}</span>
                            </>
                          ) : (
                            <span className={styles.cardPriceSkeleton} />
                          )}
                        </div>
                      )}
                    </div>

                    {(car.vehicleType || car.energy || car.gearbox || car.numberOfSeats) && (
                      <div className={styles.cardSpecs}>
                        {car.vehicleType   && <span className={styles.spec}>{enums.vehicleTypeMap[car.vehicleType] ?? car.vehicleType}</span>}
                        {car.energy        && <span className={styles.spec}>{enums.energyMap[car.energy] ?? car.energy}</span>}
                        {car.gearbox       && <span className={styles.spec}>{enums.gearboxMap[car.gearbox] ?? car.gearbox}</span>}
                        {car.numberOfSeats && <span className={styles.spec}>{car.numberOfSeats} {t.search.seats}</span>}
                      </div>
                    )}

                    <div className={styles.cardMeta}>
                      {car.distanceKm != null && (
                        <span className={styles.cardMetaItem}>
                          📍 {fmtDist(car.distanceKm)}
                          {car.parkingAddress && ` · ${car.parkingAddress}`}
                        </span>
                      )}
                      {!hasAddress && car.parkingAddress && car.distanceKm == null && (
                        <span className={styles.cardMetaItem}>📍 {car.parkingAddress}</span>
                      )}
                      {car.deliveryEnabled && hasAddress && (() => {
                        let note: string;
                        if (car.deliveryAvailable) {
                          const feeStr = car.deliveryType === "radius" && car.deliveryRadiusPrice != null
                            ? ` · €${car.deliveryRadiusPrice.toFixed(2)}`
                            : "";
                          note = t.search.deliveryAvail + feeStr;
                        } else {
                          note = car.deliveryType === "radius" && car.deliveryRadiusKm != null
                            ? `${t.search.pickupOnly} — ${t.search.distRadius.replace("50", String(car.deliveryRadiusKm))}`
                            : t.search.pickupOnly;
                        }
                        return (
                          <span className={`${styles.cardMetaItem} ${car.deliveryAvailable ? styles.cardMetaGreen : styles.cardMetaOrange}`}>
                            {car.deliveryAvailable ? "✓" : "ℹ"} {note}
                          </span>
                        );
                      })()}
                    </div>

                    <span className={styles.cardCta}>{t.carDetail.viewDetails}</span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
