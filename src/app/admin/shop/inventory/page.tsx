"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface InventoryItem { id: string; variantId: string; productId: string; available: number; reserved: number; lowStockThreshold: number; updatedAt: string }

export default function AdminInventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [adjusting, setAdjusting] = useState<{ variantId: string; delta: string; note: string } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/shop/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory</h1>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Variant ID</th><th>Available</th><th>Reserved</th><th>Low stock threshold</th><th>Updated</th><th>Action</th></tr></thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {[100, 50, 50, 80, 110, 60].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : items.map(item => (
            <tr key={item.id}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{item.variantId.slice(0, 8)}...</td>
              <td>
                <span style={{ color: item.available <= item.lowStockThreshold ? "#ef4444" : "#059669", fontWeight: 600 }}>
                  {item.available}
                </span>
              </td>
              <td>{item.reserved}</td>
              <td>{item.lowStockThreshold}</td>
              <td style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(item.updatedAt).toLocaleString()}</td>
              <td>
                <button onClick={() => setAdjusting({ variantId: item.variantId, delta: "", note: "" })} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }}>Adjust</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {adjusting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400 }}>
            <h3 style={{ marginBottom: 16 }}>Adjust inventory</h3>
            <div className={styles.formField}>
              <label>Delta (positive = add, negative = remove)</label>
              <input type="number" value={adjusting.delta} onChange={e => setAdjusting(a => a ? { ...a, delta: e.target.value } : null)} />
            </div>
            <div className={styles.formField} style={{ marginTop: 12 }}>
              <label>Note</label>
              <input value={adjusting.note} onChange={e => setAdjusting(a => a ? { ...a, note: e.target.value } : null)} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={handleAdjust} className={`${styles.btn} ${styles.btnPrimary}`}>Apply</button>
              <button onClick={() => setAdjusting(null)} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
