"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "@/app/[locale]/fleet/[id]/car-public.module.css";
import PhotoGallery from "./PhotoGallery";

interface Props {
  carId: string;
  photoIds: string[];
  carName: string;
}

export default function CarSlider({ carId, photoIds, carName }: Props) {
  const [current,     setCurrent]     = useState(0);
  const [loaded,      setLoaded]      = useState<Record<number, boolean>>({});
  const [galleryOpen, setGalleryOpen] = useState(false);

  const total = photoIds.length;

  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (galleryOpen) return; // gallery owns keyboard when open
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, galleryOpen]);

  if (total === 0) {
    return (
      <div className={styles.sliderEmpty}>
        <span className={styles.sliderEmptyIcon}>🚗</span>
      </div>
    );
  }

  return (
    <div className={styles.slider}>

      {/* ── Main image track – click anywhere to open gallery ── */}
      <div
        className={`${styles.sliderTrack} ${styles.sliderTrackClickable}`}
        onClick={() => setGalleryOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Open photo gallery"
        onKeyDown={e => e.key === "Enter" && setGalleryOpen(true)}
      >
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

        {/* "View all photos" affordance */}
        <button
          className={styles.viewGalleryBtn}
          onClick={e => { e.stopPropagation(); setGalleryOpen(true); }}
          aria-label={`View all ${total} photos in gallery`}
          tabIndex={-1} // track handles keyboard; this is a visual affordance
        >
          <span className="material-symbols-outlined">photo_library</span>
          {total === 1 ? "View photo" : `${total} photos`}
        </button>
      </div>

      {/* ── Arrows ── */}
      {total > 1 && (
        <>
          <button
            className={`${styles.sliderArrow} ${styles.sliderArrowPrev}`}
            onClick={e => { e.stopPropagation(); prev(); }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            className={`${styles.sliderArrow} ${styles.sliderArrowNext}`}
            onClick={e => { e.stopPropagation(); next(); }}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}

      {/* ── Dots ── */}
      {total > 1 && (
        <div className={styles.sliderDots}>
          {photoIds.map((_, i) => (
            <button
              key={i}
              className={`${styles.sliderDot} ${i === current ? styles.sliderDotActive : ""}`}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
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
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
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

      {/* ── Full-screen gallery ── */}
      {galleryOpen && (
        <PhotoGallery
          carId={carId}
          photoIds={photoIds}
          carName={carName}
          initialIndex={current}
          onClose={() => setGalleryOpen(false)}
        />
      )}

    </div>
  );
}
