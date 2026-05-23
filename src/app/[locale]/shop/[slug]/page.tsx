export const revalidate = 300;

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import ShopProductDetail from "./ShopProductDetail";
import { getTranslations } from "@/lib/i18n";

interface Props {
  params: { locale: string; slug: string };
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function fetchProduct(slug: string) {
  const res = await fetch(`${API}/public/shop/products/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json();
}

async function fetchReviewStats(slug: string) {
  const res = await fetch(`${API}/public/shop/products/${slug}/review-stats`, { next: { revalidate: 60 } });
  if (!res.ok) return { average: 0, count: 0 };
  return res.json();
}

async function fetchActivePromotion(productId: string) {
  try {
    const res = await fetch(`${API}/public/shop/promotions/for-product?productId=${productId}`, { next: { revalidate: 60 } });
    if (!res.ok || res.status === 204) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchRecommendations(slug: string) {
  try {
    const res = await fetch(`${API}/public/shop/products/${slug}/recommendations`, { next: { revalidate: 3600 } });
    if (!res.ok || res.status === 204) return { frequentlyBoughtTogether: [], similar: [] };
    return await res.json();
  } catch {
    return { frequentlyBoughtTogether: [], similar: [] };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.seoTitle ?? product.title,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    openGraph: {
      title: product.seoTitle ?? product.title,
      images: product.featuredImageUrl ? [{ url: product.featuredImageUrl }] : [],
    },
  };
}

async function fetchProductLocale(slug: string, locale: string) {
  const lang = locale !== 'fr' ? `?lang=${locale}` : '';
  const res = await fetch(`${API}/public/shop/products/${slug}${lang}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProductPage({ params }: Props) {
  const t = getTranslations(params.locale).shop;
  const [product, reviewStats, recommendations] = await Promise.all([
    fetchProductLocale(params.slug, params.locale),
    fetchReviewStats(params.slug),
    fetchRecommendations(params.slug),
  ]);

  const promotion = product ? await fetchActivePromotion(product.id) : null;

  if (!product) notFound();

  const defaultVariant = product.variants?.find((v: any) => v.isDefault) ?? product.variants?.[0];

  // Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.featuredImageUrl ? [product.featuredImageUrl] : undefined,
    sku: defaultVariant?.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: product.variants?.map((v: any) => ({
      "@type": "Offer",
      sku: v.sku,
      price: (v.priceCents / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `https://lghorba.com/${params.locale}/shop/${product.slug}`,
    })),
    aggregateRating: reviewStats.count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: reviewStats.average,
      reviewCount: reviewStats.count,
    } : undefined,
  };

  const fbt     = recommendations.frequentlyBoughtTogether ?? [];
  const similar = recommendations.similar ?? [];

  return (
    <>
      <Script id="product-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <ShopProductDetail
        product={product}
        reviewStats={reviewStats}
        locale={params.locale}
        activePromotion={promotion}
      />

      {/* Recommendations */}
      {(fbt.length > 0 || similar.length > 0) && (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 64px" }}>
          {fbt.length > 0 && (
            <RecommendationRow title={t.customersAlsoBought} items={fbt} locale={params.locale} />
          )}
          {similar.length > 0 && (
            <RecommendationRow title={t.similarProducts} items={similar} locale={params.locale} />
          )}
        </div>
      )}
    </>
  );
}

function RecommendationRow({ title, items, locale }: { title: string; items: any[]; locale: string }) {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {items.map((p: any) => (
          <a key={p.id} href={`/${locale}/shop/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              {p.featuredImageKey && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/next-api/public/shop/products/${p.slug}/image`}
                  alt={p.title}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
                />
              )}
              <div style={{ padding: 12 }}>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>{p.title}</p>
                {p.minPriceCents != null && (
                  <p style={{ margin: "4px 0 0", fontWeight: 700 }}>€{(p.minPriceCents / 100).toFixed(2)}</p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
