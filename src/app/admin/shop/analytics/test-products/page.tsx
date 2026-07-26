"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import {
  AnalyticsDetailModal,
  DateRangeFilter,
  DetailKind,
  FilterSelect,
  FilterToggle,
  ProductPicker,
  dateRangeToQuery,
  useUrlFilters,
} from "@/components/admin/shop/AnalyticsFilters";

interface TestProductDemand {
  productId: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  addsToCart: number;
  reachedCheckout: number;
  viewToCartRatePct: number;
  cartToCheckoutRatePct: number;
  viewToCheckoutRatePct: number;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "hidden", label: "Hidden" },
];

const LIMIT_OPTIONS = [
  { value: "10", label: "Top 10" },
  { value: "20", label: "Top 20" },
  { value: "50", label: "Top 50" },
];

// Sortable numeric columns → server sort keys.
const SORT_COLUMNS: Array<{ key: keyof TestProductDemand; label: string; accent?: boolean }> = [
  { key: "views",                label: "Views" },
  { key: "addsToCart",           label: "Added to Cart" },
  { key: "reachedCheckout",      label: "Reached Checkout", accent: true },
  { key: "viewToCartRatePct",    label: "View → Cart" },
  { key: "cartToCheckoutRatePct",label: "Cart → Checkout" },
  { key: "viewToCheckoutRatePct",label: "View → Checkout" },
];

// Event types that make up a test product's demand.
const TEST_EVENT_TYPES = "product_view,add_to_cart,test_checkout_blocked";

interface ModalState {
  title: string;
  subtitle?: string;
  kind: DetailKind;
  params: Record<string, string>;
}

const DEFAULTS = {
  range: "30",
  startDate: "",
  endDate: "",
  product: "",
  status: "",
  category: "",
  minPrice: "",
  maxPrice: "",
  search: "",
  sort: "",
  order: "desc",
  limit: "",
  minViews: "",
  activeOnly: "",
  reachedCheckoutOnly: "",
};

export default function TestProductsAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <TestProductsAnalytics />
    </Suspense>
  );
}

