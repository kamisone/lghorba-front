"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import shopStyles from "../Shop.module.css";
import styles from "./Search.module.css";
import SearchAutocomplete from "@/components/shop/SearchAutocomplete";
import { getTranslations } from "@/lib/i18n";

interface Hit {
  id: string;
  slug: string;
  title: string;
  brand?: string;
  minPriceCents?: number;
  featuredImageUrl?: string;
}

interface SearchResponse {
  hits: Hit[];
  total: number;
  facets: { brand?: Record<string, number> };
  processingTimeMs: number;
}

export default function ShopSearchPage({ params }: { params: { locale: string } }) {
  const t      = getTranslations(params.locale).shop;
  const router = useRouter();
  const searchParams = useSearchParams();
  const q            = searchParams.get("q") ?? "";
  const brand        = searchParams.get("brand") ?? "";
  const minPrice     = searchParams.get("minPrice") ?? "";
  const maxPrice     = searchParams.get("maxPrice") ?? "";
  const page         = Number(searchParams.get("page") ?? "1");

  const [data, setData]       = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ q, page: String(page) });
      if (brand)    qs.set("brand",    brand);
      if (minPrice) qs.set("minPrice", minPrice);
      if (maxPrice) qs.set("maxPrice", maxPrice);
      const res = await fetch(`/next-api/public/shop/search?${qs}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [q, brand, minPrice, maxPrice, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  function pushQuery(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    p.set("page", "1");
    router.push(`/${params.locale}/shop/search?${p.toString()}`);
  }

  const brands     = Object.entries(data?.facets?.brand ?? {}).sort((a, b) => b[1] - a[1]);
  const totalPages = data ? Math.ceil(data.total / 24) : 1;

  return (
    <>
      {/* ── Hero — identical structure to /shop ── */}
      <div className={shopStyles.shopHero}>
        <div className={shopStyles.heroBgGrid} aria-hidden="true" />
        <div className={shopStyles.heroGlowLime} aria-hidden="true" />
        <div className={shopStyles.heroGlowBlue} aria-hidden="true" />
        <div className={shopStyles.heroContent}>
          <p className={shopStyles.heroEyebrow}>{t.searchEyebrow}</p>
          <h1 className={shopStyles.heroTitle}>
            {t.searchHeroTitle} <span className={shopStyles.heroAccent}>{t.searchHeroAccent}</span>
          </h1>
          {q
            ? <p className={shopStyles.heroSub}>{t.searchResultsFor} &ldquo;{q}&rdquo;</p>
            : <p className={shopStyles.heroSub}>{t.searchSub}</p>
          }
          <div className={shopStyles.heroSearchWrap}>
            <SearchAutocomplete
              locale={params.locale}
              placeholder={t.searchPlaceholder}
              variant="hero"
              initialValue={q}
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={shopStyles.container}>
        {/* Active filter chips */}
        {(brand || minPrice || maxPrice) && (
          <div className={shopStyles.filterBar}>
            {brand && (
              <button onClick={() => pushQuery({ brand: "" })} className={shopStyles.filterChip}>
                {t.filterBrandLabel} {brand} <em className={shopStyles.filterChipX}><X size={14} strokeWidth={2} /></em>
              </button>
            )}
            {(minPrice || maxPrice) && (
              <button onClick={() => pushQuery({ minPrice: "", maxPrice: "" })} className={shopStyles.filterChip}>
                {t.filterPriceLabel} {minPrice ? `€${parseInt(minPrice) / 100}` : ""}
                {minPrice && maxPrice ? " – " : ""}
                {maxPrice ? `€${parseInt(maxPrice) / 100}` : ""}
                <em className={shopStyles.filterChipX}><X size={14} strokeWidth={2} /></em>
              </button>
            )}
          </div>
        )}

        <div className={shopStyles.layout}>
          {/* Sidebar */}
          <aside className={shopStyles.sidebar}>
            <h4 className={shopStyles.sidebarTitle}>{t.filtersBrand}</h4>

            {brands.length > 0 && (
              <div className={styles.filterBlock}>
                <h5 className={styles.filterGroupTitle}>{t.filtersBrand}</h5>
                {brands.map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => pushQuery({ brand: brand === name ? "" : name })}
                    className={`${styles.brandBtn} ${brand === name ? styles.brandBtnActive : ""}`}
                  >
                    {name} <span className={styles.brandCount}>({count})</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.filterBlock}>
              <h5 className={styles.filterGroupTitle}>{t.filtersPrice}</h5>
              <div className={styles.priceRow}>
                <input
                  type="number" placeholder={t.filtersPriceMin}
                  value={minPrice ? String(parseInt(minPrice) / 100) : ""}
                  onChange={e => pushQuery({ minPrice: e.target.value ? String(parseInt(e.target.value) * 100) : "" })}
                  className={styles.priceInput}
                />
                <span className={styles.priceDash}>–</span>
                <input
                  type="number" placeholder={t.filtersPriceMax}
                  value={maxPrice ? String(parseInt(maxPrice) / 100) : ""}
                  onChange={e => pushQuery({ maxPrice: e.target.value ? String(parseInt(e.target.value) * 100) : "" })}
                  className={styles.priceInput}
                />
              </div>
            </div>
          </aside>

          {/* Results */}
          <main>
            <div className={shopStyles.resultsMeta}>
              <p className={shopStyles.resultCount}>
                {loading
                  ? t.searching
                  : data
                    ? `${data.total} ${data.total !== 1 ? t.resultPluralCount : t.resultSingularCount}${q ? ` for "${q}"` : ""}`
                    : ""}
              </p>
              {data && data.processingTimeMs > 0 && (
                <span className={styles.processingTime}>{data.processingTimeMs}ms</span>
              )}
            </div>

            {!loading && data?.hits.length === 0 && (
              <div className={shopStyles.empty}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>{t.noResults}</p>
                <p style={{ fontSize: 14 }}>{t.noResultsTry}</p>
              </div>
            )}

            <div className={shopStyles.productGrid}>
              {(data?.hits ?? []).map(hit => (
                <Link key={hit.id} href={`/${params.locale}/shop/${hit.slug}`} className={shopStyles.productCardLink}>
                  <div className={shopStyles.productImageWrap}>
                    {hit.featuredImageUrl && (
                      <Image src={hit.featuredImageUrl} alt={hit.title} fill sizes="210px" className={shopStyles.productImage} />
                    )}
                  </div>
                  <div className={shopStyles.productInfo}>
                    <p className={shopStyles.productTitle}>{hit.title}</p>
                    {hit.brand && <p className={shopStyles.productBrand}>{hit.brand}</p>}
                    {hit.minPriceCents != null && (
                      <p className={shopStyles.price}>€{(hit.minPriceCents / 100).toFixed(2)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={shopStyles.pagination}>
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => pushQuery({ page: String(p) })}
                    className={p === page ? shopStyles.activePage : shopStyles.pageLink}
                    style={{ border: "none", cursor: "pointer" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
