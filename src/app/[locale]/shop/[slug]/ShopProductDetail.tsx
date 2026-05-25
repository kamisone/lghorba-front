"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartContext";
import { useWishlist } from "@/components/shop/WishlistContext";
import AddToCartButton from "@/components/shop/AddToCartButton";
import type { AvailabilityMatrix } from "@/components/shop/ProductVariantSelector";
import ProductGallery from "./ProductGallery";
import PromotionBadge, { type PromotionInfo } from "@/components/shop/PromotionBadge";
import { getTranslations } from "@/lib/i18n";
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
  galleryImageUrls: string[];
  galleryImageKeys: string[];
  variants: FlatVariant[];
  categories: Array<{ name: string }>;
}

interface ReviewStats { average: number; count: number }

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
  availabilityMatrix,
}: Props) {
  const { addItem, mutating, cart } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const t = getTranslations(locale).shop;
  const router = useRouter();

  const productGallery = buildProductGallery(product);

  // Always use the default variant — variations are cosmetic
  const defaultVariant = product.variants.find(v => v.isDefault) ?? product.variants[0];
  const activeId         = defaultVariant?.id ?? "";
  const activePriceCents = defaultVariant?.priceCents ?? 0;
  const activeCompare    = defaultVariant?.compareAtPriceCents ?? null;
  const activeSku        = defaultVariant?.sku ?? null;

  // Selected cosmetic options (attributeId → optionValueId), seeded from admin defaults
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const attr of availabilityMatrix?.attributes ?? []) {
      if (attr.defaultOptionValueId) defaults[attr.id] = attr.defaultOptionValueId;
    }
    return defaults;
  });
  const selectedOptionValueIds = Object.values(selectedOptions).filter(Boolean);

  const [qty, setQty]             = useState(1);
  const [buyingNow, setBuyingNow] = useState(false);
  const [buyError, setBuyError]   = useState("");

  const wishlisted = isWishlisted(product.id);
  const inCart     = cart?.items.some(item => item.variantId === activeId) ?? false;

  function selectOption(attributeId: string, optionValueId: string) {
    setSelectedOptions(s => ({ ...s, [attributeId]: optionValueId }));
  }

  async function handleBuyNow() {
    if (!activeId) return;
    setBuyError("");
    setBuyingNow(true);
    const result = await addItem(activeId, qty, selectedOptionValueIds.length ? selectedOptionValueIds : undefined);
    if (result.ok) {
      router.push(`/${locale}/checkout`);
    } else {
      setBuyError(result.message ?? "Could not add to cart");
      setBuyingNow(false);
    }
  }

  const discount = activeCompare && activeCompare > activePriceCents
    ? Math.round((1 - activePriceCents / activeCompare) * 100)
    : null;

  // Linked variation attributes from the matrix
  const attributes = availabilityMatrix?.attributes ?? [];

  return (
    <div className={styles.container}>
      {/* Gallery */}
      <div className={styles.galleryCol}>
        <ProductGallery images={productGallery} title={product.title} />
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
        {attributes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            {attributes.map(attr => (
              <div key={attr.id}>
                <p className={styles.variantLabel}>
                  {attr.name}
                  {selectedOptions[attr.id] && (
                    <>: <strong>
                      {attr.optionValues.find(ov => ov.id === selectedOptions[attr.id])?.displayValue
                        ?? attr.optionValues.find(ov => ov.id === selectedOptions[attr.id])?.value}
                    </strong></>
                  )}
                </p>
                <div className={styles.variantButtons}>
                  {attr.optionValues.map(ov => (
                    <button
                      key={ov.id}
                      type="button"
                      onClick={() => selectOption(attr.id, ov.id)}
                      className={`${styles.variantBtn} ${selectedOptions[attr.id] === ov.id ? styles.variantActive : ""}`}
                    >
                      {ov.displayValue ?? ov.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SKU */}
        {activeSku && (
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
            {t.skuLabel} {activeSku}
          </p>
        )}

        {/* Quantity row */}
        {!inCart && (
          <div className={styles.qtyRow}>
            <span className={styles.qtyLabel}>{t.quantity}</span>
            <div className={styles.qtyControl}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className={styles.qtyBtn} disabled={mutating}>−</button>
              <span className={styles.qty}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className={styles.qtyBtn} disabled={mutating}>+</button>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className={styles.actions}>
          {activeId ? (
            <AddToCartButton
              variantId={activeId}
              initialQty={qty}
              size="lg"
              className={styles.addToCartWrap}
              selectedOptionValueIds={selectedOptionValueIds.length ? selectedOptionValueIds : undefined}
            />
          ) : (
            <button className={`${styles.addToCartBtn} ${styles.lg}`} disabled>
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
          disabled={mutating || buyingNow || !activeId}
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
