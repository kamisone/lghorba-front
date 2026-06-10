"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Maximize2 } from "lucide-react";
import styles from "./ProductGallery.module.css";

export interface GalleryMediaItem {
  type:             "image" | "video";
  url:              string;
  posterUrl?:       string | null;
  alt?:             string;
  durationSeconds?: number | null;
}

interface Props {
  media: GalleryMediaItem[];
  title: string;
  forcedIndex?: number;
  /** Parent sets this true when the hero has been scrolled past — triggers the mini floating viewer */
  compact?: boolean;
}

/** Formats a duration in seconds as "m:ss". */
function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Thumbnail content for a media item — poster/frame + play badge + duration for videos. */
function MediaThumb({ item, sizes }: { item: GalleryMediaItem; sizes: string }) {
  if (item.type === "video") {
    return (
      <>
        {item.posterUrl ? (
          <Image src={item.posterUrl} alt="" fill sizes={sizes} className={styles.thumbImg} />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={item.url} className={styles.thumbVideo} muted preload="metadata" />
        )}
        <div className={styles.playIconBadge} aria-hidden="true"><span><Play size={12} fill="#fff" /></span></div>
        {item.durationSeconds != null && (
          <div className={styles.durationBadge}>{formatDuration(item.durationSeconds)}</div>
        )}
      </>
    );
  }
  return <Image src={item.url} alt="" fill sizes={sizes} className={styles.thumbImg} />;
}

