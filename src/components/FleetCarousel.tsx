"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import styles from "./FleetCarousel.module.css";

export interface CarouselCar {
  id: string;
  name: string;
  hasPhoto: boolean;
  photoIds: string[];
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

// ── In-card photo slider ──────────────────────────────────────────────────────

function CardSlider({
  carId, carName, photoIds, hasPhoto, available, availableLabel, rentedLabel,
}: {
  carId: string; carName: string; photoIds: string[]; hasPhoto: boolean;
  available: boolean; availableLabel: string; rentedLabel: string;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchRef = useRef<number | null>(null);
  const total = photoIds.length;

  const prev = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    setPhotoIdx(i => (i - 1 + total) % total);
  }, [total]);

  const next = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    setPhotoIdx(i => (i + 1) % total);
  }, [total]);

  const onTouchStart = (e: React.TouchEvent) => { touchRef.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchRef.current === null) return;
    const d = touchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(d) > 30) d > 0 ? next(e) : prev(e);
    touchRef.current = null;
  };

  const src = total > 0
    ? `/next-api/public/cars/${carId}/photos/${photoIds[photoIdx]}`
    : hasPhoto ? `/next-api/public/cars/${carId}/photo` : null;

  return (
    <div
      className={styles.photoWrap}
      onTouchStart={total > 1 ? onTouchStart : undefined}
      onTouchEnd={total > 1 ? onTouchEnd : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt={carName} className={styles.photo} />
      ) : (
        <div className={styles.photoFallback}>🚗</div>
      )}
      <div className={styles.photoGradient} />
      {total > 1 && (
        <>
          <button className={`${styles.photoBtn} ${styles.photoBtnPrev}`} onClick={prev} aria-label="Previous photo">‹</button>
          <button className={`${styles.photoBtn} ${styles.photoBtnNext}`} onClick={next} aria-label="Next photo">›</button>
          <div className={styles.photoDots}>
            {photoIds.map((_, i) => (
              <span key={i} className={`${styles.photoDot} ${i === photoIdx ? styles.photoDotActive : ""}`} />
            ))}
          </div>
        </>
      )}
      <span className={`${styles.badge} ${available ? styles.badgeAvail : styles.badgeBusy}`}>
        {available ? availableLabel : rentedLabel}
      </span>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

const CARD_GAP = 20;

/**
 * Given the container pixel width, returns:
 *   - visible: how many cards fit
 *   - cardW:   each card's width so cards fill the container exactly with no remainder
 */
function computeLayout(containerW: number): { visible: number; cardW: number } {
  const visible = containerW >= 900 ? 3 : containerW >= 560 ? 2 : 1;
  const cardW   = Math.floor((containerW - (visible - 1) * CARD_GAP) / visible);
  return { visible, cardW };
}

// ── Carousel ──────────────────────────────────────────────────────────────────

export default function FleetCarousel({ cars, locale, labels }: Props) {
  const total = cars.length;

  const [offset,    setOffset]   = useState(0);   // cards scrolled from the left
  const [cardW,     setCardW]    = useState(360);
  const [visible,   setVisible]  = useState(3);
  const [arrowW,    setArrowW]   = useState(52);  // matches CSS .arrow { width }
  const [ready,     setReady]    = useState(false);
  // When true: suppress CSS transition (used during resize to avoid a jarring slide)
  const [noAnim,    setNoAnim]   = useState(false);

  const wrapRef     = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Recompute layout and clamp offset on every resize.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = (animate: boolean) => {
      const w  = el.offsetWidth;
      const aw = w < 640 ? 40 : 52;            // mirrors CSS breakpoint for .arrow
      const { visible: v, cardW: cw } = computeLayout(w - 2 * aw);
      const maxOff = Math.max(0, total - v);
      if (!animate) setNoAnim(true);
      setCardW(cw);
      setVisible(v);
      setArrowW(aw);
      setOffset(prev => Math.min(prev, maxOff));
      setReady(true);
      if (!animate) requestAnimationFrame(() => setNoAnim(false));
    };
    update(false); // no slide animation on initial mount / resize
    const ro = new ResizeObserver(() => update(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [total]);

  const maxOffset  = Math.max(0, total - visible);
  const canGoLeft  = offset > 0;
  const canGoRight = offset < maxOffset;

  // Shift the track right by arrowW so cards start after the left arrow zone.
  // At offset=0: first card at arrowW from viewport left.
  // At offset=maxOffset: last card's right edge at containerW − arrowW (before right arrow).
  const trackX = arrowW - (offset * (cardW + CARD_GAP));

  const go = useCallback((dir: 1 | -1) => {
    setOffset(prev => Math.max(0, Math.min(prev + dir, maxOffset)));
  }, [maxOffset]);

  // Outer swipe: left swipe = go right, right swipe = go left
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const d = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(d) > 50) go(d > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  if (!total) return null;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{labels.eyebrow}</span>
        <h2 className={styles.title}>{labels.title}</h2>
      </div>

      <div
        ref={wrapRef}
        className={[
          styles.viewport,
          canGoLeft  ? styles.fadeLeft  : "",
          canGoRight ? styles.fadeRight : "",
        ].filter(Boolean).join(" ")}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Track */}
        <div
          className={[
            styles.track,
            !ready || noAnim ? styles.trackNoTransition : "",
            !ready           ? styles.trackHidden       : "",
          ].filter(Boolean).join(" ")}
          style={{ transform: `translateX(${trackX}px)` }}
        >
          {cars.map((car) => (
            <div
              key={car.id}
              className={styles.slide}
              style={{ width: cardW, flexShrink: 0 }}
            >
              <Link href={`/${locale}/fleet/${car.id}`} className={styles.card}>
                <CardSlider
                  carId={car.id}
                  carName={car.name}
                  photoIds={car.photoIds}
                  hasPhoto={car.hasPhoto}
                  available={car.isAvailable}
                  availableLabel={labels.available}
                  rentedLabel={labels.rented}
                />
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

        {/* Arrows — shown only when there is content in that direction */}
        <button
          className={`${styles.arrow} ${styles.arrowPrev} ${!canGoLeft ? styles.arrowHidden : ""}`}
          onClick={() => go(-1)}
          disabled={!canGoLeft}
          aria-label="Previous vehicles"
        >‹</button>

        <button
          className={`${styles.arrow} ${styles.arrowNext} ${!canGoRight ? styles.arrowHidden : ""}`}
          onClick={() => go(1)}
          disabled={!canGoRight}
          aria-label="Next vehicles"
        >›</button>
      </div>
    </section>
  );
}
