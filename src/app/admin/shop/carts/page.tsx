"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { ProductPicker } from "@/components/admin/shop/AnalyticsFilters";

interface CartItem {
  id: string;
  titleSnapshot: string;
  skuSnapshot: string | null;
  quantity: number;
  unitPriceCents: number;
  compareAtPriceCentsSnapshot: number | null;
  imageUrl: string | null;
  optionsSnapshot: Array<{ attributeName: string; displayValue: string | null; value: string }> | null;
}

interface Cart {
  id: string;
  token: string;
  userId: string | null;
  status: "active" | "completed" | "abandoned" | "merged";
  items: CartItem[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  byStatus: Record<string, number>;
  abandonedValueCents: number;
}

const STATUS_COLORS: Record<string, string> = {
  active:    styles.badgeShipped,
  abandoned: styles.badgeCancelled,
  completed: styles.badgeActive,
  merged:    styles.badgeDraft,
};

const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

function cartValueCents(c: Cart): number {
  return c.items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function expiresLabel(iso: string | null): { text: string; expired: boolean } {
  if (!iso) return { text: "—", expired: false };
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return { text: "Expired", expired: true };
  const day = Math.floor(diffMs / 86_400_000);
  if (day >= 1) return { text: `in ${day}d`, expired: false };
  const hr = Math.max(1, Math.floor(diffMs / 3_600_000));
  return { text: `in ${hr}h`, expired: false };
}

const SKELETON_COLS = [24, 130, 90, 120, 70, 80, 70, 90];

export default function CartsPage() {
  const [carts,     setCarts]     = useState<Cart[]>([]);
  const [total,     setTotal]     = useState(0);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [status,    setStatus]    = useState("");
  const [productId, setProductId] = useState("");
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [openIds,   setOpenIds]   = useState<Set<string>>(new Set());
  const limit = 25;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (status) qs.set("status", status);
      if (productId) qs.set("productId", productId);
      const res = await fetch(`/next-api/admin/shop/carts?${qs}`);
      if (res.ok) {
        const data = await res.json();
        const items: Cart[] = Array.isArray(data.items) ? data.items : [];
        setCarts(items);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
        // Filtering by product: the admin is looking for that product across
        // carts, so every matching row opens straight to its items — that's
        // the whole point of the filter. Items already arrive with the list
        // response, so this is just a UI state flip, no extra fetch.
        setOpenIds(productId ? new Set(items.map((c) => c.id)) : new Set());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, status, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const pages = Math.ceil(total / limit);
  const hasFilters = !!status || !!productId;
  const totalCarts = useMemo(
    () => (stats ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0),
    [stats],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Carts</h1>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 24 }}>
        {loading && !stats
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={styles.kpiCard}>
                <div className={styles.kpiLabel}>&nbsp;</div>
                <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
              </div>
            ))
          : (
            <>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Total carts</div>
                <div className={styles.kpiValue}>{totalCarts}</div>
              </div>
              <div className={styles.kpiCard} style={{ borderLeft: "3px solid #059669" }}>
                <div className={styles.kpiLabel}>Active</div>
                <div className={styles.kpiValue} style={{ color: "#059669" }}>{stats?.byStatus.active ?? 0}</div>
              </div>
              <div className={styles.kpiCard} style={{ borderLeft: "3px solid #dc2626" }}>
                <div className={styles.kpiLabel}>Abandoned</div>
                <div className={styles.kpiValue} style={{ color: "#dc2626" }}>{stats?.byStatus.abandoned ?? 0}</div>
              </div>
              <div className={styles.kpiCard} style={{ borderLeft: "3px solid #d97706" }}>
                <div className={styles.kpiLabel}>Value at risk</div>
                <div className={styles.kpiValue} style={{ color: "#d97706" }}>{eur(stats?.abandonedValueCents ?? 0)}</div>
                <div className={styles.kpiSub}>Sitting in abandoned carts</div>
              </div>
            </>
          )}
      </div>

