"use client";

import { useEffect, useState } from "react";

interface Payout {
  id:               string;
  orderId:          string;
  grossCents:       number;
  platformFeeCents: number;
  netCents:         number;
  status:           string;
  stripeTransferId: string | null;
  createdAt:        string;
}

const STATUS_COLOR: Record<string, string> = {
  transferred: "#10b981",
  pending:     "#f59e0b",
  failed:      "#ef4444",
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-EU", { style: "currency", currency: "EUR" });
}

export default function VendorPayoutsPage() {
  const [items, setItems]         = useState<Payout[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalNetCents, setNet]   = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/next-api/vendor/payouts")
      .then(r => r.json())
      .then((d: { items: Payout[]; total: number; totalNetCents: number }) => {
        setItems(d.items); setTotal(d.total); setNet(d.totalNetCents);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Payouts ({total})</h1>
        {!loading && (
          <span style={{ color: "#10b981", fontWeight: 600, fontSize: 16 }}>
            Total received: {fmt(totalNetCents)}
          </span>
        )}
      </div>
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No payouts yet. Connect Stripe to start receiving payments.</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Date", "Gross", "Fee", "Net", "Status", "Transfer ID"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{fmt(p.grossCents)}</td>
                  <td style={{ padding: "12px 16px", color: "#ef4444" }}>-{fmt(p.platformFeeCents)}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{fmt(p.netCents)}</td>
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
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12, fontFamily: "monospace" }}>
                    {p.stripeTransferId ?? "—"}
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
