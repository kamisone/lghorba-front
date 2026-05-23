"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Vendor { id: string; name: string; }
interface Product {
  id: string;
  title: string;
  sku: string | null;
  status: string;
  vendorId: string | null;
}

const STATUS_CLASS: Record<string, string> = {
  active:       styles.badgeActive,
  draft:        styles.badgeDraft,
  archived:     styles.badgeCancelled,
  out_of_stock: styles.badgeCancelled,
  hidden:       styles.badgeDraft,
};

export default function VendorProductsPage() {
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [items, setItems]       = useState<Product[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch("/next-api/admin/shop/vendors")
      .then(r => r.json())
      .then(d => setVendors(d.items ?? d ?? []));
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    fetch(`/next-api/admin/shop/vendors/products?vendorId=${vendorId}&limit=100`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [vendorId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendor Products</h1>
        {vendorId && <span className={styles.subtitle}>{total} products</span>}
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={vendorId} onChange={e => setVendorId(e.target.value)}>
          <option value="">Select a vendor…</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {!vendorId ? (
        <div style={{ padding: "64px 0", textAlign: "center", color: "#9ca3af" }}>
          Select a vendor to view their products.
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>SKU</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>{Array.from({ length: 3 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No products for this vendor</td></tr>
            ) : items.map(p => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.sku ?? "—"}</td>
                <td><span className={`${styles.badge} ${STATUS_CLASS[p.status] ?? styles.badgeDraft}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
