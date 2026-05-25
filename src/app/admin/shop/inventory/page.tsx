"use client";

import { useEffect, useState } from "react";
import styles from "./Inventory.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface InventoryItem {
  id: string;
  variantId: string;
  productId: string;
  available: number;
  reserved: number;
  lowStockThreshold: number;
  updatedAt: string;
}

interface AdjustState { variantId: string; delta: string; note: string; }

function stockClass(available: number, threshold: number) {
  if (available <= 0) return styles.stockLow;
  if (available <= threshold) return styles.stockWarn;
  return styles.stockOk;
}

function stockBadgeClass(available: number, threshold: number) {
  if (available <= 0) return styles.stockBadgeLow;
  if (available <= threshold) return styles.stockBadgeWarn;
  return styles.stockBadgeOk;
}

function stockBarClass(available: number, threshold: number) {
  if (available <= 0) return styles.stockBarLow;
  if (available <= threshold) return styles.stockBarWarn;
  return styles.stockBarOk;
}

function stockLabel(available: number, threshold: number) {
  if (available <= 0) return "Out of stock";
  if (available <= threshold) return "Low stock";
  return "In stock";
}

export default function AdminInventoryPage() {
  const { toast } = useToast();
  const [items, setItems]       = useState<InventoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [adjusting, setAdjusting] = useState<AdjustState | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/shop/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleAdjust() {
    if (!adjusting) return;
    const delta = parseInt(adjusting.delta, 10);
    if (isNaN(delta)) return;
    const res = await fetch(`/next-api/shop/inventory/${adjusting.variantId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, note: adjusting.note || "Manual adjustment" }),
    });
    if (res.ok) toast.success("Stock adjusted");
    else toast.error("Failed to adjust stock");
    setAdjusting(null);
    load();
  }

  const filtered = items.filter(i =>
    !search || i.variantId.toLowerCase().includes(search.toLowerCase()) || i.productId.toLowerCase().includes(search.toLowerCase())
  );

  const outOfStock = items.filter(i => i.available <= 0).length;
  const lowStock   = items.filter(i => i.available > 0 && i.available <= i.lowStockThreshold).length;
  const totalUnits = items.reduce((s, i) => s + i.available, 0);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Inventory</h1>
          <span className={styles.subtitle}>{items.length} variants tracked</span>
        </div>
      </div>

      {/* ── KPI strip ── */}
      {!loading && (
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total units</span>
            <span className={styles.kpiValue}>{totalUnits.toLocaleString()}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Low stock</span>
            <span className={`${styles.kpiValue} ${lowStock > 0 ? styles.kpiValueWarn : ""}`}>{lowStock}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Out of stock</span>
            <span className={`${styles.kpiValue} ${outOfStock > 0 ? styles.kpiValueDanger : ""}`}>{outOfStock}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Variants</span>
            <span className={styles.kpiValue}>{items.length}</span>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search by variant or product ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.toolbarRight}>{filtered.length} results</div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Variant ID</th>
              <th>Stock level</th>
              <th>Available</th>
              <th>Reserved</th>
              <th>Threshold</th>
              <th>Last updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  {[110, 90, 50, 50, 80, 120, 70].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w, display: "block" }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📦</span>
                    <span className={styles.emptyText}>{search ? "No results match your search" : "No inventory items yet"}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <span className={styles.variantId} title={item.variantId}>{item.variantId.slice(0, 8)}…</span>
                  </td>
                  <td>
                    <span className={`${styles.stockBadge} ${stockBadgeClass(item.available, item.lowStockThreshold)}`}>
                      {stockLabel(item.available, item.lowStockThreshold)}
                    </span>
                    <div className={styles.stockBar}>
                      <div
                        className={`${styles.stockBarFill} ${stockBarClass(item.available, item.lowStockThreshold)}`}
                        style={{ width: `${Math.min(100, item.lowStockThreshold > 0 ? (item.available / (item.lowStockThreshold * 3)) * 100 : 100)}%` }}
                      />
                    </div>
                  </td>
                  <td>
                    <span className={stockClass(item.available, item.lowStockThreshold)}>
                      {item.available}
                    </span>
                  </td>
                  <td>{item.reserved}</td>
                  <td>{item.lowStockThreshold}</td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.actionBtn}
                      onClick={() => setAdjusting({ variantId: item.variantId, delta: "", note: "" })}
                    >
                      Adjust stock
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Adjust modal ── */}
      {adjusting && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setAdjusting(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>Adjust Stock</h2>
              <button className={styles.modalClose} onClick={() => setAdjusting(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Delta <span>(positive to add, negative to remove)</span></label>
                <input
                  type="number"
                  value={adjusting.delta}
                  onChange={e => setAdjusting(a => a ? { ...a, delta: e.target.value } : null)}
                  placeholder="e.g. +10 or -3"
                  autoFocus
                />
                <p className={styles.deltaHint}><b>+10</b> adds 10 units · <i>-3</i> removes 3 units</p>
              </div>
              <div className={styles.formField}>
                <label>Note <span>(optional)</span></label>
                <input
                  value={adjusting.note}
                  onChange={e => setAdjusting(a => a ? { ...a, note: e.target.value } : null)}
                  placeholder="e.g. Received new shipment"
                />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setAdjusting(null)}>Cancel</button>
              <button
                className={styles.applyBtn}
                disabled={!adjusting.delta || isNaN(parseInt(adjusting.delta, 10))}
                onClick={handleAdjust}
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
