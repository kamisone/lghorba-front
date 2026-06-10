"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartContext";
import { useWishlist } from "@/components/shop/WishlistContext";
import AddToCartButton from "@/components/shop/AddToCartButton";
import ProductVariantSelector, { type AvailabilityMatrix, type AvailabilityVariant } from "@/components/shop/ProductVariantSelector";
import ProductGallery from "./ProductGallery";
import PromotionBadge, { type PromotionInfo } from "@/components/shop/PromotionBadge";
import { getTranslations } from "@/lib/i18n";
import { formatStockError, stockCheckMessage } from "@/lib/shop/stockError";
import styles from "./ProductDetail.module.css";

interface FlatVariant {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  isDefault: boolean;
  mediaKeys: string[];
  mediaUrls: string[];
}

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  brand: string | null;
  featuredImageUrl: string | null;
  featuredImageKey: string | null;
  galleryImageUrls: string[];
  galleryImageKeys: string[];
  variants: FlatVariant[];
  categories: Array<{ name: string }>;
}

interface ReviewStats { average: number; count: number }

interface ResolvedVariant {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  variantSlug: string | null;
  featuredMediaUrl: string | null;
  available: number;
  optionValueIds: string[];
}

type ResolveStatus = 'idle' | 'loading' | 'available' | 'out_of_stock' | 'unavailable';

interface Props {
  product: Product;
  reviewStats: ReviewStats;
  locale: string;
  activePromotion?: PromotionInfo | null;
  availabilityMatrix?: AvailabilityMatrix | null;
  initialVariantSlug?: string | null;
}

function centsToEuros(cents: number) { return (cents / 100).toFixed(2); }

function buildProductGallery(product: Product): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url: string | null | undefined) => {
    if (url && !seen.has(url)) { seen.add(url); out.push(url); }
  };
  push(product.featuredImageUrl);
  for (const url of product.galleryImageUrls ?? []) push(url);
  return out;
}

