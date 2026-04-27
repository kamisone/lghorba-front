"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import styles from "./FleetCarousel.module.css";

export interface CarouselCar {
  id: string;
  name: string;
  hasPhoto: boolean;
  vehicleType?: string | null;
  energy?: string | null;
  gearbox?: string | null;
  numberOfSeats?: number | null;
  modelYear?: number | null;
  isAvailable: boolean;
}

interface Props {
  cars: CarouselCar[];
  locale: string;
  labels: {
    eyebrow: string;
    title: string;
    available: string;
    rented: string;
    viewDetails: string;
  };
}

const CARD_GAP = 24;

export default function FleetCarousel({ cars, locale, labels }: Props) {
  const [index, setIndex]       = useState(0);
  const [cardW, setCardW]       = useState(360);
  const [containerW, setContW]  = useState(0);
  const [ready, setReady]       = useState(false);
  const wrapRef                 = useRef<HTMLDivElement>(null);
  const touchStartX             = useRef<number | null>(null);
  const total                   = cars.length;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      setContW(w);
      setCardW(w < 520 ? w - 48 : Math.min(380, w - 160));
      setReady(true);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = useCallback((dir: 1 | -1) => {
    setIndex(i => (i + dir + total) % total);
  }, [total]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) go(delta > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  if (!total) return null;

  const trackX = ready
    ? -(index * (cardW + CARD_GAP)) + (containerW - cardW) / 2
    : 0;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{labels.eyebrow}</span>
        <h2 className={styles.title}>{labels.title}</h2>
      </div>

      <div
        ref={wrapRef}
        className={styles.viewport}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`${styles.track} ${ready ? "" : styles.trackHidden}`}
          style={{ transform: `translateX(${trackX}px)` }}
        >
          {cars.map((car, i) => (
            <div
              key={car.id}
              className={`${styles.slide} ${i === index ? styles.slideActive : ""}`}
              style={{ width: cardW, flexShrink: 0 }}
              aria-hidden={i !== index}
            >
              <Link href={`/${locale}/fleet/${car.id}`} className={styles.card}>
                <div className={styles.photoWrap}>
                  {car.hasPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/next-api/public/cars/${car.id}/photo`}
                      alt={car.name}
                      className={styles.photo}
                    />
                  ) : (
                    <div className={styles.photoFallback}>🚗</div>
                  )}
                  <div className={styles.photoGradient} />
                  <span className={`${styles.badge} ${car.isAvailable ? styles.badgeAvail : styles.badgeBusy}`}>
                    {car.isAvailable ? labels.available : labels.rented}
                  </span>
                </div>

                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    {car.modelYear && <span className={styles.year}>{car.modelYear}</span>}
                    <h3 className={styles.name}>{car.name}</h3>
                  </div>
                  {(car.vehicleType || car.energy || car.gearbox || car.numberOfSeats) && (
                    <div className={styles.specs}>
                      {car.vehicleType   && <span className={styles.spec}>{car.vehicleType}</span>}
                      {car.energy        && <span className={styles.spec}>{car.energy}</span>}
                      {car.gearbox       && <span className={styles.spec}>{car.gearbox}</span>}
                      {car.numberOfSeats && <span className={styles.spec}>{car.numberOfSeats} seats</span>}
                    </div>
                  )}
                  <span className={styles.cta}>{labels.viewDetails}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            <button className={`${styles.arrow} ${styles.arrowPrev}`} onClick={() => go(-1)} aria-label="Previous vehicle">‹</button>
            <button className={`${styles.arrow} ${styles.arrowNext}`} onClick={() => go(1)}  aria-label="Next vehicle">›</button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className={styles.dots}>
          {cars.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Vehicle ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