function TestProductsAnalytics() {
  const [filters, setFilters] = useUrlFilters(DEFAULTS);
  const [rows, setRows]       = useState<TestProductDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([]);
  const [modal, setModal]     = useState<ModalState | null>(null);

  // Date-window params only, for the per-product detail modal.
  const windowParams = useMemo(
    () => dateRangeToQuery(filters.range, filters.startDate, filters.endDate),
    [filters.range, filters.startDate, filters.endDate],
  );

  useEffect(() => {
    fetch("/next-api/admin/shop/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items ?? [];
        setCategories(list.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })));
      })
      .catch(() => {});
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams(
      dateRangeToQuery(filters.range, filters.startDate, filters.endDate),
    );
    if (filters.product) params.set("productId", filters.product);
    if (filters.status) params.set("productStatus", filters.status);
    if (filters.category) params.set("categoryId", filters.category);
    if (filters.minPrice) params.set("minPriceCents", String(Math.round(Number(filters.minPrice) * 100)));
    if (filters.maxPrice) params.set("maxPriceCents", String(Math.round(Number(filters.maxPrice) * 100)));
    if (filters.sort) { params.set("sort", filters.sort); params.set("order", filters.order); }
    if (filters.limit) params.set("limit", filters.limit);
    if (filters.minViews) params.set("minViews", filters.minViews);
    if (filters.activeOnly === "true") params.set("activeOnly", "true");
    if (filters.reachedCheckoutOnly === "true") params.set("reachedCheckoutOnly", "true");
    return params.toString();
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/admin/shop/analytics/test-products?${query}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [query]);

  const totals = rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      addsToCart: acc.addsToCart + r.addsToCart,
      reachedCheckout: acc.reachedCheckout + r.reachedCheckout,
    }),
    { views: 0, addsToCart: 0, reachedCheckout: 0 },
  );

  // Toggle sort: same column flips direction; a new column starts descending.
  const toggleSort = (key: string) => {
    if (filters.sort === key) {
      setFilters({ order: filters.order === "asc" ? "desc" : "asc" });
    } else {
      setFilters({ sort: key, order: "desc" });
    }
  };

  const sortArrow = (key: string) =>
    filters.sort === key ? (filters.order === "asc" ? "▲" : "▼") : "";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Test Products</h1>
      </div>

      <div className={styles.filterBar}>
        <DateRangeFilter
          range={filters.range}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onChange={setFilters}
        />
        <ProductPicker value={filters.product} onChange={(v) => setFilters({ product: v })} testOnly />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters({ status: v })} options={STATUS_OPTIONS} allLabel="Any status" />
        <FilterSelect label="Category" value={filters.category} onChange={(v) => setFilters({ category: v })} options={categories} allLabel="All categories" />
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Min price</label>
          <input type="number" min={0} className={styles.filterInput} style={{ width: 90 }} value={filters.minPrice} onChange={(e) => setFilters({ minPrice: e.target.value })} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Max price</label>
          <input type="number" min={0} className={styles.filterInput} style={{ width: 90 }} value={filters.maxPrice} onChange={(e) => setFilters({ maxPrice: e.target.value })} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Min views</label>
          <input type="number" min={0} className={styles.filterInput} style={{ width: 90 }} value={filters.minViews} onChange={(e) => setFilters({ minViews: e.target.value })} />
        </div>
        <FilterSelect label="Show" value={filters.limit} onChange={(v) => setFilters({ limit: v })} options={LIMIT_OPTIONS} allLabel="All" />
        <FilterToggle label="Hide no activity" checked={filters.activeOnly === "true"} onChange={(c) => setFilters({ activeOnly: c ? "true" : "" })} />
        <FilterToggle label="Reached checkout only" checked={filters.reachedCheckoutOnly === "true"} onChange={(c) => setFilters({ reachedCheckoutOnly: c ? "true" : "" })} />
      </div>

      <p style={{ marginTop: -8, marginBottom: 20, fontSize: 13, color: "#6b7280", maxWidth: 760, lineHeight: 1.6 }}>
        Test products behave like real products until checkout, which is refused before the
        payment form loads. <strong>Reached checkout</strong> counts customers who entered
        their address, chose a shipping method and clicked through to payment — the furthest
        the product can be taken, and the people who would have bought it. Counted once per
        customer, so retries after the error do not inflate it.
      </p>

      {loading ? (
        <div className={styles.kpiGrid}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Loading</div>
              <div className={`${styles.skeleton} ${styles.skeletonKpi}`} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>
          No test products match these filters. Turn on &ldquo;Test product&rdquo; on a
          product, or loosen the filters above.
        </p>
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Test Products</div>
              <div className={styles.kpiValue}>{rows.length}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Views</div>
              <div className={styles.kpiValue}>{totals.views}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Added to Cart</div>
              <div className={styles.kpiValue}>{totals.addsToCart}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Reached Checkout</div>
              <div className={styles.kpiValue} style={{ color: "#b45309" }}>{totals.reachedCheckout}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Demand by product
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  {SORT_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={styles.sortableTh}
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      <span className={styles.sortArrow}>{sortArrow(col.key)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.productId}
                    className={styles.clickableRow}
                    title="Click for details"
                    onClick={() =>
                      setModal({
                        title: r.title,
                        subtitle: "Events for this product with exact date & time",
                        kind: "event",
                        params: { ...windowParams, productId: r.productId, eventType: TEST_EVENT_TYPES, limit: "200" },
                      })
                    }
                  >
                    <td>
                      <Link href={`/admin/shop/products/${r.productId}`} className={styles.link} onClick={(e) => e.stopPropagation()}>
                        {r.title}
                      </Link>
                    </td>
                    <td style={{ color: "#6b7280" }}>{r.status}</td>
                    <td>{r.views}</td>
                    <td>{r.addsToCart}</td>
                    <td style={{ fontWeight: 700, color: "#b45309" }}>{r.reachedCheckout}</td>
                    <td>{r.viewToCartRatePct}%</td>
                    <td>{r.cartToCheckoutRatePct}%</td>
                    <td>{r.viewToCheckoutRatePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal && (
        <AnalyticsDetailModal
          open
          onClose={() => setModal(null)}
          title={modal.title}
          subtitle={modal.subtitle}
          kind={modal.kind}
          params={modal.params}
        />
      )}
    </div>
  );
}
