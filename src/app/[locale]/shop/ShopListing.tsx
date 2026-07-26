"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWishlist } from "@/components/shop/WishlistContext";
import AddToCartButton from "@/components/shop/AddToCartButton";
import PromotionBadge, { type PromotionInfo } from "@/components/shop/PromotionBadge";
import { getTranslations } from "@/lib/i18n";
import { buildCategoryTree, getAncestorIds, type CategoryNode as BaseCategoryNode } from "@/lib/shop/categoryTree";
import styles from "./Shop.module.css";

interface Product {
  id: string;
  slug: string;
  title: string;
  featuredImageUrl: string | null;
  /** Featured + gallery images for the card's hover/arrow image switcher */
  cardImageUrls?: string[];
  outOfStock?: boolean;
  defaultVariantOutOfStock?: boolean;
  freeShipping?: boolean;
  variants: Array<{ id: string; priceCents: number; compareAtPriceCents: number | null; isDefault: boolean }>;
}
interface Category { id: string; name: string; slug: string; parentId?: string | null }
type CategoryNode = BaseCategoryNode<Category>;
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

function CategoryTreeItem({
  node, activeCategory, expanded, onToggle, buildUrl, t,
}: {
  node: CategoryNode;
  activeCategory?: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  buildUrl: (params: Record<string, string | undefined>) => string;
  t: { expandCategory: string; collapseCategory: string };
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isActive = activeCategory === node.id;

  return (
    <li>
      <div className={styles.categoryRow}>
        <Link
          href={buildUrl({ category: node.id, page: "1" })}
          className={`${styles.categoryLink} ${isActive ? styles.activeCategory : ""}`}
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            className={styles.categoryToggle}
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? t.collapseCategory : t.expandCategory}
          >
            <ChevronRight size={16} strokeWidth={2} className={isOpen ? styles.categoryToggleIconOpen : ""} />
          </button>
        )}
      </div>
      {hasChildren && (
        <div className={`${styles.categoryChildren} ${isOpen ? styles.categoryChildrenOpen : ""}`}>
          <ul className={styles.categorySublist}>
            {node.children.map(child => (
              <CategoryTreeItem
                key={child.id}
                node={child}
                activeCategory={activeCategory}
                expanded={expanded}
                onToggle={onToggle}
                buildUrl={buildUrl}
                t={t}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
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
  priority = false,
}: {
  product: Product;
  locale: string;
  promotion: PromotionInfo | null;
  priority?: boolean;
}) {
  const { toggle, isWishlisted } = useWishlist();
  const t = getTranslations(locale).shop;
  const defaultVariant = product.variants.find(v => v.isDefault) ?? product.variants[0];
  const wishlisted = isWishlisted(product.id);
  const isOnSale = !!(defaultVariant?.compareAtPriceCents && defaultVariant.compareAtPriceCents > defaultVariant.priceCents);
  const outOfStock = !!product.outOfStock;
  const defaultVariantOos = !!product.defaultVariantOutOfStock;

  // Card image switcher: desktop scrubs by cursor position, mobile uses arrows
  const images = product.cardImageUrls?.length
    ? product.cardImageUrls
    : product.featuredImageUrl ? [product.featuredImageUrl] : [];
  const multiImage = images.length > 1;
  const [imageIndex, setImageIndex] = useState(0);
  // Secondary images mount (and load) only after the first interaction
  const [imagesActivated, setImagesActivated] = useState(false);

  // Pointer (not mouse) events: taps on touch screens fire synthetic mousemove/
  // mouseleave on the link right before the arrow's click, which would scrub to
  // the tap position and break the arrows. pointerType lets us scrub mice only.
  function handleImageScrub(e: React.PointerEvent<HTMLElement>) {
    if (!multiImage || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(images.length - 1, Math.max(0, Math.floor(ratio * images.length)));
    setImagesActivated(true);
    setImageIndex(idx);
  }

  function handleScrubEnd(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse") setImageIndex(0);
  }

  function stepImage(e: React.MouseEvent, direction: 1 | -1) {
    e.preventDefault();
    e.stopPropagation();
    setImagesActivated(true);
    setImageIndex(i => (i + direction + images.length) % images.length);
  }

  return (
    <div className={styles.productCard}>
      <Link
        href={`/${locale}/shop/${product.slug}`}
        className={styles.productImageLink}
        onPointerMove={multiImage ? handleImageScrub : undefined}
        onPointerLeave={multiImage ? handleScrubEnd : undefined}
      >
        {images.length > 0 ? (
          images.map((url, i) => (i === 0 || imagesActivated) && (
            <Image
              key={url}
              src={url}
              alt={i === 0 ? product.title : `${product.title} — ${i + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={`${styles.productImage} ${multiImage ? styles.productImageLayer : ""} ${i === imageIndex ? "" : styles.productImageHidden}`}
              priority={priority && i === 0}
            />
          ))
        ) : (
          <div className={styles.productImagePlaceholder} />
        )}

        {multiImage && (
          <span className={styles.imageDots} aria-hidden="true">
            {images.map((_, i) => (
              <span key={i} className={`${styles.imageDot} ${i === imageIndex ? styles.imageDotActive : ""}`} />
            ))}
          </span>
        )}

        {multiImage && (
          <>
            <button
              type="button"
              className={`${styles.imageArrow} ${styles.imageArrowLeft}`}
              onClick={e => stepImage(e, -1)}
              aria-label={t.prevImage}
            >
              <ChevronLeft size={16} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              className={`${styles.imageArrow} ${styles.imageArrowRight}`}
              onClick={e => stepImage(e, 1)}
              aria-label={t.nextImage}
            >
              <ChevronRight size={16} strokeWidth={2.25} />
            </button>
          </>
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

        {/* Own corner rather than the priority chain above: free delivery is a
            different promise from a discount, and the two should both be visible. */}
        {product.freeShipping && !outOfStock && (
          <span className={styles.freeShipBadge}>{t.freeShippingBadge}</span>
        )}

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
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const categoryPath = useMemo(() => {
    if (!activeCategory) return [] as Category[];
    const byId = new Map(categories.map(c => [c.id, c]));
    const ancestors = getAncestorIds(categories, activeCategory)
      .slice().reverse()
      .map(id => byId.get(id))
      .filter((c): c is Category => !!c);
    const current = byId.get(activeCategory);
    return current ? [...ancestors, current] : ancestors;
  }, [categories, activeCategory]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(getAncestorIds(categories, activeCategory)),
  );

  useEffect(() => {
    setExpanded(new Set(getAncestorIds(categories, activeCategory)));
  }, [categories, activeCategory]);

  function toggleCategory(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
                <Link
                  href={buildUrl({ category: undefined, page: "1" })}
                  className={`${styles.categoryLink} ${!activeCategory ? styles.activeCategory : ""}`}
                >
                  {t.allProducts}
                </Link>
              </li>
              {categoryTree.map(node => (
                <CategoryTreeItem
                  key={node.id}
                  node={node}
                  activeCategory={activeCategory}
                  expanded={expanded}
                  onToggle={toggleCategory}
                  buildUrl={buildUrl}
                  t={t}
                />
              ))}
            </ul>
          </aside>

          {/* Grid */}
          <div className={styles.main}>
            {categoryPath.length > 0 && (
              <nav className={styles.breadcrumbs} aria-label={t.categoriesLabel}>
                <Link href={buildUrl({ category: undefined, page: "1" })} className={styles.breadcrumbLink}>
                  {t.allProducts}
                </Link>
                {categoryPath.map((cat, i) => (
                  <span key={cat.id} className={styles.breadcrumbSegment}>
                    <ChevronRight size={14} strokeWidth={2} className={styles.breadcrumbSep} />
                    {i === categoryPath.length - 1 ? (
                      <span className={styles.breadcrumbCurrent}>{cat.name}</span>
                    ) : (
                      <Link href={buildUrl({ category: cat.id, page: "1" })} className={styles.breadcrumbLink}>
                        {cat.name}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <p className={styles.resultCount}>{total} {total !== 1 ? t.resultPlural : t.resultSingular}</p>

            {products.length === 0 ? (
              <div className={styles.empty}>{t.noProductsFound}</div>
            ) : (
              <div className={styles.productGrid}>
                {products.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    locale={locale}
                    promotion={resolvePromotion(p, activePromotions, activeCategory)}
                    priority={i < 4}
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
