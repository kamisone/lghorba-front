"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartContext";
import { useWishlist } from "@/components/shop/WishlistContext";
import AddToCartButton from "@/components/shop/AddToCartButton";
import ProductVariantSelector, { type AvailabilityMatrix, type AvailabilityVariant } from "@/components/shop/ProductVariantSelector";
import ProductGallery, { type GalleryMediaItem } from "./ProductGallery";
import PromotionBadge, { type PromotionInfo } from "@/components/shop/PromotionBadge";
import { getTranslations } from "@/lib/i18n";
import { pixelTrack, trackServerEvent } from "@/lib/metaPixel";
import { trackShopBehavior } from "@/lib/shopBehavior";
import { formatStockError, stockCheckMessage } from "@/lib/shop/stockError";
import { getTrustBadgeIcon } from "@/lib/shop/trustBadgeIcons";
import { Lock, Truck, RotateCcw, PackageX } from "lucide-react";
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

/** Product media item with resolved URLs, as returned by the API */
interface ResolvedProductMediaItem {
  key:              string;
  type:             "image" | "video";
  posterKey?:       string | null;
  altText?:         string | null;
  isFeatured?:      boolean;
  url:              string;
  posterUrl:        string | null;
  hlsUrl?:          string | null;
  durationSeconds?: number | null;
  mimeType?:        string | null;
}

/** A structured spec block shown on the product page (Composition, Care, Target audience...) */
interface ProductInfoSection {
  id: string;
  key: string;
  label: string;
  value: string;
  sortOrder: number;
}

/** A small icon+title trust signal shown near the buy box (e.g. "Secure checkout") */
interface ProductTrustBadge {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  link?: string;
  sortOrder: number;
}

/** A product-specific FAQ entry shown near the bottom of the page and in FAQPage JSON-LD */
interface ProductFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

/** A quantity-price tier — "buy `quantity`, pay `unitPriceCents` each". Server pre-filters to active-only, sorted ascending. */
interface UpsellTier {
  id: string;
  quantity: number;
  unitPriceCents: number;
}

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  brand: string | null;
  media: ResolvedProductMediaItem[];
  infoSections: ProductInfoSection[];
  trustBadges: ProductTrustBadge[];
  faqs: ProductFaq[];
  documents: Array<{ id: string; title: string; url: string; originalFilename: string; sizeBytes: number }>;
  variants: FlatVariant[];
  categories: Array<{ name: string }>;
  /** True when every variant's inventory is at 0 — same flag as the listing badge. */
  outOfStock?: boolean;
  /** Delivery offered on this product; frees the whole basket. */
  freeShipping?: boolean;
  upsellingEnabled?: boolean;
  upsellTiers?: UpsellTier[];
}

/**
 * Presentational only — the authoritative price is always resolved server-side
 * (cart add/update, checkout re-verification; see back/src/commerce/pricing/
 * variant-price.ts resolveUnitPriceForQuantity). Mirrors that same "flat price,
 * highest qualifying quantity wins" rule purely so the price shown before
 * adding to cart matches what will actually be charged.
 */
