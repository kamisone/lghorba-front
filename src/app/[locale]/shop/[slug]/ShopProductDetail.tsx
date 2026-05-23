"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartContext";
import { useWishlist } from "@/components/shop/WishlistContext";
import AddToCartButton from "@/components/shop/AddToCartButton";
import ProductGallery from "./ProductGallery";
import PromotionBadge, { type PromotionInfo } from "@/components/shop/PromotionBadge";
import { getTranslations } from "@/lib/i18n";
import styles from "./ProductDetail.module.css";

interface Variant {
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
  variants: Variant[];
  categories: Array<{ name: string }>;
}

interface ReviewStats { average: number; count: number }

interface Props {
  product: Product;
  reviewStats: ReviewStats;
  locale: string;
  activePromotion?: PromotionInfo | null;
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

export default function ShopProductDetail({ product, reviewStats, locale, activePromotion }: Props) {
  const { addItem, mutating, cart } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const t = getTranslations(locale).shop;
  const router = useRouter();

  const productGallery = buildProductGallery(product);
  const defaultVariant = product.variants.find(v => v.isDefault) ?? product.variants[0];

  const [selectedVariant, setSelectedVariant] = useState<Variant>(defaultVariant);
  const [activeGallery, setActiveGallery]     = useState<string[]>(
    defaultVariant?.mediaUrls?.length ? defaultVariant.mediaUrls : productGallery
  );
  const [qty, setQty]           = useState(1);
  const [buyingNow, setBuyingNow] = useState(false);
  const [buyError, setBuyError]   = useState("");
  const wishlisted = isWishlisted(product.id);

  const inCart = cart?.items.some(item => item.variantId === selectedVariant.id) ?? false;
  const hasVariantChoice = product.variants.length > 1;

  function handleVariantSelect(v: Variant) {
    setSelectedVariant(v);
    setActiveGallery(v.mediaUrls?.length ? v.mediaUrls : productGallery);
  }

  async function handleBuyNow() {
    setBuyError("");
    setBuyingNow(true);
    const result = await addItem(selectedVariant.id, qty);
    if (result.ok) {
      router.push(`/${locale}/checkout`);
    } else {
      setBuyError(result.message ?? "Could not add to cart");
      setBuyingNow(false);
    }
  }

  const discount = selectedVariant.compareAtPriceCents &&
    selectedVariant.compareAtPriceCents > selectedVariant.priceCents
    ? Math.round((1 - selectedVariant.priceCents / selectedVariant.compareAtPriceCents) * 100)
    : null;

  return (
    <div className={styles.container}>
      {/* Gallery */}
      <div className={styles.galleryCol}>
        <ProductGallery images={activeGallery} title={product.title} />
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
          <span className={styles.price}>€{centsToEuros(selectedVariant.priceCents)}</span>
          {selectedVariant.compareAtPriceCents && selectedVariant.compareAtPriceCents > selectedVariant.priceCents && (
            <span className={styles.comparePrice}>€{centsToEuros(selectedVariant.compareAtPriceCents)}</span>
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

        {/* Variant selector */}
        {hasVariantChoice && (
          <div className={styles.variantSection}>
            <p className={styles.variantLabel}>
              Option: <strong>{selectedVariant.title}</strong>
            </p>
            <div className={styles.variantButtons}>
              {product.variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => handleVariantSelect(v)}
                  className={`${styles.variantBtn} ${v.id === selectedVariant.id ? styles.variantActive : ""}`}
                >
                  {v.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pre-add quantity row — hidden once the variant is in the cart */}
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
          <AddToCartButton
            variantId={selectedVariant.id}
            initialQty={qty}
            size="lg"
            className={styles.addToCartWrap}
          />
          <button
            onClick={() => toggle(product.id)}
            className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ""}`}
            aria-label={wishlisted ? t.removeFromWishlist : t.saveToWishlist}
          >
            {wishlisted ? "♥" : "♡"}
          </button>
        </div>

        <button onClick={handleBuyNow} disabled={mutating || buyingNow} className={styles.buyNowBtn}>
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
