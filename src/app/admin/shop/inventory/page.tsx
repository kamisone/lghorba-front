"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Inventory.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OptionValue {
  optionValueId: string;
  value: string;
  displayValue: string | null;
  attributeName: string;
  attributeId: string;
}

interface InventoryItem {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  variantTitle: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  featuredMediaUrl: string | null;
  optionValues: OptionValue[];
  productTitle: string;
  productSlug: string;
  productStatus: string;
  available: number;
  reserved: number;
  incoming: number;
  lowStockThreshold: number;
  updatedAt: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface Movement {
  id: string;
  type: string;
  delta: number;
  availableAfter: number;
  reservedAfter: number;
  note: string | null;
  createdAt: string;
}

interface AdjustState { variantId: string; sku: string; delta: string; note: string; }
interface GenerateState { productId: string; productTitle: string; }

// ── Helpers ─────────────────────────────────────────────────────────────────────

function cents(n: number) { return `€${(n / 100).toFixed(2)}`; }

function statusLabel(s: InventoryItem["status"]) {
  if (s === "out_of_stock") return "Out of stock";
  if (s === "low_stock")    return "Low stock";
  return "In stock";
}

function statusStyleClass(s: InventoryItem["status"], css: typeof styles) {
  if (s === "out_of_stock") return css.badgeDanger;
  if (s === "low_stock")    return css.badgeWarn;
  return css.badgeOk;
}

function movementIcon(type: string) {
  const map: Record<string, string> = {
    order_placed:    "↓",
    order_cancelled: "↑",
    order_shipped:   "↓",
    manual_adjustment: "✎",
    restock:         "↑",
    refund:          "↑",
  };
  return map[type] ?? "·";
}

// ── Main page ────────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const { toast } = useToast();

  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search,     setSearch]     = useState("");
  const [statusFilt, setStatusFilt] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [productFilt, setProductFilt] = useState("");

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [adjusting,  setAdjusting]  = useState<AdjustState | null>(null);
  const [movements,  setMovements]  = useState<{ variantId: string; sku: string; data: Movement[] } | null>(null);
  const [generating, setGenerating] = useState<GenerateState | null>(null);
  const [threshold,  setThreshold]  = useState<{ variantId: string; sku: string; value: string } | null>(null);

  // Bulk adjust UI
  const [bulkDelta, setBulkDelta] = useState("");
  const [bulkNote,  setBulkNote]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/next-api/shop/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ──────────────────────────────────────────────────────────────

  const uniqueProducts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of items) seen.set(it.productId, it.productTitle);
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [items]);

  const filtered = useMemo(() => items.filter(it => {
    if (statusFilt !== "all" && it.status !== statusFilt) return false;
    if (productFilt && it.productId !== productFilt) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !it.productTitle.toLowerCase().includes(q) &&
        !it.sku.toLowerCase().includes(q) &&
        !it.variantTitle.toLowerCase().includes(q) &&
        !it.optionValues.some(ov => (ov.displayValue ?? ov.value).toLowerCase().includes(q))
      ) return false;
    }
    return true;
  }), [items, search, statusFilt, productFilt]);

  const kpi = useMemo(() => ({
    total:      items.reduce((s, i) => s + i.available, 0),
    inStock:    items.filter(i => i.status === "in_stock").length,
    lowStock:   items.filter(i => i.status === "low_stock").length,
    outOfStock: items.filter(i => i.status === "out_of_stock").length,
    skus:       items.length,
  }), [items]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  async function handleAdjust() {
    if (!adjusting) return;
    const delta = parseInt(adjusting.delta, 10);
    if (isNaN(delta)) { toast.error("Invalid delta value"); return; }
    const res = await fetch(`/next-api/shop/inventory/${adjusting.variantId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, note: adjusting.note || "Manual adjustment" }),
    });
    if (res.ok) { toast.success("Stock adjusted"); setAdjusting(null); load(); }
    else toast.error("Failed to adjust stock");
  }

  async function handleBulkAdjust() {
    const delta = parseInt(bulkDelta, 10);
    if (isNaN(delta) || selected.size === 0) return;
    const adjustments = Array.from(selected).map(variantId => ({
      variantId,
      delta,
      note: bulkNote || "Bulk adjustment",
    }));
    const res = await fetch("/next-api/shop/inventory/bulk-adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adjustments }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Adjusted ${data.ok} SKU(s)${data.failed > 0 ? `, ${data.failed} failed` : ""}`);
      setSelected(new Set());
      setBulkDelta("");
      setBulkNote("");
      load();
    } else {
      toast.error("Bulk adjustment failed");
    }
  }

  async function handleThresholdSave() {
    if (!threshold) return;
    const val = parseInt(threshold.value, 10);
    if (isNaN(val) || val < 0) { toast.error("Invalid threshold"); return; }
    const res = await fetch(`/next-api/shop/inventory/${threshold.variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lowStockThreshold: val }),
    });
    if (res.ok) { toast.success("Threshold updated"); setThreshold(null); load(); }
    else toast.error("Failed to update threshold");
  }

  async function openMovements(variantId: string, sku: string) {
    const res = await fetch(`/next-api/shop/inventory/${variantId}/movements`);
    if (res.ok) {
      const data = await res.json();
      setMovements({ variantId, sku, data: Array.isArray(data) ? data : [] });
    } else {
      toast.error("Failed to load movements");
    }
  }

  async function handleGenerate() {
    if (!generating) return;
    const res = await fetch(`/next-api/shop/products/${generating.productId}/variants/generate-combinations`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Generated ${data.created} new SKU(s), ${data.skipped} already existed`);
      setGenerating(null);
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Failed to generate combinations");
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────────

  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.variantId));
  function toggleAll() {
    if (allSelected) setSelected(prev => { const s = new Set(prev); filtered.forEach(i => s.delete(i.variantId)); return s; });
    else             setSelected(prev => { const s = new Set(prev); filtered.forEach(i => s.add(i.variantId));    return s; });
  }
  function toggleOne(variantId: string) {
    setSelected(prev => { const s = new Set(prev); s.has(variantId) ? s.delete(variantId) : s.add(variantId); return s; });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Inventory</h1>
          <span className={styles.subtitle}>{kpi.skus} SKUs tracked</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={load}>↻ Refresh</button>
          <button
            className={styles.primaryBtn}
            onClick={() => {
              const first = uniqueProducts[0];
              if (first) setGenerating({ productId: first.id, productTitle: first.title });
            }}
            disabled={uniqueProducts.length === 0}
          >
            ＋ Generate Combinations
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className={styles.kpiStrip}>
        {[
          { label: "Total units",   value: kpi.total.toLocaleString(), cls: "" },
          { label: "In stock",      value: kpi.inStock,      cls: "" },
          { label: "Low stock",     value: kpi.lowStock,     cls: kpi.lowStock > 0   ? styles.kpiWarn   : "" },
          { label: "Out of stock",  value: kpi.outOfStock,   cls: kpi.outOfStock > 0 ? styles.kpiDanger : "" },
          { label: "Total SKUs",    value: kpi.skus,         cls: "" },
        ].map(k => (
          <div key={k.label} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{k.label}</span>
            <span className={`${styles.kpiValue} ${k.cls}`}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search product, SKU, variant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><X size={14} strokeWidth={2} /></button>}
        </div>

        <select className={styles.filterSelect} value={statusFilt} onChange={e => setStatusFilt(e.target.value as typeof statusFilt)}>
          <option value="all">All statuses</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>

        <select className={styles.filterSelect} value={productFilt} onChange={e => setProductFilt(e.target.value)}>
          <option value="">All products</option>
          {uniqueProducts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <span className={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>

        {selected.size > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkLabel}>{selected.size} selected</span>
            <input
              className={styles.bulkInput}
              type="number"
              placeholder="Delta (±)"
              value={bulkDelta}
              onChange={e => setBulkDelta(e.target.value)}
            />
            <input
              className={styles.bulkInput}
              placeholder="Note (optional)"
              value={bulkNote}
              onChange={e => setBulkNote(e.target.value)}
            />
            <button
              className={styles.applyBtn}
              disabled={!bulkDelta || isNaN(parseInt(bulkDelta, 10))}
              onClick={handleBulkAdjust}
            >
              Apply to selected
            </button>
            <button className={styles.cancelBtn} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th style={{ width: 48 }}>Image</th>
              <th>Product / SKU</th>
              <th>Variant</th>
              <th>Options</th>
              <th style={{ width: 80 }}>Price</th>
              <th style={{ width: 70 }}>Available</th>
              <th style={{ width: 70 }}>Reserved</th>
              <th style={{ width: 70 }}>Incoming</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 80 }}>Threshold</th>
              <th style={{ width: 100 }}>Updated</th>
              <th style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 13 }, (__, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ width: j === 2 ? 140 : 60, height: 13, display: "block" }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={13}>
                  <div className={styles.empty}>
                    <span>📦</span>
                    <span>{search || statusFilt !== "all" || productFilt ? "No results match your filters" : "No inventory yet"}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className={selected.has(item.variantId) ? styles.rowSelected : ""}>
                  <td>
                    <input type="checkbox" checked={selected.has(item.variantId)} onChange={() => toggleOne(item.variantId)} />
                  </td>
                  <td>
                    {item.featuredMediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.featuredMediaUrl} alt="" className={styles.thumb} />
                    ) : (
                      <div className={styles.thumbPlaceholder} />
                    )}
                  </td>
                  <td>
                    <div className={styles.productName}>{item.productTitle}</div>
                    <div className={styles.skuRow}>
                      <code className={styles.sku}>{item.sku}</code>
                      <button
                        className={styles.copyBtn}
                        title="Copy SKU"
                        onClick={() => { navigator.clipboard.writeText(item.sku); toast.success("SKU copied"); }}
                      >
                        ⎘
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={styles.variantTitle}>{item.variantTitle}</span>
                  </td>
                  <td>
                    <div className={styles.optionChips}>
                      {item.optionValues.map(ov => (
                        <span key={ov.optionValueId} className={styles.chip} title={ov.attributeName}>
                          {ov.displayValue ?? ov.value}
                        </span>
                      ))}
                      {item.optionValues.length === 0 && <span className={styles.noOptions}>–</span>}
                    </div>
                  </td>
                  <td>
                    <span className={styles.price}>{cents(item.priceCents)}</span>
                  </td>
                  <td>
                    <span className={item.status === "out_of_stock" ? styles.stockDanger : item.status === "low_stock" ? styles.stockWarn : styles.stockOk}>
                      {item.available}
                    </span>
                  </td>
                  <td><span className={styles.muted}>{item.reserved}</span></td>
                  <td><span className={styles.incoming}>{item.incoming > 0 ? `+${item.incoming}` : "–"}</span></td>
                  <td>
                    <span className={`${styles.badge} ${statusStyleClass(item.status, styles)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.thresholdBtn}
                      title="Edit threshold"
                      onClick={() => setThreshold({ variantId: item.variantId, sku: item.sku, value: String(item.lowStockThreshold) })}
                    >
                      {item.lowStockThreshold}
                    </button>
                  </td>
                  <td>
                    <span className={styles.dateCell}>
                      {new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => setAdjusting({ variantId: item.variantId, sku: item.sku, delta: "", note: "" })}
                      >
                        Adjust
                      </button>
                      <button
                        className={styles.actionBtnGhost}
                        onClick={() => openMovements(item.variantId, item.sku)}
                        title="View stock history"
                      >
                        History
                      </button>
                    </div>
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
              <div>
                <h2 className={styles.modalTitle}>Adjust Stock</h2>
                <p className={styles.modalSub}>SKU: {adjusting.sku}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setAdjusting(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Delta <span className={styles.hint}>(+10 adds · −3 removes)</span></label>
                <input
                  type="number"
                  value={adjusting.delta}
                  onChange={e => setAdjusting(a => a ? { ...a, delta: e.target.value } : null)}
                  placeholder="e.g. +10 or −3"
                  autoFocus
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label>Note <span className={styles.hint}>(optional)</span></label>
                <input
                  value={adjusting.note}
                  onChange={e => setAdjusting(a => a ? { ...a, note: e.target.value } : null)}
                  placeholder="e.g. Received new shipment"
                  className={styles.formInput}
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

      {/* ── Threshold modal ── */}
      {threshold && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setThreshold(null); }}>
          <div className={styles.modal} style={{ maxWidth: 420 }}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>Low Stock Threshold</h2>
                <p className={styles.modalSub}>SKU: {threshold.sku}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setThreshold(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Alert when available drops below</label>
                <input
                  type="number"
                  min={0}
                  value={threshold.value}
                  onChange={e => setThreshold(t => t ? { ...t, value: e.target.value } : null)}
                  className={styles.formInput}
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setThreshold(null)}>Cancel</button>
              <button className={styles.applyBtn} onClick={handleThresholdSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Movements modal ── */}
      {movements && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setMovements(null); }}>
          <div className={`${styles.modal} ${styles.modalWide}`}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>Stock History</h2>
                <p className={styles.modalSub}>SKU: {movements.sku}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setMovements(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={styles.modalBody} style={{ padding: 0 }}>
              {movements.data.length === 0 ? (
                <p style={{ padding: "24px", color: "var(--color-text-muted)", textAlign: "center" }}>No movements recorded</p>
              ) : (
                <table className={styles.mvTable}>
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Delta</th><th>Available after</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {movements.data.map(m => (
                      <tr key={m.id}>
                        <td className={styles.dateCell}>{new Date(m.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                        <td><span className={styles.mvType}>{movementIcon(m.type)} {m.type.replace(/_/g, " ")}</span></td>
                        <td><span className={m.delta >= 0 ? styles.mvPos : styles.mvNeg}>{m.delta >= 0 ? `+${m.delta}` : m.delta}</span></td>
                        <td>{m.availableAfter}</td>
                        <td className={styles.muted}>{m.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setMovements(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate combinations modal ── */}
      {generating && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setGenerating(null); }}>
          <div className={styles.modal} style={{ maxWidth: 480 }}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>Generate Combinations</h2>
                <p className={styles.modalSub}>Auto-create all SKUs from linked attributes</p>
              </div>
              <button className={styles.modalClose} onClick={() => setGenerating(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Product</label>
                <select
                  className={styles.formInput}
                  value={generating.productId}
                  onChange={e => {
                    const p = uniqueProducts.find(x => x.id === e.target.value);
                    if (p) setGenerating({ productId: p.id, productTitle: p.title });
                  }}
                >
                  {uniqueProducts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className={styles.infoBox}>
                <strong>What this does:</strong>
                <ul>
                  <li>Reads all variation attributes linked to this product</li>
                  <li>Computes every possible option combination</li>
                  <li>Creates missing SKUs with auto-generated titles</li>
                  <li>Sets initial stock to 0 — update prices &amp; stock after</li>
                  <li>Skips combinations that already exist</li>
                </ul>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setGenerating(null)}>Cancel</button>
              <button className={styles.applyBtn} onClick={handleGenerate}>Generate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