function resolveDisplayUnitPriceCents(basePriceCents: number, quantity: number, product: Product): number {
  if (!product.upsellingEnabled || !product.upsellTiers?.length) return basePriceCents;
  const bestTier = product.upsellTiers
    .filter(t => t.quantity <= quantity)
    .sort((a, b) => b.quantity - a.quantity)[0];
  return bestTier ? bestTier.unitPriceCents : basePriceCents;
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

function buildProductGallery(product: Product): GalleryMediaItem[] {
  const seen = new Set<string>();
  const out: GalleryMediaItem[] = [];
  for (const m of product.media ?? []) {
    if (!m.url || seen.has(m.key)) continue;
    seen.add(m.key);
    out.push({
      type:            m.type,
      url:             m.url,
      hlsUrl:          m.hlsUrl ?? null,
      posterUrl:       m.posterUrl ?? null,
      durationSeconds: m.durationSeconds ?? null,
    });
  }
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

  const galleryColRef = useRef<HTMLDivElement>(null);
  const actionsRef    = useRef<HTMLDivElement>(null);
  const [compact, setCompact]             = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Show mini viewer when the gallery element is no longer visible in the viewport.
  useEffect(() => {
    const el = galleryColRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (window.innerWidth <= 900) setCompact(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    const onResize = () => { if (window.innerWidth > 900) setCompact(false); };
    window.addEventListener("resize", onResize, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", onResize); };
  }, []);

  // Sticky buy bar: appears once the main CTA row scrolls above the viewport.
  useEffect(() => {
    const HEADER = 64;
    const handle = () => {
      if (window.innerWidth > 900) { setShowStickyBar(false); return; }
      if (actionsRef.current) {
        setShowStickyBar(actionsRef.current.getBoundingClientRect().bottom < HEADER);
      }
    };
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, []);

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

  // Meta Pixel: value/currency/ids only — never add customer PII here. Fires once
  // per distinct product (App Router can reuse this component across client-side
  // navigations between products without a full remount). Same eventId shared
  // between the browser pixel and the server-side Conversions API call for dedup.
  const viewContentFiredForRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewContentFiredForRef.current === product.id) return;
    viewContentFiredForRef.current = product.id;
    const eventId = crypto.randomUUID();
    const customData = {
      content_type: "product",
      content_ids: [product.id],
      content_name: product.title,
      value: activePriceCents / 100,
      currency: "EUR",
    };
    pixelTrack("ViewContent", customData, eventId);
    trackServerEvent("ViewContent", eventId, customData);
    trackShopBehavior("product_view", { productId: product.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Prepend the variant-specific hero image to the gallery, always at index 0,
  // so ProductGallery can reliably snap to it on selection change. selectedVariant
  // (synchronous, from the availability matrix) takes priority over resolvedVariant
  // (async /resolve call) — the latter lags one tick behind a fresh selection and
  // would otherwise show the previous variant's image until it resolves. Falls
  // back to the selected option value's per-product swatch image (e.g. Color →
  // Red) when the variant itself has no dedicated featured media.
  const activeGallery = useMemo(() => {
    let heroUrl = selectedVariant?.featuredMediaUrl ?? resolvedVariant?.featuredMediaUrl ?? null;

    if (!heroUrl && availabilityMatrix && selectedOptionValueIds.length) {
      for (const attr of availabilityMatrix.attributes) {
        const ov = attr.optionValues.find(o => o.swatchType === "image" && o.swatchUrl && selectedOptionValueIds.includes(o.id));
        if (ov) { heroUrl = ov.swatchUrl; break; }
      }
    }

    if (!heroUrl) return productGallery;

    const rest = productGallery.filter(m => m.url !== heroUrl);
    return [{ type: "image" as const, url: heroUrl, posterUrl: null }, ...rest];
  }, [resolvedVariant, selectedVariant, productGallery, availabilityMatrix, selectedOptionValueIds]);

  const wishlisted = isWishlisted(product.id);
  const inCart     = cart?.items.some(item => item.variantId === activeId) ?? false;

  const [qty, setQty]                   = useState(1);
  const [qtyError, setQtyError]       = useState("");
  const [qtyMax, setQtyMax]           = useState<number | null>(null);
  const [buyingNow, setBuyingNow]     = useState(false);
  const [buyError, setBuyError]       = useState("");
  const [stockChecking, setStockChecking] = useState(false);
  const stockCheckTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasVariations = !!availabilityMatrix && availabilityMatrix.attributes.length > 0;

  // Whole product unavailable: every purchasable variant is out of stock.
  // Primary signal is the backend flag (same as the listing's outOfStock
  // badge); the availability matrix doubles as a fallback. Drives the sticky
  // notice and disables all buy CTAs up front.
  const allOutOfStock =
    product.outOfStock === true ||
    (!!availabilityMatrix &&
      availabilityMatrix.variants.length > 0 &&
      availabilityMatrix.variants.every(v => !v.inStock));

  // Reset qty and cap whenever the active variant changes
  useEffect(() => {
    setQty(1);
    setQtyMax(null);
    setQtyError("");
  }, [activeId]);

  // For structured-variant products the /resolve endpoint already returns available stock.
  // Sync qtyMax from that instead of making a separate /stock call.
  useEffect(() => {
    if (!hasVariations || !resolvedVariant) return;
    const av = resolvedVariant.available;
    setQtyMax(av === -1 ? null : av);
    if (av !== -1 && av > 0) setQty(q => (q > av ? av : q));
  }, [resolvedVariant, hasVariations]);

  useEffect(() => {
    return () => { if (stockCheckTimer.current) clearTimeout(stockCheckTimer.current); };
  }, []);

  // Debounced backend stock check — fires 400 ms after the last qty change.
  // Skips structured-variant products (resolved via /resolve endpoint).
  const scheduleStockCheck = useCallback((newQty: number) => {
    if (!activeId || hasVariations) return;
    if (stockCheckTimer.current) clearTimeout(stockCheckTimer.current);
    setStockChecking(true);
    stockCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/next-api/public/shop/variants/${activeId}/stock`);
        if (res.ok) {
          const { available } = await res.json() as { available: number };
          const msg = stockCheckMessage(available, newQty, t);
          setQtyError(msg || "");
          if (available !== -1) {
            setQtyMax(available);
            if (available > 0 && newQty > available) setQty(available);
          } else {
            setQtyMax(null);
          }
        }
      } catch { /* fail open — backend enforces at add-to-cart */ }
      setStockChecking(false);
    }, 400);
  }, [activeId, hasVariations, t]);

  const handleQtyIncrement = useCallback(() => {
    if (qtyMax !== null && qty >= qtyMax) return;
    setQtyError("");
    const next = qty + 1;
    setQty(next);
    scheduleStockCheck(next);
  }, [qty, qtyMax, scheduleStockCheck]);

  const handleQtyDecrement = useCallback(() => {
    setQtyError("");
    const next = Math.max(1, qty - 1);
    setQty(next);
    scheduleStockCheck(next);
  }, [qty, scheduleStockCheck]);

  const isOos         = resolveStatus === 'out_of_stock' || allOutOfStock;
  const isUnavailable = resolveStatus === 'unavailable';
  const isBlocked     = isOos || isUnavailable;
  const verifying     = resolveStatus === 'loading' || stockChecking;

  // Presentational mirror of the backend's tier resolution — see
  // resolveDisplayUnitPriceCents's doc comment. Falls back to activePriceCents
  // unchanged for every product without upselling enabled.
  const displayUnitPriceCents = resolveDisplayUnitPriceCents(activePriceCents, qty, product);
  const totalPriceCents = displayUnitPriceCents * qty;

  async function handleBuyNow() {
    if (!activeId || isBlocked || verifying) return;
    setBuyError("");

    // Already in the cart: don't re-add (additive on the backend, may exceed
    // remaining stock) — just go straight to checkout.
    if (inCart) {
      router.push(`/${locale}/shop/checkout`);
      return;
    }

    setBuyingNow(true);
    const result = await addItem(activeId, qty, selectedOptionValueIds.length ? selectedOptionValueIds : undefined);
    if (result.ok) {
      router.push(`/${locale}/shop/checkout`);
    } else {
      setBuyError(formatStockError(result, t));
      setBuyingNow(false);
    }
  }

  const discount = activeCompare && activeCompare > activePriceCents
    ? Math.round((1 - activePriceCents / activeCompare) * 100)
    : null;

  return (
    <>
    {/* Sticky notice — whole product out of stock, no variation available */}
    {allOutOfStock && (
      <div className={styles.oosStickyNotice} role="status">
        <span className={styles.oosStickyIcon} aria-hidden="true">
          <PackageX size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.oosStickyCopy}>
          <span className={styles.oosStickyTitle}>{t.productOosTitle}</span>
          <span className={styles.oosStickyText}>{t.productOosText}</span>
        </span>
      </div>
    )}
    <div className={styles.container}>
      {/* Gallery */}
      <div className={styles.galleryCol} ref={galleryColRef}>
        <ProductGallery
          media={activeGallery}
          title={product.title}
          compact={compact}
        />
      </div>

      {/* Details */}
      <div className={styles.details}>
        {product.brand && <p className={styles.brand}>{product.brand}</p>}
        <h1 className={styles.title}>{product.title}</h1>

        {reviewStats.count > 0 && (
          <a href="#reviews" className={styles.rating}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ opacity: i < Math.round(reviewStats.average) ? 1 : 0.25 }}>★</span>
            ))}
            <span className={styles.ratingCount}>({reviewStats.count})</span>
          </a>
        )}

        <div className={styles.priceRow}>
          <span className={styles.price}>
            {qty > 1 ? (
              <>{centsToEuros(totalPriceCents)} €<span className={styles.unitPrice}>{centsToEuros(displayUnitPriceCents)} € × {qty}</span></>
            ) : (
              <>{centsToEuros(displayUnitPriceCents)} €</>
            )}
          </span>
          {activeCompare && activeCompare > activePriceCents && (
            <span className={styles.comparePrice}>{centsToEuros(activeCompare)} €</span>
          )}
          {activePromotion ? (
            <PromotionBadge promotion={activePromotion} size="md" />
          ) : discount ? (
            <span className={styles.discountBadge}>−{discount}%</span>
          ) : null}
        </div>

        {/* Quantity discounts — clicking a tier raises qty; the price shown
            everywhere above already reflects it via displayUnitPriceCents.
            The actual charge is independently resolved server-side on add. */}
        {product.upsellingEnabled && !!product.upsellTiers?.length && (
          <div className={styles.upsellTiers}>
            {product.upsellTiers.map(tier => {
              const savingsPct = activePriceCents > 0 && tier.unitPriceCents < activePriceCents
                ? Math.round((1 - tier.unitPriceCents / activePriceCents) * 100)
                : null;
              const isSelected = qty >= tier.quantity && displayUnitPriceCents === tier.unitPriceCents;
              // Below available stock the tier can't actually be fulfilled —
              // disable rather than silently set a lower quantity that
              // wouldn't even qualify for the price just advertised.
              const unreachable = qtyMax !== null && qtyMax < tier.quantity;
              const buyLine = t.upsellTierBuyLine
                .replace("{qty}", String(tier.quantity))
                .replace("{price}", `${centsToEuros(tier.unitPriceCents)} €`);
              return (
                <button
                  key={tier.id}
                  type="button"
                  className={`${styles.upsellTier} ${isSelected ? styles.upsellTierActive : ""}`}
                  disabled={unreachable || inCart || isBlocked || verifying}
                  title={unreachable ? t.stockOnlyN.replace("{n}", String(qtyMax)) : undefined}
                  onClick={() => setQty(tier.quantity)}
                >
                  <span className={styles.upsellTierMain}>{buyLine}</span>
                  {savingsPct !== null && (
                    <span className={styles.upsellTierBadge}>
                      {t.upsellSaveBadge.replace("{pct}", String(savingsPct))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {product.freeShipping && (
          <div className={styles.freeShippingBanner}>
            <svg className={styles.freeShippingIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 7h11v8H3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M14 10h3.5L21 13v2h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="7" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="17" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <span className={styles.freeShippingText}>
              <strong>{t.freeShippingBadge}</strong>
              <span>{t.freeShippingProductNote}</span>
            </span>
          </div>
        )}

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

        {/* Quantity row — always visible, disabled when item is in cart or unavailable */}
        <div className={styles.qtyRow}>
          <span className={styles.qtyLabel}>{t.quantity}</span>
          <div className={`${styles.qtyControl} ${(inCart || isBlocked || verifying) ? styles.qtyDisabled : ""}`}>
            <button onClick={handleQtyDecrement} className={styles.qtyBtn} disabled={mutating || qty <= 1 || inCart || isBlocked || verifying}>−</button>
            <span className={styles.qty}>{qty}</span>
            <button onClick={handleQtyIncrement} className={styles.qtyBtn} disabled={mutating || (qtyMax !== null && qty >= qtyMax) || inCart || isBlocked || verifying}>+</button>
          </div>
          {qtyError && <p className={styles.qtyError}>{qtyError}</p>}
        </div>

        {/* CTA buttons */}
        <div className={styles.actions} ref={actionsRef}>
          <AddToCartButton
            variantId={activeId || "none"}
            initialQty={qty}
            size="lg"
            className={styles.addToCartWrap}
            selectedOptionValueIds={selectedOptionValueIds.length ? selectedOptionValueIds : undefined}
            disabled={verifying || !activeId}
            blockedLabel={
              isUnavailable ? t.stockUnavailable
              : isOos ? t.stockOutOfStock
              : !activeId ? t.addToCart
              : null
            }
          />
          <button
            onClick={() => toggle({
              productId: product.id,
              slug: product.slug,
              title: product.title,
              imageUrl: productGallery[0]?.url ?? null,
              priceCents: activePriceCents || defaultVariant?.priceCents || null,
            })}
            className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ""}`}
            aria-label={wishlisted ? t.removeFromWishlist : t.saveToWishlist}
          >
            {wishlisted ? "♥" : "♡"}
          </button>
        </div>

        {!allOutOfStock && (
          <button
            onClick={handleBuyNow}
            disabled={mutating || buyingNow || !activeId || isBlocked || verifying}
            className={styles.buyNowBtn}
          >
            {buyingNow ? t.redirecting : t.buyNow}
          </button>
        )}

        {buyError && <p className={styles.addError}>{buyError}</p>}

        {/* Trust signals */}
        <div className={styles.trust}>
          {product.trustBadges.length > 0 ? (
            product.trustBadges.map(badge => {
              const Icon = getTrustBadgeIcon(badge.icon);
              const content = (
                <>
                  <Icon size={15} className={styles.trustIcon} aria-hidden="true" />
                  <span className={styles.trustText}>
                    {badge.title}
                    {badge.subtitle && <span className={styles.trustSubtitle}>{badge.subtitle}</span>}
                  </span>
                </>
              );
              return badge.link ? (
                <a key={badge.id} href={badge.link} className={`${styles.trustItem} ${styles.trustLink}`}>
                  {content}
                </a>
              ) : (
                <span key={badge.id} className={styles.trustItem}>
                  {content}
                </span>
              );
            })
          ) : (
            <>
              <span className={styles.trustItem}><Lock size={15} className={styles.trustIcon} aria-hidden="true" />{t.trustSecure}</span>
              <span className={styles.trustItem}><Truck size={15} className={styles.trustIcon} aria-hidden="true" />{t.trustShipping}</span>
              <span className={styles.trustItem}><RotateCcw size={15} className={styles.trustIcon} aria-hidden="true" />{t.trustReturns}</span>
            </>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <div className={styles.descSection}>
            <h3>{t.descriptionTitle}</h3>
            <div className={styles.descBody} dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        )}

      </div>

      {/* ── Sticky buy bar — mobile/tablet only, hidden when the whole product
             is out of stock (the sticky notice communicates the status) ────── */}
      <div
        className={`${styles.stickyBuyBar} ${showStickyBar && !allOutOfStock ? styles.stickyBuyBarVisible : ""}`}
        aria-hidden={!showStickyBar || allOutOfStock}
      >
        {/* Row 1: price + selected variant title + stock status */}
        <div className={styles.stickyMeta}>
          <span className={styles.stickyPrice}>
            {qty > 1 ? `${centsToEuros(totalPriceCents)} €` : `${centsToEuros(displayUnitPriceCents)} €`}
          </span>
          {activeCompare && activeCompare > activePriceCents && (
            <span className={styles.stickyCompare}>{centsToEuros(activeCompare)} €</span>
          )}
          {(resolvedVariant?.title ?? selectedVariant?.title) && (
            <span className={styles.stickyVariant}>
              {resolvedVariant?.title ?? selectedVariant?.title}
            </span>
          )}
          {resolveStatus === 'available' && (
            <span className={`${styles.stickyStock} ${styles.stickyStockAvail}`}>
              {t.stockAvailable}
            </span>
          )}
          {resolveStatus === 'out_of_stock' && (
            <span className={`${styles.stickyStock} ${styles.stickyStockOos}`}>
              {t.stockOutOfStock}
            </span>
          )}
        </div>

        {/* Row 2: CTA buttons */}
        <div className={styles.stickyActions}>
          <AddToCartButton
            variantId={activeId || "none"}
            initialQty={qty}
            size="sm"
            className={styles.stickyCartWrap}
            selectedOptionValueIds={selectedOptionValueIds.length ? selectedOptionValueIds : undefined}
            disabled={verifying || !activeId}
            blockedLabel={
              isOos ? t.stockOutOfStock
              : isUnavailable ? t.stockUnavailable
              : !activeId ? t.addToCart
              : null
            }
          />
          {!isBlocked && activeId && (
            <button
              onClick={handleBuyNow}
              disabled={mutating || buyingNow || verifying}
              className={styles.stickyBuyBtn}
            >
              {buyingNow ? t.redirecting : t.buyNow}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
