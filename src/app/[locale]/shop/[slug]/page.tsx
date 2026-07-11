export const revalidate = 300;

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import ShopProductDetail from "./ShopProductDetail";
import RelatedSection from "./RelatedSection";
import StorySideGallery, { StoryGalleryItem } from "./StorySideGallery";
import StoryNarrativeGallery from "./StoryNarrativeGallery";
import storyStyles from "./StoryGallery.module.css";
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

  // Story Gallery — backend already filters to active items with resolved URLs
  const storyGallery: Array<StoryGalleryItem & { location: "side" | "narrative" }> = product.storyGallery ?? [];
  const sideStory      = storyGallery.filter(s => s.location === "side");
  const narrativeStory = storyGallery.filter(s => s.location === "narrative");
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

      {(product.infoSections?.length > 0 || faqs.length > 0 || product.documents?.length > 0 || sideStory.length > 0) && (() => {
        const specsBlock = product.infoSections?.length > 0 && (
          <>
            <h2>{t.specificationsTitle}</h2>
            <div className={styles.specsGrid}>
              {product.infoSections.map((section: { id: string; label: string; value: string }) => (
                <div key={section.id} className={styles.specCard}>
                  <span className={styles.specCardLabel}>{section.label}</span>
                  <span className={styles.specCardValue}>{section.value}</span>
                </div>
              ))}
            </div>
          </>
        );
        const faqBlock = faqs.length > 0 && (
          <>
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
          </>
        );
        const documentsBlock = product.documents?.length > 0 && (
          <div className={styles.documentsList}>
            {product.documents.map((doc: { id: string; title: string; url: string; originalFilename: string; sizeBytes: number }) => (
              <div key={doc.id} className={styles.documentCard}>
                <div className={styles.documentIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className={styles.documentInfo}>
                  <span className={styles.documentTitle}>{doc.title}</span>
                  <span className={styles.documentMeta}>PDF · {(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" download className={styles.documentDownload}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        );
        const hasLeft = !!(specsBlock || faqBlock || documentsBlock);

        // Location 1 — Creative Side Gallery sits to the right of the
        // Specifications, FAQ and Documents sections (sticky while they scroll).
        if (sideStory.length > 0) {
          return (
            <div className={storyStyles.faqStoryRow}>
              {hasLeft && (
                <div className={storyStyles.faqStoryCol}>
                  {specsBlock && <section>{specsBlock}</section>}
                  {faqBlock && <section>{faqBlock}</section>}
                  {documentsBlock && <section>{documentsBlock}</section>}
                </div>
              )}
              <div className={storyStyles.sideStickyCol}>
                <StorySideGallery items={sideStory} ariaLabel={t.storySideAria} />
              </div>
            </div>
          );
        }
        // No side gallery — each section renders full-width as before.
        return (
          <>
            {specsBlock && <div className={styles.specsSectionFull}>{specsBlock}</div>}
            {faqBlock && <div className={styles.faqSectionFull}>{faqBlock}</div>}
            {documentsBlock && <div className={styles.documentsSectionFull}>{documentsBlock}</div>}
          </>
        );
      })()}

      {/* Location 2 — Narrative Gallery, after all product sections */}
      {narrativeStory.length > 0 && (
        <StoryNarrativeGallery
          items={narrativeStory}
          ariaLabel={t.storyNarrativeAria}
          overline={product.storyNarrativeTitle}
        />
      )}

      <Suspense fallback={<RelatedProductsSkeleton />}>
        <RelatedSection slug={params.slug} locale={params.locale} />
      </Suspense>
    </>
  );
}
