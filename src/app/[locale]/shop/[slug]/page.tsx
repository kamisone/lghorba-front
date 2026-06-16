export const revalidate = 300;

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import ShopProductDetail from "./ShopProductDetail";
import RelatedSection from "./RelatedSection";
import RelatedProductsSkeleton from "@/components/shop/RelatedProductsSkeleton";
import { getTranslations } from "@/lib/i18n";
import styles from "./ProductDetail.module.css";
import type { AvailabilityMatrix } from "@/components/shop/ProductVariantSelector";

interface Props {
  params: { locale: string; slug: string };
  searchParams?: { v?: string };
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function fetchProduct(slug: string, locale: string) {
  const lang = locale !== "fr" ? `?lang=${locale}` : "";
  const res = await fetch(`${API}/public/shop/products/${slug}${lang}`, {
    next: { revalidate: 300, tags: ["products", `product-${slug}`] },
  });
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

async function fetchAvailabilityMatrix(slug: string, locale: string): Promise<AvailabilityMatrix | null> {
  try {
    const lang = locale !== "fr" ? `?lang=${locale}` : "";
    const res = await fetch(`${API}/public/shop/products/${slug}/variants/availability${lang}`, {
      next: { revalidate: 60, tags: ["products", `product-${slug}`] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const product = await fetchProduct(params.slug, params.locale);
  if (!product) return { title: "Product Not Found" };

  // Variant-specific metadata when ?v= is present
  let variantTitle = product.seoTitle ?? product.title;
  let variantDesc  = product.seoDescription ?? product.shortDescription ?? undefined;
  let variantImage = product.featuredImageUrl;

  if (searchParams?.v) {
    const matrix = await fetchAvailabilityMatrix(params.slug, params.locale);
    const variant = matrix?.variants.find(v => v.variantSlug === searchParams.v);
    if (variant) {
      variantTitle = `${product.title} — ${variant.title ?? searchParams.v}`;
      if (variant.featuredMediaUrl) variantImage = variant.featuredMediaUrl;
    }
  }

  return {
    title: variantTitle,
    description: variantDesc,
    openGraph: {
      title: variantTitle,
      images: variantImage ? [{ url: variantImage }] : [],
    },
    alternates: {
      canonical: `/${params.locale}/shop/${params.slug}${searchParams?.v ? `?v=${searchParams.v}` : ""}`,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const t = getTranslations(params.locale).shop;
  const [product, reviewStats, availabilityMatrix] = await Promise.all([
    fetchProduct(params.slug, params.locale),
    fetchReviewStats(params.slug),
    fetchAvailabilityMatrix(params.slug, params.locale),
  ]);

  const promotion = product ? await fetchActivePromotion(product.id) : null;

  if (!product) notFound();

  const initialVariantSlug = searchParams?.v ?? null;
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
    offers: (availabilityMatrix?.variants ?? product.variants)?.map((v: any) => ({
      "@type": "Offer",
      sku: v.sku,
      price: ((v.priceCents) / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: v.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://lghorba.com/${params.locale}/shop/${product.slug}${v.variantSlug ? `?v=${v.variantSlug}` : ""}`,
    })),
    aggregateRating: reviewStats.count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: reviewStats.average,
      reviewCount: reviewStats.count,
    } : undefined,
  };

  // FAQPage JSON-LD — backend already filters to active, non-empty FAQs
  const faqs: Array<{ question: string; answer: string }> = product.faqs ?? [];
  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  return (
    <>
      <Script id="product-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      {faqJsonLd && (
        <Script id="product-faq-jsonld" type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </Script>
      )}
      <ShopProductDetail
        product={product}
        reviewStats={reviewStats}
        locale={params.locale}
        activePromotion={promotion}
        availabilityMatrix={availabilityMatrix}
        initialVariantSlug={initialVariantSlug}
      />

      {faqs.length > 0 && (
        <div className={styles.faqSectionFull}>
          <h2>{t.faqTitle}</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <details key={i} className={styles.faqItem}>
                <summary className={styles.faqToggle}>
                  <span className={styles.faqQuestion}>{faq.question}</span>
                  <span className={styles.faqChevron} aria-hidden="true" />
                </summary>
                <div className={styles.faqAnswer}>{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      )}

      <Suspense fallback={<RelatedProductsSkeleton />}>
        <RelatedSection slug={params.slug} locale={params.locale} />
      </Suspense>
    </>
  );
}
