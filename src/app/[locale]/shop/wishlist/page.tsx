"use client";

import Link from "next/link";
import Image from "next/image";
import { useWishlist } from "@/components/shop/WishlistContext";
import { getTranslations } from "@/lib/i18n";
import shopStyles from "../Shop.module.css";
import styles from "./Wishlist.module.css";

function centsToEuros(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function WishlistPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = getTranslations(locale).shop;
  const { wishlist, toggle } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{t.wishlistEmpty}</h2>
        <p className={styles.emptySub}>{t.wishlistEmptySub}</p>
        <Link href={`/${locale}/shop`} className={styles.continueBtn}>{t.browseProducts}</Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{t.wishlistPageTitle}</h1>
      <div className={shopStyles.productGrid}>
        {wishlist.map(item => (
          <div key={item.productId} className={shopStyles.productCard}>
            <Link href={`/${locale}/shop/${item.slug}`} className={shopStyles.productImageLink}>
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className={shopStyles.productImage}
                />
              ) : (
                <div className={shopStyles.productImagePlaceholder} />
              )}
              <button
                className={`${shopStyles.wishlistBtn} ${shopStyles.wishlisted}`}
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(item); }}
                aria-label={t.removeFromWishlist}
              >
                ♥
              </button>
            </Link>
            <div className={shopStyles.productInfo}>
              <Link href={`/${locale}/shop/${item.slug}`}>
                <h3 className={shopStyles.productTitle}>{item.title}</h3>
              </Link>
              {item.priceCents != null && (
                <p className={shopStyles.productPrice}>
                  <span className={shopStyles.price}>€{centsToEuros(item.priceCents)}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
