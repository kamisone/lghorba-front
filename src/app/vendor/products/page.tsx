"use client";

import { useEffect, useState } from "react";

interface Product {
  id:     string;
  title:  string;
  slug:   string;
  status: string;
  sku:    string | null;
  brand:  string | null;
}

const STATUS_COLOR: Record<string, string> = {
  active:   "#10b981",
  draft:    "#9ca3af",
  archived: "#f59e0b",
  hidden:   "#6b7280",
};

export default function VendorProductsPage() {
  const [items, setItems]     = useState<Product[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/next-api/vendor/products")
      .then(r => r.json())
      .then((d: { items: Product[]; total: number }) => { setItems(d.items); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>My Products ({total})</h1>
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No products assigned to your account yet.</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Title", "SKU", "Brand", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px" }}>{p.title}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{p.sku ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{p.brand ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 10px", borderRadius: 12,
                      background: `${STATUS_COLOR[p.status] ?? "#9ca3af"}22`,
                      color: STATUS_COLOR[p.status] ?? "#9ca3af",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
