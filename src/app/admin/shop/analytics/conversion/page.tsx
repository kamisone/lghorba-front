"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import {
  DateRangeFilter,
  FilterSelect,
  ProductPicker,
  dateRangeToQuery,
  useUrlFilters,
} from "@/components/admin/shop/AnalyticsFilters";

interface Funnel {
  days: number;
  views: number;
  addsToCart: number;
  checkoutsStarted: number;
  purchases: number;
  viewToCartRatePct: number;
  cartToCheckoutRatePct: number;
  checkoutToPurchaseRatePct: number;
  overallConversionRatePct: number;
}

interface ProductConversion {
  productId: string;
  title: string;
  slug: string;
  views: number;
  addsToCart: number;
  purchases: number;
  conversionRatePct: number;
}

interface CountryBreakdown {
  countryCode: string;
  countryName: string;
  views: number;
  addsToCart: number;
  purchases: number;
}

interface CountryOption {
  isoCode: string;
  name: string;
  continentCode: string | null;
}

const FUNNEL_STEPS: Array<{ key: keyof Funnel; label: string; color: string }> = [
  { key: "views",            label: "Product Views",    color: "#1d4ed8" },
  { key: "addsToCart",       label: "Added to Cart",    color: "#0891b2" },
  { key: "checkoutsStarted", label: "Checkout Started", color: "#059669" },
  { key: "purchases",        label: "Purchased",        color: "#7c3aed" },
];

const CONTINENTS: Array<{ value: string; label: string }> = [
  { value: "AF", label: "Africa" },
  { value: "AS", label: "Asia" },
  { value: "EU", label: "Europe" },
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "OC", label: "Oceania" },
  { value: "AN", label: "Antarctica" },
];

// Stable default reference for useUrlFilters.
const DEFAULTS = {
  range: "30",
  startDate: "",
  endDate: "",
  country: "",
  continent: "",
  product: "",
};

export default function ConversionAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <ConversionAnalytics />
    </Suspense>
  );
}

function ConversionAnalytics() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const [funnel, setFunnel]     = useState<Funnel | null>(null);
  const [products, setProducts] = useState<ProductConversion[]>([]);
  const [countries, setCountries] = useState<CountryBreakdown[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [loading, setLoading]   = useState(true);

  // Country dropdown options (loaded once).
  useEffect(() => {
    fetch("/next-api/admin/shop/countries")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCountryOptions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Build the shared query string from the current filters.
  const query = useMemo(() => {
    const params = new URLSearchParams(
      dateRangeToQuery(filters.range, filters.startDate, filters.endDate),
    );
    if (filters.country) params.set("countryCode", filters.country);
    else if (filters.continent) params.set("continent", filters.continent);
    if (filters.product) params.set("productId", filters.product);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/next-api/admin/shop/analytics/conversion-funnel?${query}`).then(r => r.ok ? r.json() : null),
      fetch(`/next-api/admin/shop/analytics/conversion-by-product?${query}&limit=20`).then(r => r.ok ? r.json() : []),
      fetch(`/next-api/admin/shop/analytics/country-breakdown?${query}&limit=20`).then(r => r.ok ? r.json() : []),
    ]).then(([funnelData, productData, countryData]) => {
      setFunnel(funnelData);
      setProducts(Array.isArray(productData) ? productData : []);
      setCountries(Array.isArray(countryData) ? countryData : []);
    }).finally(() => setLoading(false));
  }, [query]);

  const maxCount = funnel ? Math.max(funnel.views, 1) : 1;

  const countrySelectOptions = useMemo(
    () => countryOptions.map((c) => ({ value: c.isoCode, label: c.name })),
    [countryOptions],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Conversion Analytics</h1>
      </div>

      <div className={styles.filterBar}>
        <DateRangeFilter
          range={filters.range}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onChange={setFilters}
        />
        <ProductPicker value={filters.product} onChange={(v) => setFilters({ product: v })} />
        {/* Selecting a country clears the continent scope and vice versa. */}
        <FilterSelect
          label="Continent"
          value={filters.continent}
          onChange={(v) => setFilters({ continent: v, country: "" })}
          options={CONTINENTS}
          allLabel="All continents"
        />
        <FilterSelect
          label="Country"
          value={filters.country}
          onChange={(v) => setFilters({ country: v, continent: "" })}
          options={countrySelectOptions}
          allLabel="All countries"
        />
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading || !funnel ? Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Product Views</div><div className={styles.kpiValue}>{funnel.views}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Added to Cart</div><div className={styles.kpiValue}>{funnel.addsToCart}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Checkouts Started</div><div className={styles.kpiValue}>{funnel.checkoutsStarted}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Purchases</div><div className={styles.kpiValue}>{funnel.purchases}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Overall Conversion</div><div className={styles.kpiValue}>{funnel.overallConversionRatePct}%</div></div>
          </>
        )}
      </div>

      {!loading && funnel && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Funnel — Last {funnel.days} days</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {FUNNEL_STEPS.map((step, i) => {
              const count = funnel[step.key] as number;
              const widthPct = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 2 : 0) : 0;
              const prevCount = i > 0 ? (funnel[FUNNEL_STEPS[i - 1].key] as number) : null;
              const stepRatePct = prevCount ? Math.round((count / prevCount) * 1000) / 10 : null;
              return (
                <div key={step.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{step.label}</span>
                    <span style={{ color: "#6b7280" }}>
                      {count}
                      {stepRatePct !== null && <span style={{ marginLeft: 8, color: "#9ca3af" }}>({stepRatePct}% of previous step)</span>}
                    </span>
                  </div>
                  <div style={{ background: "#f3f4f6", borderRadius: 6, height: 20, overflow: "hidden" }}>
                    <div style={{ width: `${widthPct}%`, background: step.color, height: "100%", borderRadius: 6, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Conversion by Product</h2>
      {loading ? (
        <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block" }} />
      ) : products.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>No product activity for this period.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Product</th><th>Views</th><th>Added to Cart</th><th>Purchases</th><th>Conversion Rate</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.productId}>
                <td>
                  {p.slug ? <Link href={`/shop/${p.slug}`} className={styles.link} target="_blank">{p.title}</Link> : p.title}
                </td>
                <td>{p.views}</td>
                <td>{p.addsToCart}</td>
                <td>{p.purchases}</td>
                <td>{p.conversionRatePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "32px 0 12px" }}>By Country</h2>
      {loading ? (
        <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block" }} />
      ) : countries.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>No country data for this period.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Country</th><th>Views</th><th>Added to Cart</th><th>Purchases</th></tr></thead>
          <tbody>
            {countries.map(c => (
              <tr key={c.countryCode}>
                <td>{c.countryName} <span style={{ color: "#9ca3af", fontSize: 12 }}>({c.countryCode})</span></td>
                <td>{c.views}</td>
                <td>{c.addsToCart}</td>
                <td>{c.purchases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
