"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import styles from "./search.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  deliveryType:     string;
  deliveryRadiusKm: number | null;
  distanceKm:       number | null;
  deliveryAvailable: boolean;
  deliveryNote:     string | null;
}

type SortKey = "relevance" | "price_asc" | "price_desc" | "distance";

const DIST_MAX_KM = 50;

// ── Inner page (needs useSearchParams) ────────────────────────────────────────

function SearchPage() {
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = getTranslations(locale);

  const start   = searchParams.get("start")   ?? "";
  const end     = searchParams.get("end")     ?? "";
  const lat     = searchParams.get("lat")     ?? "";
  const lng     = searchParams.get("lng")     ?? "";
  const address = searchParams.get("address") ?? "";

  const hasAddress = Boolean(address && lat && lng);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [sort,    setSort]    = useState<SortKey>("relevance");

  const search = useCallback(async () => {
    if (!start || !end) {
      setError(t.search.invalidParams);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { startDateTime: start, endDateTime: end };
      if (lat && lng && address) {
        body.addressLat   = parseFloat(lat);
        body.addressLng   = parseFloat(lng);
        body.addressLabel = address;
      }
      const res = await fetch("/next-api/public/cars/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setResults(await res.json());
    } catch {
      setError(t.search.searchError);
    } finally {
      setLoading(false);
    }
  }, [start, end, lat, lng, address, t]);

  useEffect(() => { search(); }, [search]);

  // Filter out cars > 50 km when an address is provided
  const filtered = hasAddress
    ? results.filter((c) => c.distanceKm === null || c.distanceKm <= DIST_MAX_KM)
    : results;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_asc")  return (a.basePricePerDay ?? Infinity) - (b.basePricePerDay ?? Infinity);
    if (sort === "price_desc") return (b.basePricePerDay ?? 0) - (a.basePricePerDay ?? 0);
    if (sort === "distance")   return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    // relevance: delivery first, then distance
    if (a.deliveryAvailable !== b.deliveryAvailable) return a.deliveryAvailable ? -1 : 1;
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  const excludedCount = results.length - filtered.length;

  function getDistanceBadge(km: number): { label: string; cls: string } {
    if (km < 10)  return { label: t.search.distClose,  cls: styles.distClose  };
    if (km <= 15) return { label: t.search.distNearby, cls: styles.distNearby };
    return               { label: t.search.distFar,    cls: styles.distFar    };
  }

  function fmtDist(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
  }

  const startFmt = start ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium", timeStyle: "short",
  }).format(new Date(start)) : "";
  const endFmt = end ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium", timeStyle: "short",
  }).format(new Date(end)) : "";

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerBg} aria-hidden="true">
          <div className={styles.headerBgGlow} />
          <div className={styles.headerBgGrid} />
        </div>
        <div className={styles.headerContent}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            ← {t.search.backToSearch}
          </button>
          <h1 className={styles.headerTitle}>{t.search.resultsTitle}</h1>
          <div className={styles.headerMeta}>
            <span className={styles.headerMetaItem}>📅 {startFmt} → {endFmt}</span>
            {address && (
              <>
                <span className={styles.headerMetaSep}>·</span>
                <span className={styles.headerMetaItem}>📍 {address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Results area ── */}
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {!loading && !error && (
              <p className={styles.count}>
                {sorted.length === 0
                  ? t.search.noResults
                  : locale === "fr"
                  ? `${sorted.length} véhicule${sorted.length > 1 ? "s" : ""} disponible${sorted.length > 1 ? "s" : ""}`
                  : `${sorted.length} vehicle${sorted.length > 1 ? "s" : ""} available`}
              </p>
            )}
            {hasAddress && !loading && !error && (
              <span className={styles.radiusChip}>
                📍 {t.search.distRadius}
                {excludedCount > 0 && (
                  <span className={styles.radiusChipCount}>
                    {` · ${excludedCount} hidden`}
                  </span>
                )}
              </span>
            )}
          </div>
          {!loading && sorted.length > 0 && (
            <div className={styles.sortWrap}>
              <label className={styles.sortLabel}>{t.search.sortBy}</label>
              <select
                className={styles.sortSelect}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="relevance">{t.search.sortRelevance}</option>
                {hasAddress && <option value="distance">{t.search.sortDistance}</option>}
                <option value="price_asc">{t.search.sortPriceAsc}</option>
                <option value="price_desc">{t.search.sortPriceDesc}</option>
              </select>
            </div>
          )}
        </div>

        {loading && (
          <div className={styles.skeletons}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={search}>{t.search.retry}</button>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <h2 className={styles.emptyTitle}>{t.search.noResults}</h2>
            <p className={styles.emptySub}>{t.search.noResultsSub}</p>
            <button className={styles.retryBtn} onClick={() => router.back()}>
              {t.search.adjustSearch}
            </button>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className={styles.grid}>
            {sorted.map((car) => {
              const badge = hasAddress && car.distanceKm != null
                ? getDistanceBadge(car.distanceKm)
                : null;

              return (
                <Link key={car.id} href={`/${locale}/fleet/${car.id}`} className={styles.card}>

                  {/* Photo */}
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

                    {/* Distance badge – top right */}
                    {badge && (
                      <span className={`${styles.distanceBadge} ${badge.cls}`}>
                        {fmtDist(car.distanceKm!)} · {badge.label}
                      </span>
                    )}

                    {/* Delivery badge – bottom left */}
                    {car.deliveryType !== "none" && (
                      <span className={`${styles.deliveryBadge} ${car.deliveryAvailable ? styles.deliveryYes : styles.deliveryNo}`}>
                        {car.deliveryAvailable ? "🚚 " + t.search.deliveryAvail : "📍 " + t.search.pickupOnly}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <h2 className={styles.cardName}>{car.name}</h2>
                      {car.basePricePerDay != null && (
                        <div className={styles.cardPrice}>
                          <span className={styles.cardPriceNum}>{car.basePricePerDay} €</span>
                          <span className={styles.cardPriceSub}>/{t.search.perDay}</span>
                        </div>
                      )}
                    </div>

                    {/* Specs */}
                    {(car.vehicleType || car.energy || car.gearbox || car.numberOfSeats) && (
                      <div className={styles.cardSpecs}>
                        {car.vehicleType    && <span className={styles.spec}>{car.vehicleType}</span>}
                        {car.energy         && <span className={styles.spec}>{car.energy}</span>}
                        {car.gearbox        && <span className={styles.spec}>{car.gearbox}</span>}
                        {car.numberOfSeats  && <span className={styles.spec}>{car.numberOfSeats} {t.search.seats}</span>}
                      </div>
                    )}

                    {/* Distance & delivery info */}
                    <div className={styles.cardMeta}>
                      {car.distanceKm != null && (
                        <span className={styles.cardMetaItem}>
                          📍 {fmtDist(car.distanceKm)}
                          {car.parkingAddress && ` · ${car.parkingAddress}`}
                        </span>
                      )}
                      {!hasAddress && car.parkingAddress && car.distanceKm == null && (
                        <span className={styles.cardMetaItem}>
                          📍 {car.parkingAddress}
                        </span>
                      )}
                      {car.deliveryNote && (
                        <span className={`${styles.cardMetaItem} ${car.deliveryAvailable ? styles.cardMetaGreen : styles.cardMetaOrange}`}>
                          {car.deliveryAvailable ? "✓" : "ℹ"} {car.deliveryNote}
                        </span>
                      )}
                    </div>

                    <span className={styles.cardCta}>{t.carDetail.viewDetails}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
