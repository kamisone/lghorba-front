export const revalidate = 120;

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import styles from "./Collection.module.css";

interface Props { params: { locale: string; slug: string } }

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function fetchCollection(slug: string, locale?: string) {
  const lang = locale && locale !== 'fr' ? `?lang=${locale}` : '';
  const res = await fetch(`${API}/public/shop/collections/${slug}${lang}`, { next: { revalidate: 120, tags: ["collections", `collection-${slug}`] } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const col = await fetchCollection(params.slug, params.locale);
  if (!col) return { title: "Collection Not Found" };
  return {
    title: col.seoTitle ?? col.name,
    description: col.seoDescription ?? col.description ?? undefined,
    keywords: col.metaKeywords ?? undefined,
  };
}

export default async function CollectionPage({ params }: Props) {
  const t = getTranslations(params.locale).shop;
  const collection = await fetchCollection(params.slug, params.locale);
  if (!collection) notFound();

  const productIds: string[] = (collection.products ?? []).map((p: any) => p.productId as string);

  let products: any[] = [];
  if (productIds.length > 0) {
    const qs = new URLSearchParams({ limit: "50" });
    const res = await fetch(`${API}/public/shop/products?${qs}`, { next: { revalidate: 60, tags: ["products", "collections"] } });
    if (res.ok) {
      const data = await res.json();
      const idSet = new Set(productIds);
      products = (Array.isArray(data.items) ? data.items : []).filter((p: any) => idSet.has(p.id));
    }
  }

  return (
    <div className={styles.container}>
      {/* Hero */}
      <div className={styles.hero}>
        {collection.imageUrl && (
          <Image src={collection.imageUrl} alt={collection.name} fill className={styles.heroImage} />
        )}
        <div className={styles.heroOverlay}>
          <h1 className={styles.heroTitle}>{collection.name}</h1>
          {collection.description && (
            <p className={styles.heroDesc}>{collection.description}</p>
          )}
        </div>
      </div>

      {collection.heroCopy && (
        <p className={styles.heroCopy}>{collection.heroCopy}</p>
      )}

      {products.length === 0 ? (
        <p className={styles.empty}>{t.collectionEmpty}</p>
      ) : (
        <div className={styles.productGrid}>
          {products.map((p: any) => {
            const defaultV = p.variants?.find((v: any) => v.isDefault) ?? p.variants?.[0];
            return (
              <Link key={p.id} href={`/${params.locale}/shop/${p.slug}`} className={styles.productCard}>
                <div className={styles.productImageWrap}>
                  {p.featuredImageUrl && (
                    <Image src={p.featuredImageUrl} alt={p.title} fill sizes="210px" className={styles.productImage} />
                  )}
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.productTitle}>{p.title}</p>
                  {defaultV && (
                    <p className={styles.productPrice}>€{(defaultV.priceCents / 100).toFixed(2)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {collection.bodyHtml && (
        <div
          className={styles.bodyHtml}
          dangerouslySetInnerHTML={{ __html: collection.bodyHtml }}
        />
      )}
    </div>
  );
}
