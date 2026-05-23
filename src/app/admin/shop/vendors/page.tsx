"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Vendor {
  id:            string;
  businessName:  string;
  email:         string;
  status:        string;
  payoutsStatus: string;
  platformFeeBps: number;
  createdAt:     string;
}

const STATUS_COLOR: Record<string, string> = {
  active:    "#10b981",
  pending:   "#f59e0b",
  suspended: "#ef4444",
};

const PAYOUT_COLOR: Record<string, string> = {
  enabled:       "#10b981",
  pending:       "#f59e0b",
  disabled:      "#ef4444",
  not_connected: "#9ca3af",
};

export default function AdminVendorsPage() {
  const [items, setItems]     = useState<Vendor[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/next-api/admin/shop/vendors");
    const d   = await res.json() as { items: Vendor[]; total: number };
    setItems(d.items); setTotal(d.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/next-api/admin/shop/vendors/${id}/status`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Vendors ({total})</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Manage marketplace vendors</p>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Business", "Email", "Status", "Payouts", "Fee", "Joined", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }, (_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {[130, 150, 70, 80, 40, 70, 100].map((w, j) => (
                    <td key={j} style={{ padding: "12px 16px" }}>
                      <span className={styles.skeleton} style={{ height: 14, width: w }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No vendors yet.</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Business", "Email", "Status", "Payouts", "Fee", "Joined", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(v => (
                <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{v.businessName}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{v.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 10px", borderRadius: 12,
                      background: `${STATUS_COLOR[v.status] ?? "#9ca3af"}22`,
                      color: STATUS_COLOR[v.status] ?? "#9ca3af",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 10px", borderRadius: 12,
                      background: `${PAYOUT_COLOR[v.payoutsStatus] ?? "#9ca3af"}22`,
                      color: PAYOUT_COLOR[v.payoutsStatus] ?? "#9ca3af",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {v.payoutsStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>
                    {(v.platformFeeBps / 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>
                    {new Date(v.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {v.status !== "active" && (
                        <button
                          onClick={() => setStatus(v.id, "active")}
                          disabled={updating === v.id}
                          style={{ padding: "4px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}
                        >
                          Activate
                        </button>
                      )}
                      {v.status !== "suspended" && (
                        <button
                          onClick={() => setStatus(v.id, "suspended")}
                          disabled={updating === v.id}
                          style={{ padding: "4px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}
                        >
                          Suspend
                        </button>
                      )}
                      {v.status !== "pending" && (
                        <button
                          onClick={() => setStatus(v.id, "pending")}
                          disabled={updating === v.id}
                          style={{ padding: "4px 10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}
                        >
                          Pending
                        </button>
                      )}
                    </div>
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