export default function ShopProductDetail({
  product, reviewStats, locale, activePromotion,
  availabilityMatrix, initialVariantSlug,
}: Props) {
  const { addItem, mutating, cart } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const t = getTranslations(locale).shop;
  const router = useRouter();

  const productGallery = buildProductGallery(product);

  const defaultVariant = product.variants.find(v => v.isDefault) ?? product.variants[0];

  const [selectedVariant, setSelectedVariant] = useState<AvailabilityVariant | null>(() => {
    if (!availabilityMatrix) return null;

    // Mirror the initialSel logic from ProductVariantSelector so the parent has the
    // correct variant from the very first render, before the selector's useEffect fires.
    if (initialVariantSlug) {
      return availabilityMatrix.variants.find(v => v.variantSlug === initialVariantSlug) ?? null;
    }

    const { attributes, variants } = availabilityMatrix;
    const ovToAttr = new Map<string, string>();
    for (const attr of attributes) {
      for (const ov of attr.optionValues) ovToAttr.set(ov.id, attr.id);
    }

    const defaultSel: Record<string, string> = {};
    for (const attr of attributes) {
      const preferred = attr.defaultOptionValueId ?? attr.optionValues[0]?.id;
      if (preferred) defaultSel[attr.id] = preferred;
    }

    const isStructured = variants.some(v => v.optionValueIds.length > 0);
    if (!isStructured) return variants.find(v => v.inStock) ?? variants[0] ?? null;

    const defaultValues = Object.values(defaultSel);
    if (defaultValues.length === attributes.length) {
      const exact = variants.find(v => defaultValues.every(ovId => v.optionValueIds.includes(ovId)));
      if (exact) return exact;
    }

    return variants.find(v => v.available && v.inStock) ?? variants[0] ?? null;
  });
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('idle');
  const [resolvedVariant, setResolvedVariant] = useState<ResolvedVariant | null>(null);

  // Real-time SKU resolution: call backend on every full combination change.
  // Structured option system only — legacy variants (empty optionValueIds) skip this.
  const selKey = selectedVariant?.optionValueIds?.join(',') ?? '';
  useEffect(() => {
    if (!selKey) { setResolveStatus('idle'); setResolvedVariant(null); return; }
    let cancelled = false;
    setResolveStatus('loading');
    fetch(`/next-api/public/shop/products/${product.slug}/variants/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionValueIds: selKey.split(',') }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { status: ResolveStatus; variant: ResolvedVariant | null }) => {
        if (!cancelled) {
          setResolveStatus(data.status ?? 'unavailable');
          setResolvedVariant(data.variant ?? null);
        }
      })
      .catch(() => { if (!cancelled) setResolveStatus('idle'); });
    return () => { cancelled = true; };
  }, [selKey, product.slug]);

  // Prefer resolved (real-time) data; fall back to matrix data, then product default.
  const activeId         = resolvedVariant?.id         ?? selectedVariant?.id         ?? defaultVariant?.id         ?? "";
  const activePriceCents = resolvedVariant?.priceCents ?? selectedVariant?.priceCents ?? defaultVariant?.priceCents ?? 0;
  const activeCompare    = resolvedVariant?.compareAtPriceCents ?? selectedVariant?.compareAtPriceCents ?? defaultVariant?.compareAtPriceCents ?? null;
  const activeSku        = resolvedVariant?.sku ?? defaultVariant?.sku ?? null;

  const selectedOptionValueIds = selectedVariant?.optionValueIds ?? [];

  // Prepend variant-specific hero image to gallery when resolved.
  const activeGallery = useMemo(() => {
    const variantUrl = resolvedVariant?.featuredMediaUrl ?? selectedVariant?.featuredMediaUrl ?? null;
    if (variantUrl && !productGallery.includes(variantUrl)) {
      return [variantUrl, ...productGallery];
    }
    return productGallery;
  }, [resolvedVariant, selectedVariant, productGallery]);

  // When a selected option value has an image swatch, jump to the matching gallery image.
  const forcedGalleryIndex = useMemo(() => {
    if (!availabilityMatrix || !selectedOptionValueIds.length) return undefined;
    // Build a map from GCS key → signed URL using the product's own images.
    const keyToUrl = new Map<string, string>();
    if (product.featuredImageKey && product.featuredImageUrl) {
      keyToUrl.set(product.featuredImageKey, product.featuredImageUrl);
    }
    (product.galleryImageKeys ?? []).forEach((k, i) => {
      const url = product.galleryImageUrls?.[i];
      if (url) keyToUrl.set(k, url);
    });

    for (const attr of availabilityMatrix.attributes) {
      for (const ov of attr.optionValues) {
        if (ov.swatchType === "image" && ov.swatchValue && selectedOptionValueIds.includes(ov.id)) {
          const targetUrl = keyToUrl.get(ov.swatchValue);
          if (targetUrl) {
            const idx = activeGallery.indexOf(targetUrl);
            if (idx >= 0) return idx;
          }
        }
      }
    }
    return undefined;
  }, [selectedOptionValueIds, availabilityMatrix, product, activeGallery]);

  const wishlisted = isWishlisted(product.id);
  const inCart     = cart?.items.some(item => item.variantId === activeId) ?? false;

  const [qty, setQty]             = useState(1);
  const [qtyError, setQtyError]   = useState("");
  const [buyingNow, setBuyingNow] = useState(false);
  const [buyError, setBuyError]   = useState("");

  const hasVariations = !!availabilityMatrix && availabilityMatrix.attributes.length > 0;

  const handleQtyIncrement = useCallback(async () => {
    if (!activeId || hasVariations) { setQty(q => q + 1); return; }
    setQtyError("");
    try {
      const res = await fetch(`/next-api/public/shop/variants/${activeId}/stock`);
      if (res.ok) {
        const { available } = await res.json() as { available: number };
        const msg = stockCheckMessage(available, qty + 1, t);
        if (msg) { setQtyError(msg); return; }
      }
    } catch {
      // fail open — the backend will reject at add-to-cart time
    }
    setQty(q => q + 1);
  }, [activeId, hasVariations, qty, t]);

  const isOos         = resolveStatus === 'out_of_stock';
  const isUnavailable = resolveStatus === 'unavailable';
  const isBlocked     = isOos || isUnavailable;

  async function handleBuyNow() {
    if (!activeId || isBlocked) return;
    setBuyError("");
    setBuyingNow(true);
    const result = await addItem(activeId, qty, selectedOptionValueIds.length ? selectedOptionValueIds : undefined);
    if (result.ok) {
      router.push(`/${locale}/checkout`);
    } else {
      setBuyError(formatStockError(result, t));
      setBuyingNow(false);
    }
  }

  const discount = activeCompare && activeCompare > activePriceCents
    ? Math.round((1 - activePriceCents / activeCompare) * 100)
    : null;

  return (
    <div className={styles.container}>
      {/* Gallery */}
      <div className={styles.galleryCol}>
        <ProductGallery images={activeGallery} title={product.title} forcedIndex={forcedGalleryIndex} />
      </div>

      {/* Details */}
      <div className={styles.details}>
        {product.brand && <p className={styles.brand}>{product.brand}</p>}
        <h1 className={styles.title}>{product.title}</h1>

        {reviewStats.count > 0 && (
          <div className={styles.rating}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ opacity: i < Math.round(reviewStats.average) ? 1 : 0.25 }}>★</span>
            ))}
            <span className={styles.ratingCount}>({reviewStats.count})</span>
          </div>
        )}

        <div className={styles.priceRow}>
          <span className={styles.price}>€{centsToEuros(activePriceCents)}</span>
          {activeCompare && activeCompare > activePriceCents && (
            <span className={styles.comparePrice}>€{centsToEuros(activeCompare)}</span>
          )}
          {activePromotion ? (
            <PromotionBadge promotion={activePromotion} size="md" />
          ) : discount ? (
            <span className={styles.discountBadge}>−{discount}%</span>
          ) : null}
        </div>

        {activePromotion && (
          <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 500, marginBottom: 12 }}>
            {activePromotion.name} automatically applied at checkout
          </p>
        )}

        {product.shortDescription && (
          <p className={styles.shortDesc}>{product.shortDescription}</p>
        )}

        {/* ── Variation option pickers ── */}
        {availabilityMatrix && (
          <ProductVariantSelector
            matrix={availabilityMatrix}
            initialVariantSlug={initialVariantSlug}
            onVariantChange={setSelectedVariant}
          />
        )}

        {/* Real-time stock status */}
        {resolveStatus !== 'idle' && (
          <div className={[
            styles.stockBadge,
            resolveStatus === 'available'    ? styles.stockAvailable    : '',
            resolveStatus === 'out_of_stock' ? styles.stockOutOfStock   : '',
            resolveStatus === 'unavailable'  ? styles.stockUnavailable  : '',
            resolveStatus === 'loading'      ? styles.stockLoading      : '',
          ].filter(Boolean).join(' ')}>
            {resolveStatus === 'available'    && t.stockAvailable}
            {resolveStatus === 'out_of_stock' && t.stockOutOfStock}
            {resolveStatus === 'unavailable'  && t.stockUnavailable}
            {resolveStatus === 'loading'      && t.stockChecking}
          </div>
        )}

        {/* SKU */}
        {activeSku && (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
            {t.skuLabel} {activeSku}
          </p>
        )}

        {/* Quantity row */}
        {!inCart && !isBlocked && (
          <div className={styles.qtyRow}>
            <span className={styles.qtyLabel}>{t.quantity}</span>
            <div className={styles.qtyControl}>
              <button onClick={() => { setQtyError(""); setQty(q => Math.max(1, q - 1)); }} className={styles.qtyBtn} disabled={mutating}>−</button>
              <span className={styles.qty}>{qty}</span>
              <button onClick={handleQtyIncrement} className={styles.qtyBtn} disabled={mutating}>+</button>
            </div>
            {qtyError && <p className={styles.qtyError}>{qtyError}</p>}
          </div>
        )}

        {/* CTA buttons */}
        <div className={styles.actions}>
          {isUnavailable ? (
            <button className={`${styles.addToCartBtn} ${styles.addToCartWrap}`} disabled>
              {t.stockUnavailable}
            </button>
          ) : isOos ? (
            <button className={`${styles.addToCartBtn} ${styles.addToCartWrap}`} disabled>
              {t.stockOutOfStock}
            </button>
          ) : activeId ? (
            <AddToCartButton
              variantId={activeId}
              initialQty={qty}
              size="lg"
              className={styles.addToCartWrap}
              selectedOptionValueIds={selectedOptionValueIds.length ? selectedOptionValueIds : undefined}
            />
          ) : (
            <button className={`${styles.addToCartBtn} ${styles.addToCartWrap}`} disabled>
              {t.addToCart}
            </button>
          )}
          <button
            onClick={() => toggle(product.id)}
            className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ""}`}
            aria-label={wishlisted ? t.removeFromWishlist : t.saveToWishlist}
          >
            {wishlisted ? "♥" : "♡"}
          </button>
        </div>

        <button
          onClick={handleBuyNow}
          disabled={mutating || buyingNow || !activeId || isBlocked || resolveStatus === 'loading'}
          className={styles.buyNowBtn}
        >
          {buyingNow ? t.redirecting : t.buyNow}
        </button>

        {buyError && <p className={styles.addError}>{buyError}</p>}

        {/* Trust signals */}
        <div className={styles.trust}>
          <span>{t.trustSecure}</span>
          <span>{t.trustShipping}</span>
          <span>{t.trustReturns}</span>
        </div>

        {/* Description */}
        {product.description && (
          <div className={styles.descSection}>
            <h3>{t.descriptionTitle}</h3>
            <div className={styles.descBody} dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        )}
      </div>
    </div>
  );
}
