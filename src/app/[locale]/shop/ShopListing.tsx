"use client";

import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { useWishlist } from "@/components/shop/WishlistContext";
import AddToCartButton from "@/components/shop/AddToCartButton";
import PromotionBadge, { type PromotionInfo } from "@/components/shop/PromotionBadge";
import { getTranslations } from "@/lib/i18n";
import styles from "./Shop.module.css";

interface Product {
  id: string;
  slug: string;
  title: string;
  featuredImageUrl: string | null;
  outOfStock?: boolean;
  defaultVariantOutOfStock?: boolean;
  variants: Array<{ id: string; priceCents: number; compareAtPriceCents: number | null; isDefault: boolean }>;
}
interface Category { id: string; name: string; slug: string }
interface Collection { id: string; slug: string; name: string; imageUrl: string | null }

interface ActivePromotion {
  id: string;
  name: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  discountValue: number;
  scope: "site_wide" | "category" | "product";
  linkedCategoryIds: string[];
  linkedProductIds: string[];
}

interface Props {
  locale: string;
  products: Product[];
  total: number;
  categories: Category[];
  featuredCollections: Collection[];
  activePromotions: ActivePromotion[];
  page: number;
  limit: number;
  activeCategory?: string;
  activeTag?: string;
  activeSearch?: string;
}

function centsToEuros(cents: number) {
  return (cents / 100).toFixed(2);
}

function resolvePromotion(
  product: Product,
  promotions: ActivePromotion[],
  activeCategory?: string,
): PromotionInfo | null {
  for (const promo of promotions) {
    if (promo.scope === "site_wide") return promo;
    if (promo.scope === "product" && promo.linkedProductIds.includes(product.id)) return promo;
    // When browsing by a specific category, all products shown are in that category
    if (promo.scope === "category" && activeCategory && promo.linkedCategoryIds.includes(activeCategory)) return promo;
  }
  return null;
}

function ProductCard({
  product,
  locale,
  promotion,
}: {
  product: Product;
  locale: string;
  promotion: PromotionInfo | null;
}) {
  const { toggle, isWishlisted } = useWishlist();
  const t = getTranslations(locale).shop;
  const defaultVariant = product.variants.find(v => v.isDefault) ?? product.variants[0];
  const wishlisted = isWishlisted(product.id);
  const isOnSale = !!(defaultVariant?.compareAtPriceCents && defaultVariant.compareAtPriceCents > defaultVariant.priceCents);
  const outOfStock = !!product.outOfStock;
  const defaultVariantOos = !!product.defaultVariantOutOfStock;

  return (
    <div className={styles.productCard}>
      <Link href={`/${locale}/shop/${product.slug}`} className={styles.productImageLink}>
        {product.featuredImageUrl ? (
          <Image
            src={product.featuredImageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={styles.productImage}
          />
        ) : (
          <div className={styles.productImagePlaceholder} />
        )}

        {outOfStock && <div className={styles.outOfStockOverlay} aria-hidden="true" />}

        {/* Badge priority: out-of-stock > promotion > sale */}
        {outOfStock ? (
          <span className={styles.outOfStockBadge}>{t.outOfStock}</span>
        ) : promotion ? (
          <span className={styles.promoBadgeWrap}>
            <PromotionBadge promotion={promotion} size="sm" />
          </span>
        ) : isOnSale ? (
          <span className={styles.saleBadge}>{t.sale}</span>
        ) : null}

        <button
          className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ""}`}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            toggle({
              productId: product.id,
              slug: product.slug,
              title: product.title,
              imageUrl: product.featuredImageUrl,
              priceCents: defaultVariant?.priceCents ?? null,
            });
          }}
          aria-label={wishlisted ? t.removeFromWishlist : t.addToWishlist}
        >
          {wishlisted ? "♥" : "♡"}
        </button>
      </Link>
      <div className={styles.productInfo}>
        <h3 className={styles.productTitle}>{product.title}</h3>
        {defaultVariant && (
          <div className={styles.productPrice}>
            {isOnSale && !outOfStock && <span className={styles.comparePrice}>€{centsToEuros(defaultVariant.compareAtPriceCents!)}</span>}
            <span className={styles.price}>€{centsToEuros(defaultVariant.priceCents)}</span>
          </div>
        )}
        {outOfStock ? (
          <div className={styles.outOfStockBtn}>{t.outOfStock}</div>
        ) : defaultVariantOos ? (
          <Link href={`/${locale}/shop/${product.slug}`} className={styles.seeDetailsBtn}>
            {t.seeDetails}
          </Link>
        ) : defaultVariant?.id ? (
          <AddToCartButton
            variantId={defaultVariant.id}
            size="sm"
            className={styles.cardAddToCart}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ShopListing({
  locale, products, total, categories, featuredCollections,
  activePromotions, page, limit, activeCategory, activeSearch,
}: Props) {
  const t = getTranslations(locale).shop;
  const totalPages = Math.ceil(total / limit);
  const activeLabel = categories.find(c => c.id === activeCategory)?.name;

  function buildUrl(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams();
    const merged = { category: activeCategory, search: activeSearch, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return `/${locale}/shop${qs.toString() ? `?${qs}` : ""}`;
  }

  const showCollections = featuredCollections.length > 0 && !activeCategory && !activeSearch && page === 1;

  return (
    <>
      {/* ── Page content ── */}
      <div className={styles.container}>
        {/* Collections banner */}
        {showCollections && (
          <div id="collections" className={styles.collectionsSection}>
            <h2 className={styles.sectionLabel}>{t.collectionsLabel}</h2>
            <div className={styles.collectionsRow}>
              {featuredCollections.slice(0, 4).map(c => (
                <Link key={c.id} href={`/${locale}/shop/collections/${c.slug}`} className={styles.collectionCard}>
                  {c.imageUrl && <Image src={c.imageUrl} alt={c.name} fill sizes="25vw" className={styles.collectionImage} />}
                  <div className={styles.collectionOverlay} />
                  <span className={styles.collectionName}>{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <h4 className={styles.sidebarTitle}>{t.categoriesLabel}</h4>
            <ul className={styles.categoryList}>
              <li>
                <Link href={buildUrl({ category: undefined, page: "1" })} className={!activeCategory ? styles.activeCategory : ""}>
                  {t.allProducts}
                </Link>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <Link
                    href={buildUrl({ category: cat.id, page: "1" })}
                    className={activeCategory === cat.id ? styles.activeCategory : ""}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          {/* Grid */}
          <div className={styles.main}>
            {activeLabel && (
              <div className={styles.filterBar}>
                <Link href={buildUrl({ category: undefined, page: "1" })} className={styles.filterChip}>
                  {activeLabel} <em className={styles.filterChipX}><X size={14} strokeWidth={2} /></em>
                </Link>
              </div>
            )}

            <p className={styles.resultCount}>{total} {total !== 1 ? t.resultPlural : t.resultSingular}</p>

            {products.length === 0 ? (
              <div className={styles.empty}>{t.noProductsFound}</div>
            ) : (
              <div className={styles.productGrid}>
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    locale={locale}
                    promotion={resolvePromotion(p, activePromotions, activeCategory)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Link
                    key={i + 1}
                    href={buildUrl({ page: String(i + 1) })}
                    className={page === i + 1 ? styles.activePage : styles.pageLink}
                  >
                    {i + 1}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
