import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/i18n";
import RelatedProductsCarousel, { type RelatedProduct } from "@/components/shop/RelatedProductsCarousel";
import cstyles from "@/components/shop/RelatedProductsCarousel.module.css";
import styles from "./RelatedSection.module.css";

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function fetchRecommendations(slug: string) {
  try {
    const res = await fetch(`${API}/public/shop/products/${slug}/recommendations`, { next: { revalidate: 3600 } });
    if (!res.ok || res.status === 204) return { frequentlyBoughtTogether: [], similar: [] };
    return await res.json();
  } catch {
    return { frequentlyBoughtTogether: [], similar: [] };
  }
}

function centsToEuros(cents: number) {
  return (cents / 100).toFixed(2);
}

interface Props {
  slug: string;
  locale: string;
}

export default async function RelatedSection({ slug, locale }: Props) {
  const t = getTranslations(locale).shop;
  const recommendations = await fetchRecommendations(slug);
  const fbt: RelatedProduct[] = recommendations.frequentlyBoughtTogether ?? [];
  const similar: RelatedProduct[] = recommendations.similar ?? [];

  return (
    <>
      {fbt.length > 0 && (
        <section className={styles.section} aria-label={t.customersAlsoBought}>
          <div className={styles.header}>
            <h2 className={styles.title}>{t.customersAlsoBought}</h2>
          </div>
          <div className={styles.grid}>
            {fbt.map(p => (
              <Link key={p.id} href={`/${locale}/shop/${p.slug}`} className={cstyles.card}>
                <div className={cstyles.imageWrap}>
                  {p.featuredImageUrl ? (
                    <Image
                      src={p.featuredImageUrl}
                      alt={p.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 560px) 45vw, (max-width: 860px) 30vw, 22vw"
                      className={cstyles.image}
                    />
                  ) : (
                    <div className={cstyles.imagePlaceholder} />
                  )}
                </div>
                <div className={cstyles.info}>
                  <h3 className={cstyles.cardTitle}>{p.title}</h3>
                  {p.minPriceCents != null && (
                    <div className={cstyles.priceRow}>
                      <span className={cstyles.price}>€{centsToEuros(p.minPriceCents)}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <RelatedProductsCarousel
          items={similar}
          locale={locale}
          labels={{
            title: t.relatedProductsTitle,
            subtitle: t.relatedProductsSubtitle,
            viewProduct: t.viewProduct,
            prev: t.prevRelatedProducts,
            next: t.nextRelatedProducts,
            goToProduct: t.goToProduct,
            addToWishlist: t.addToWishlist,
            removeFromWishlist: t.removeFromWishlist,
            freeShipping: t.freeShippingBadge,
          }}
        />
      )}
    </>
  );
}