export default function ProductGallery({ media, title, forcedIndex, compact }: Props) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading]   = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted]  = useState(false);
  const touchStartX = useRef<number | null>(null);
  const stripRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fade transition: hide → swap → show
  const goTo = useCallback((index: number) => {
    if (index === current || fading || !media.length) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 160);
  }, [current, fading, media.length]);

  const prev = useCallback(() => goTo((current - 1 + media.length) % media.length), [current, goTo, media.length]);
  const next = useCallback(() => goTo((current + 1) % media.length), [current, goTo, media.length]);

  // Jump to the forced index when a variant option with an image swatch is selected.
  useEffect(() => {
    if (forcedIndex !== undefined && forcedIndex >= 0 && forcedIndex < media.length && forcedIndex !== current) {
      goTo(forcedIndex);
    }
  // goTo changes identity only when current/fading/media.length change, but we deliberately
  // want to re-run only when forcedIndex changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedIndex]);

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

  // Touch swipe handlers (shared between main image and lightbox) — image slides only,
  // so they don't interfere with native video scrubbing controls.
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (!media.length) return <div className={styles.placeholder} />;

  const hasMany = media.length > 1;
  const active  = media[current];

  return (
    <>
      {/* galleryWrap is position:relative so the absolutely-positioned navRow works on mobile */}
      <div className={styles.galleryWrap}>
        {/* gallery: flex row — strip + image only, so align-items:stretch gives strip the exact image height */}
        <div className={styles.gallery}>
          {/* Vertical thumbnail strip — desktop only */}
          {hasMany && (
            <div ref={stripRef} className={styles.thumbStrip}>
              {media.map((item, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`${styles.thumb} ${current === i ? styles.thumbActive : ""}`}
                  aria-label={`View ${item.type === "video" ? "video" : "image"} ${i + 1} of ${media.length}`}
                >
                  <MediaThumb item={item} sizes="76px" />
                </button>
              ))}
            </div>
          )}

          {/* Main media */}
          <div
            className={`${styles.mainImage} ${fading ? styles.fading : ""}`}
            onClick={active.type === "image" ? () => setLightbox(true) : undefined}
            onTouchStart={active.type === "image" ? onTouchStart : undefined}
            onTouchEnd={active.type === "image" ? onTouchEnd : undefined}
            role={active.type === "image" ? "button" : undefined}
            tabIndex={active.type === "image" ? 0 : undefined}
            aria-label={active.type === "image" ? "Open full-size image" : undefined}
            onKeyDown={active.type === "image" ? (e => { if (e.key === "Enter" || e.key === " ") setLightbox(true); }) : undefined}
          >
            {active.type === "video" ? (
              <video
                key={active.url}
                src={active.url}
                poster={active.posterUrl ?? undefined}
                controls
                muted
                playsInline
                preload="metadata"
                className={styles.mainVideo}
              />
            ) : (
              <Image
                src={active.url}
                alt={`${title}${hasMany ? ` — image ${current + 1}` : ""}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
                className={styles.mainImg}
                priority={current === 0}
              />
            )}

            {active.type === "image" ? (
              <span className={styles.zoomHint} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </span>
            ) : (
              <button
                type="button"
                className={styles.mainExpandBtn}
                onClick={() => setLightbox(true)}
                aria-label="Open full-size viewer"
              >
                <Maximize2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Counter + arrows — below the image row */}
        {hasMany && (
          <div className={styles.navRow}>
            <button onClick={prev} className={styles.navBtn} aria-label="Previous media">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className={styles.counter}>{current + 1} / {media.length}</span>
            <button onClick={next} className={styles.navBtn} aria-label="Next media">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Dot indicators — mobile only (via CSS) */}
        {hasMany && (
          <div className={styles.dots} aria-hidden="true">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`${styles.dot} ${current === i ? styles.dotActive : ""}`}
                aria-label={`Go to media ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Horizontal thumbnail row — mobile only (via CSS) */}
      {hasMany && (
        <div className={styles.mobileStrip} aria-hidden="true">
          {media.map((item, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`${styles.mobileThumbs} ${current === i ? styles.mobileThumbActive : ""}`}
              tabIndex={-1}
            >
              <MediaThumb item={item} sizes="64px" />
            </button>
          ))}
        </div>
      )}

      {/* ── Mini floating viewer — appears when hero is scrolled past on mobile ─── */}
      {mounted && createPortal(
        <div
          className={`${styles.miniViewer} ${compact ? styles.miniViewerVisible : ""}`}
          aria-hidden={!compact}
        >
          {/* Media — tap to open lightbox */}
          <div
            className={styles.miniImage}
            onClick={() => compact && setLightbox(true)}
            role="button"
            tabIndex={compact ? 0 : -1}
            aria-label="Open media viewer"
            onKeyDown={e => { if (compact && (e.key === "Enter" || e.key === " ")) setLightbox(true); }}
          >
            <MediaThumb item={active} sizes="120px" />
          </div>

          {/* Navigation overlay — prev, counter, next */}
          {hasMany && (
            <div className={styles.miniOverlay}>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className={styles.miniBtn}
                tabIndex={compact ? 0 : -1}
                aria-label="Previous media"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className={styles.miniCounter}>{current + 1}/{media.length}</span>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className={styles.miniBtn}
                tabIndex={compact ? 0 : -1}
                aria-label="Next media"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}

          {/* Expand / zoom hint */}
          <span className={styles.miniExpandHint} aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
        </div>,
        document.body,
      )}

      {/* Lightbox — rendered via portal so it escapes the sticky galleryCol stacking context */}
      {lightbox && createPortal(
        <div
          className={styles.lightboxBackdrop}
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product media viewer"
        >
          <div
            className={styles.lightboxInner}
            onClick={e => e.stopPropagation()}
            onTouchStart={active.type === "image" ? onTouchStart : undefined}
            onTouchEnd={active.type === "image" ? onTouchEnd : undefined}
          >
            {active.type === "video" ? (
              <video
                key={active.url}
                src={active.url}
                poster={active.posterUrl ?? undefined}
                controls
                muted
                playsInline
                preload="metadata"
                className={styles.lightboxVideo}
              />
            ) : (
              <Image
                src={active.url}
                alt={`${title} — image ${current + 1}`}
                fill
                sizes="min(90vw, 90vh)"
                className={styles.lightboxImg}
                priority
              />
            )}

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
                <button onClick={prev} className={`${styles.lightboxNav} ${styles.lightboxPrev}`} aria-label="Previous media">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button onClick={next} className={`${styles.lightboxNav} ${styles.lightboxNext}`} aria-label="Next media">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <div className={styles.lightboxCounter} aria-live="polite">
                  {current + 1} / {media.length}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
