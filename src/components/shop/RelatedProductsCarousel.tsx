"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWishlist } from "./WishlistContext";
import styles from "./RelatedProductsCarousel.module.css";

export interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  featuredImageUrl: string | null;
  minPriceCents: number | null;
  compareAtPriceCents?: number | null;
  averageRating?: number | null;
  reviewCount?: number;
}

interface Labels {
  title: string;
  subtitle: string;
  viewProduct: string;
  prev: string;
  next: string;
  goToProduct: string;
  addToWishlist: string;
  removeFromWishlist: string;
}

interface Props {
  items: RelatedProduct[];
  locale: string;
  labels: Labels;
}

function centsToEuros(cents: number) {
  return (cents / 100).toFixed(2);
}

function ProductCard({
  item, locale, labels, setSlideRef,
}: {
  item: RelatedProduct;
  locale: string;
  labels: Labels;
  setSlideRef: (el: HTMLElement | null) => void;
}) {
  const { toggle, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(item.id);
  const imageUrl = item.featuredImageUrl;
  const hasCompare = item.compareAtPriceCents != null
    && item.minPriceCents != null
    && item.compareAtPriceCents > item.minPriceCents;
  const hasRating = item.averageRating != null && (item.reviewCount ?? 0) > 0;

  return (
    <article ref={setSlideRef} className={styles.slide}>
      <Link href={`/${locale}/shop/${item.slug}`} className={styles.card}>
        <div className={styles.imageWrap}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              fill
              loading="lazy"
              sizes="(max-width: 560px) 82vw, (max-width: 860px) 45vw, (max-width: 1180px) 30vw, 23vw"
              className={styles.image}
            />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}

          {hasCompare && (
            <span className={styles.saleBadge}>
              -{Math.round((1 - item.minPriceCents! / item.compareAtPriceCents!) * 100)}%
            </span>
          )}

          <button
            type="button"
            className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ""}`}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              toggle({
                productId: item.id,
                slug: item.slug,
                title: item.title,
                imageUrl,
                priceCents: item.minPriceCents,
              });
            }}
            aria-label={wishlisted ? labels.removeFromWishlist : labels.addToWishlist}
            aria-pressed={wishlisted}
          >
            {wishlisted ? "♥" : "♡"}
          </button>
        </div>

        <div className={styles.info}>
          {hasRating && (
            <div className={styles.rating} aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{ opacity: i < Math.round(item.averageRating!) ? 1 : 0.25 }}>★</span>
              ))}
              <span className={styles.ratingCount}>({item.reviewCount})</span>
            </div>
          )}

          <h3 className={styles.cardTitle}>{item.title}</h3>

          {item.minPriceCents != null && (
            <div className={styles.priceRow}>
              {hasCompare && <span className={styles.comparePrice}>€{centsToEuros(item.compareAtPriceCents!)}</span>}
              <span className={styles.price}>€{centsToEuros(item.minPriceCents)}</span>
            </div>
          )}

          <span className={styles.cta}>{labels.viewProduct}</span>
        </div>
      </Link>
    </article>
  );
}

export default function RelatedProductsCarousel({ items, locale, labels }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const dragRef = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(items.length > 1);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, items.length]);

  // Track which card is most visible to drive the active pagination dot.
  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = slideRefs.current.findIndex(el => el === entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { root, threshold: [0.6] },
    );
    slideRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    const first = slideRefs.current[0];
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).gap || "16");
    el.scrollBy({ left: dir * (first.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  const scrollToIndex = (idx: number) => {
    slideRefs.current[idx]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  // Mouse drag-to-scroll (touch devices already get native swipe via scroll-snap).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.classList.add(styles.dragging);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const state = dragRef.current;
    const el = trackRef.current;
    if (!state.down || !el) return;
    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > 4) state.moved = true;
    el.scrollLeft = state.startScroll - dx;
  };
  const endDrag = () => {
    trackRef.current?.classList.remove(styles.dragging);
    dragRef.current.down = false;
  };
  // Suppress the click-through to the card link right after a drag.
  const onTrackClickCapture = (e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  if (items.length === 0) return null;

  return (
    <section className={styles.section} aria-label={labels.title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{labels.subtitle}</h2>
      </div>

      <div className={styles.viewport}>
        <div
          ref={trackRef}
          className={styles.track}
          role="group"
          aria-roledescription="carousel"
          aria-label={labels.title}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={onTrackClickCapture}
        >
          {items.map((item, i) => (
            <ProductCard
              key={item.id}
              item={item}
              locale={locale}
              labels={labels}
              setSlideRef={el => { slideRefs.current[i] = el; }}
            />
          ))}
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowPrev}`}
              onClick={() => scrollByCard(-1)}
              disabled={!canScrollPrev}
              aria-label={labels.prev}
            >
              <ChevronLeft size={20} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowNext}`}
              onClick={() => scrollByCard(1)}
              disabled={!canScrollNext}
              aria-label={labels.next}
            >
              <ChevronRight size={20} strokeWidth={2.25} />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label={labels.title}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ""}`}
              onClick={() => scrollToIndex(i)}
              aria-selected={i === activeIndex}
              aria-label={`${labels.goToProduct} ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
