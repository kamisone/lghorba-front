"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
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

interface PriceInfo { total: number; days: number; }
interface SearchCtx { start: string; end: string; }

interface Props {
  cars: FleetCar[];
  locale: string;
  initialStart?: string;
  initialEnd?: string;
}

// ── Storage helpers ────────────────────────────────────────────────────────────

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

export default function FleetGrid({ cars, locale, initialStart, initialEnd }: Props) {
  const t = getTranslations(locale);

  const [ctx,           setCtx]           = useState<SearchCtx | null>(null);
  const [prices,        setPrices]        = useState<Map<string, PriceInfo>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState(false);
  const initDone = useRef(false);

  // Resolve search context once on mount (URL params → localStorage fallback)
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const now = new Date();
    if (initialStart && initialEnd && new Date(initialStart) > now) {
      setCtx({ start: initialStart, end: initialEnd });
      return;
    }
    const stored = loadStoredSearch();
    if (stored) setCtx(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch total prices for all cars once context is known
  useEffect(() => {
    if (!ctx || cars.length === 0) return;
    const { start, end } = ctx;
    const controller = new AbortController();
    setLoadingPrices(true);
    setPrices(new Map());

    Promise.allSettled(
      cars.map(car =>
        fetch(
          `/next-api/public/cars/${car.id}/price?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
          { signal: controller.signal },
        ).then(r => r.ok ? (r.json() as Promise<{ totalPrice: number; numberOfDays: number }>) : null)
      )
    ).then(settled => {
      if (controller.signal.aborted) return;
      const map = new Map<string, PriceInfo>();
      settled.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(cars[i].id, { total: r.value.totalPrice, days: r.value.numberOfDays });
        }
      });
      setPrices(map);
      setLoadingPrices(false);
    });

    return () => controller.abort();
  }, [ctx, cars]);

  function carHref(car: FleetCar): string {
    if (!ctx) return `/${locale}/fleet/${car.id}`;
    return `/${locale}/fleet/${car.id}?start=${encodeURIComponent(ctx.start)}&end=${encodeURIComponent(ctx.end)}`;
  }

  return (
    <div className={styles.grid}>
      {cars.map((car) => {
        const priceInfo = prices.get(car.id);
        return (
          <Link key={car.id} href={carHref(car)} className={styles.card}>
            <div className={styles.photoWrap}>
              {car.hasPhoto ? (
                <Image
                  src={`/next-api/public/cars/${car.id}/photo`}
                  alt={car.name}
                  fill
                  className={styles.photo}
                  sizes="(max-width: 768px) 100vw, 340px"
                />
              ) : (
                <div className={styles.photoPlaceholder}>🚗</div>
              )}
              {car.isAvailable ? (
                <span className={`${styles.badge} ${styles.badgeAvail}`}>
                  {t.fleet.availableToday}
                </span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeFrom}`}>
                  {car.nextAvailableDate
                    ? `${t.fleet.availableFrom} ${new Date(car.nextAvailableDate + "T00:00:00Z").toLocaleDateString(
                        locale === "fr" ? "fr-FR" : "en-GB",
                        { day: "numeric", month: "short", timeZone: "UTC" },
                      )}`
                    : t.fleet.availableFrom
                  }
                </span>
              )}
            </div>

            <div className={styles.info}>
              <div className={styles.infoTop}>
                <h2 className={styles.carName}>{car.name}</h2>
                {ctx && (
                  <div className={styles.priceTag}>
                    {priceInfo ? (
                      <>
                        <span className={styles.priceTagAmount}>€{priceInfo.total.toFixed(0)}</span>
                        <span className={styles.priceTagSub}>{t.search.totalLabel} · {priceInfo.days} {t.search.days}</span>
                      </>
                    ) : loadingPrices ? (
                      <span className={styles.priceTagSkeleton} />
                    ) : null}
                  </div>
                )}
              </div>

              {car.description && <p className={styles.carDesc}>{car.description}</p>}

              {(car.vehicleType || car.energy || car.gearbox || car.numberOfSeats || car.mileage) && (
                <div className={styles.specs}>
                  {car.vehicleType   && <span className={styles.spec}>{car.vehicleType}</span>}
                  {car.energy        && <span className={styles.spec}>{car.energy}</span>}
                  {car.gearbox       && <span className={styles.spec}>{car.gearbox}</span>}
                  {car.numberOfSeats && <span className={styles.spec}>{car.numberOfSeats} seats</span>}
                  {car.mileage       && <span className={styles.spec}>{car.mileage} km</span>}
                </div>
              )}

              <span className={styles.cta}>{t.carDetail.viewDetails}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
