"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./car-public.module.css";

interface Props {
  carId: string;
  photoIds: string[];
  carName: string;
}

export default function CarSlider({ carId, photoIds, carName }: Props) {
  const [current, setCurrent] = useState(0);
  const [loaded,  setLoaded]  = useState<Record<number, boolean>>({});

  const total = photoIds.length;

  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  if (total === 0) {
    return (
      <div className={styles.sliderEmpty}>
        <span className={styles.sliderEmptyIcon}>🚗</span>
      </div>
    );
  }

  return (
    <div className={styles.slider}>
      {/* ── Main image track ── */}
      <div className={styles.sliderTrack}>
        {photoIds.map((id, i) => (
          <div
            key={id}
            className={`${styles.sliderSlide} ${i === current ? styles.sliderSlideActive : ""}`}
            aria-hidden={i !== current}
          >
            {(i === current || loaded[i]) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/next-api/public/cars/${carId}/photos/${id}`}
                alt={`${carName} — photo ${i + 1}`}
                className={styles.sliderImg}
                onLoad={() => setLoaded(prev => ({ ...prev, [i]: true }))}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Arrows ── */}
      {total > 1 && (
        <>
          <button className={`${styles.sliderArrow} ${styles.sliderArrowPrev}`} onClick={prev} aria-label="Previous">‹</button>
          <button className={`${styles.sliderArrow} ${styles.sliderArrowNext}`} onClick={next} aria-label="Next">›</button>
        </>
      )}

      {/* ── Dots ── */}
      {total > 1 && (
        <div className={styles.sliderDots}>
          {photoIds.map((_, i) => (
            <button
              key={i}
              className={`${styles.sliderDot} ${i === current ? styles.sliderDotActive : ""}`}
              onClick={() => setCurrent(i)}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div className={styles.sliderThumbs}>
          {photoIds.map((id, i) => (
            <button
              key={id}
              className={`${styles.sliderThumb} ${i === current ? styles.sliderThumbActive : ""}`}
              onClick={() => setCurrent(i)}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/next-api/public/cars/${carId}/photos/${id}`} alt="" className={styles.sliderThumbImg} />
            </button>
          ))}
        </div>
      )}

      {/* ── Counter ── */}
      {total > 1 && (
        <div className={styles.sliderCounter}>{current + 1} / {total}</div>
      )}
    </div>
  );
}
