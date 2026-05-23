"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface CartItem {
  id: string;
  variantId: string | null;
  titleSnapshot: string;
  skuSnapshot: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
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

const STATUS_COLORS: Record<string, string> = {
  active:    styles.badgeShipped,
  abandoned: styles.badgeCancelled,
  completed: styles.badgeActive,
  merged:    styles.badgeDraft,
};

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CartsPage() {
  const [carts,    setCarts]    = useState<Cart[]>([]);
  const [total,    setTotal]    = useState(0);
  const [status,   setStatus]   = useState("");
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Record<string, CartItem[] | null>>({});
  const limit = 25;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (status) qs.set("status", status);
      const res = await fetch(`/next-api/admin/shop/carts?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCarts(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, status]);

  async function toggleExpand(cart: Cart) {
    if (expanded[cart.id] !== undefined) {
      setExpanded(e => { const n = { ...e }; delete n[cart.id]; return n; });
      return;
    }
    setExpanded(e => ({ ...e, [cart.id]: null }));
    const res = await fetch(`/next-api/admin/shop/carts/${cart.id}`);
    if (res.ok) {
      const data: Cart = await res.json();
      setExpanded(e => ({ ...e, [cart.id]: data.items ?? [] }));
    }
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Carts</h1>
        <span style={{ color: "#6b7280", fontSize: 14 }}>{total} total</span>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="abandoned">Abandoned</option>
          <option value="completed">Completed</option>
          <option value="merged">Merged</option>
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            <th>Token</th>
            <th>User</th>
            <th>Items</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {[28, 120, 80, 30, 60, 70, 100].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : carts.map(c => {
                const isOpen  = c.id in expanded;
                const items   = expanded[c.id];
                return (
                  <>
                    <tr
                      key={c.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleExpand(c)}
                    >
                      <td style={{ textAlign: "center", color: "#6b7280", fontSize: 12 }}>{isOpen ? "▼" : "▶"}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.token.slice(0, 16)}…</td>
                      <td style={{ color: "#6b7280", fontSize: 13 }}>{c.userId ? c.userId.slice(0, 8) + "…" : "Guest"}</td>
                      <td>{c.items?.length ?? 0}</td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_COLORS[c.status] ?? styles.badgeDraft}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "#9ca3af" }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: 13, color: "#9ca3af" }}>
                        {new Date(c.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${c.id}-items`}>
                        <td colSpan={7} style={{ padding: 0, background: "#f9fafb" }}>
                          {items === null ? (
                            <div style={{ padding: "12px 24px", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                          ) : items.length === 0 ? (
                            <div style={{ padding: "12px 24px", color: "#9ca3af", fontSize: 13 }}>No items in this cart</div>
                          ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                  <th style={{ padding: "6px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151" }}>Product</th>
                                  <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#374151" }}>SKU</th>
                                  <th style={{ padding: "6px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151" }}>Qty</th>
                                  <th style={{ padding: "6px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151" }}>Unit price</th>
                                  <th style={{ padding: "6px 24px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#374151" }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => (
                                  <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                    <td style={{ padding: "8px 24px", fontSize: 13 }}>{item.titleSnapshot}</td>
                                    <td style={{ padding: "8px 12px", fontSize: 12, color: "#6b7280" }}>{item.skuSnapshot ?? "—"}</td>
                                    <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right" }}>{item.quantity}</td>
                                    <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right" }}>{fmt(item.unitPriceCents)}</td>
                                    <td style={{ padding: "8px 24px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{fmt(item.totalCents)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
          }
          {!loading && carts.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No carts found</td></tr>
          )}
        </tbody>
      </table>

      {pages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>{total} carts</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ fontSize: 14 }}>Page {page} / {pages}</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