      <div className={styles.filters} style={{ alignItems: "flex-end" }}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <select className={styles.filterSelect} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="abandoned">Abandoned</option>
            <option value="completed">Completed</option>
            <option value="merged">Merged</option>
          </select>
        </div>
        <ProductPicker
          value={productId}
          onChange={(id) => { setProductId(id); setPage(1); }}
          label="Product"
        />
        {hasFilters && (
          <button
            type="button"
            className={styles.clearLink}
            onClick={() => { setStatus(""); setProductId(""); setPage(1); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 32 }}><span className={styles.srOnly}>Expand</span></th>
            <th>Customer</th>
            <th>Items</th>
            <th style={{ textAlign: "right" }}>Value</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  {SKELETON_COLS.map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : carts.map((c) => {
                const isOpen = openIds.has(c.id);
                const value = cartValueCents(c);
                const exp = expiresLabel(c.expiresAt);
                const shown = c.items.slice(0, 3);
                const extra = c.items.length - shown.length;
                return (
                  <Fragment key={c.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => toggle(c.id)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`${styles.expandBtn} ${isOpen ? styles.expandBtnOpen : ""}`}
                          onClick={() => toggle(c.id)}
                          aria-label={isOpen ? "Collapse cart" : "Expand cart"}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? "▾" : "▸"}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: c.userId ? "#111827" : "#6b7280" }}>
                          {c.userId ? `${c.userId.slice(0, 8)}…` : "Guest"}
                        </div>
                        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "#9ca3af" }}>
                          {c.token.slice(0, 16)}…
                        </div>
                      </td>
                      <td>
                        {c.items.length === 0 ? (
                          <span style={{ fontSize: 13, color: "#9ca3af" }}>Empty</span>
                        ) : (
                          <div className={styles.thumbStack}>
                            {shown.map((item, idx) => (
                              item.imageUrl ? (
                                <img
                                  key={item.id}
                                  src={item.imageUrl}
                                  alt=""
                                  className={`${styles.thumb} ${idx ? styles.thumbOverlap : ""}`}
                                />
                              ) : (
                                <span
                                  key={item.id}
                                  className={`${styles.thumb} ${idx ? styles.thumbOverlap : ""}`}
                                  style={{ display: "inline-block" }}
                                />
                              )
                            ))}
                            {extra > 0 && <span className={styles.thumbMore}>+{extra}</span>}
                            <span style={{ marginLeft: 8, fontSize: 13, color: "#6b7280" }}>
                              {c.items.length} item{c.items.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>{eur(value)}</td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_COLORS[c.status] ?? styles.badgeDraft}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: exp.expired ? "#dc2626" : "#9ca3af" }}>
                        {exp.text}
                      </td>
                      <td style={{ fontSize: 13, color: "#9ca3af" }} title={new Date(c.updatedAt).toLocaleString()}>
                        {timeAgo(c.updatedAt)}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, background: "#f9fafb" }}>
                          {c.items.length === 0 ? (
                            <div style={{ padding: "14px 24px", color: "#9ca3af", fontSize: 13 }}>No items in this cart</div>
                          ) : (
                            <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                              {c.items.map((item) => (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt="" className={styles.thumbLg} />
                                  ) : (
                                    <span className={styles.thumbLg} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {item.titleSnapshot}
                                    </div>
                                    <div style={{ marginTop: 2 }}>
                                      {item.skuSnapshot && (
                                        <span style={{ fontSize: 11, color: "#9ca3af", marginRight: 8 }}>{item.skuSnapshot}</span>
                                      )}
                                      {item.optionsSnapshot?.map((o, i) => (
                                        <span key={i} className={styles.optionTag}>
                                          {o.attributeName}: {o.displayValue ?? o.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>
                                    {item.quantity} ×{" "}
                                    {item.compareAtPriceCentsSnapshot && item.compareAtPriceCentsSnapshot > item.unitPriceCents ? (
                                      <>
                                        <span style={{ textDecoration: "line-through", color: "#9ca3af", marginRight: 4 }}>
                                          {eur(item.compareAtPriceCentsSnapshot)}
                                        </span>
                                        {eur(item.unitPriceCents)}
                                      </>
                                    ) : (
                                      eur(item.unitPriceCents)
                                    )}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 600, minWidth: 70, textAlign: "right" }}>
                                    {eur(item.quantity * item.unitPriceCents)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          {!loading && carts.length === 0 && (
            <tr>
              <td colSpan={7}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateTitle}>No carts found</div>
                  <div>{hasFilters ? "Try adjusting your filters." : "Carts will appear here as shoppers add items."}</div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>{total} carts</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span style={{ fontSize: 14 }}>Page {page} / {pages}</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
