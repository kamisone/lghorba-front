"use client";

import { useEffect, useState } from "react";

interface Order {
  id:            string;
  orderNumber:   string;
  status:        string;
  customerEmail: string;
  totalCents:    number;
  createdAt:     string;
}

const STATUS_COLOR: Record<string, string> = {
  paid:        "#10b981",
  processing:  "#3b82f6",
  shipped:     "#8b5cf6",
  delivered:   "#059669",
  cancelled:   "#ef4444",
  refunded:    "#f59e0b",
  pending:     "#9ca3af",
  awaiting_payment: "#f59e0b",
};

export default function VendorOrdersPage() {
  const [items, setItems]     = useState<Order[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/next-api/vendor/orders")
      .then(r => r.json())
      .then((d: { items: Order[]; total: number }) => { setItems(d.items); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>My Orders ({total})</h1>
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No orders yet.</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Order #", "Customer", "Total", "Status", "Date"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{o.orderNumber}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{o.customerEmail}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {(o.totalCents / 100).toLocaleString("en-EU", { style: "currency", currency: "EUR" })}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 10px", borderRadius: 12,
                      background: `${STATUS_COLOR[o.status] ?? "#9ca3af"}22`,
                      color: STATUS_COLOR[o.status] ?? "#9ca3af",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>
                    {new Date(o.createdAt).toLocaleDateString()}
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
