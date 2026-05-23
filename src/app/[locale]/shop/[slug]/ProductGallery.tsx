"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ProductGallery.module.css";

interface Props {
  images: string[];
  title: string;
}

export default function ProductGallery({ images, title }: Props) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading]   = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const stripRef    = useRef<HTMLDivElement>(null);

  // Fade transition: hide → swap → show
  const goTo = useCallback((index: number) => {
    if (index === current || fading || !images.length) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 160);
  }, [current, fading, images.length]);

  const prev = useCallback(() => goTo((current - 1 + images.length) % images.length), [current, goTo, images.length]);
  const next = useCallback(() => goTo((current + 1) % images.length), [current, goTo, images.length]);

  // Scroll the thumbnail strip to keep the active thumb visible
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.children[current] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  // Keyboard navigation (active when lightbox is open)
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  // Touch swipe handlers (shared between main image and lightbox)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (!images.length) return <div className={styles.placeholder} />;

  const hasMany = images.length > 1;

  return (
    <>
      <div className={styles.gallery}>
        {/* Vertical thumbnail strip — desktop only */}
        {hasMany && (
          <div ref={stripRef} className={styles.thumbStrip}>
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`${styles.thumb} ${current === i ? styles.thumbActive : ""}`}
                aria-label={`View image ${i + 1} of ${images.length}`}
              >
                <Image src={url} alt="" fill sizes="76px" className={styles.thumbImg} />
              </button>
            ))}
          </div>
        )}

        {/* Main image + nav */}
        <div className={styles.mainWrap}>
          <div
            className={`${styles.mainImage} ${fading ? styles.fading : ""}`}
            onClick={() => setLightbox(true)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="button"
            tabIndex={0}
            aria-label="Open full-size image"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setLightbox(true); }}
          >
            <Image
              src={images[current]}
              alt={`${title}${hasMany ? ` — image ${current + 1}` : ""}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
              className={styles.mainImg}
              priority={current === 0}
            />
            <span className={styles.zoomHint} aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
              </svg>
            </span>
          </div>

          {/* Counter + arrows (always visible when multiple images) */}
          {hasMany && (
            <div className={styles.navRow}>
              <button onClick={prev} className={styles.navBtn} aria-label="Previous image">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className={styles.counter}>{current + 1} / {images.length}</span>
              <button onClick={next} className={styles.navBtn} aria-label="Next image">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}

          {/* Dot indicators — mobile only (via CSS) */}
          {hasMany && (
            <div className={styles.dots} aria-hidden="true">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`${styles.dot} ${current === i ? styles.dotActive : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal thumbnail row — mobile only (via CSS) */}
      {hasMany && (
        <div className={styles.mobileStrip} aria-hidden="true">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`${styles.mobileThumbs} ${current === i ? styles.mobileThumbActive : ""}`}
              tabIndex={-1}
            >
              <Image src={url} alt="" fill sizes="64px" className={styles.thumbImg} />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className={styles.lightboxBackdrop}
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image viewer"
        >
          <div
            className={styles.lightboxInner}
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={images[current]}
              alt={`${title} — image ${current + 1}`}
              fill
              sizes="min(90vw, 90vh)"
              className={styles.lightboxImg}
              priority
            />

            <button
              onClick={() => setLightbox(false)}
              className={styles.lightboxClose}
              aria-label="Close viewer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {hasMany && (
              <>
                <button onClick={prev} className={`${styles.lightboxNav} ${styles.lightboxPrev}`} aria-label="Previous image">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button onClick={next} className={`${styles.lightboxNav} ${styles.lightboxNext}`} aria-label="Next image">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <div className={styles.lightboxCounter} aria-live="polite">
                  {current + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
