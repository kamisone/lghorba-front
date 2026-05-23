"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface PaymentMethod {
  id: string;
  provider: string;
  providerMethodId: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
  status: "active" | "expired" | "detached";
  createdAt: string;
  customer?: { id: string; email: string; firstName: string | null; lastName: string | null };
  paymentType?: { code: string; name: string } | null;
}

const STATUS_CLASS: Record<string, string> = {
  active:   styles.badgeActive,
  expired:  styles.badgePending,
  detached: styles.badgeDraft,
};

export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const [methods, setMethods]   = useState<PaymentMethod[]>([]);
  const [total, setTotal]       = useState(0);
  const [status, setStatus]     = useState("");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (status) qs.set("status", status);
      const res = await fetch(`/next-api/admin/shop/payment-methods?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setMethods(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, status]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this payment method record?")) return;
    const res = await fetch(`/next-api/admin/shop/payment-methods/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment method removed");
      setMethods(prev => prev.filter(m => m.id !== id));
      setTotal(t => t - 1);
    } else {
      toast.error("Failed to remove");
    }
  }

  function cardLabel(m: PaymentMethod) {
    if (m.cardLast4) return `${m.cardBrand ?? m.provider} •••• ${m.cardLast4}`;
    return m.paymentType?.name ?? m.provider;
  }

  function expiry(m: PaymentMethod) {
    if (!m.cardExpMonth || !m.cardExpYear) return "—";
    return `${String(m.cardExpMonth).padStart(2, "0")}/${m.cardExpYear}`;
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Saved Payment Methods</h1>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="detached">Detached</option>
        </select>
        <span style={{ fontSize: 14, color: "#6b7280", marginLeft: "auto" }}>{total} methods</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Card / Method</th>
            <th>Expiry</th>
            <th>Customer</th>
            <th>Provider ID</th>
            <th>Default</th>
            <th>Status</th>
            <th>Saved</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {[130, 60, 160, 160, 50, 70, 80, 60].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : methods.map(m => (
                <tr key={m.id}>
                  <td><strong>{cardLabel(m)}</strong></td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>{expiry(m)}</td>
                  <td>
                    {m.customer
                      ? <Link href={`/admin/shop/customers/${m.customer.id}`} style={{ color: "#1d4ed8", fontSize: 13 }}>
                          {[m.customer.firstName, m.customer.lastName].filter(Boolean).join(" ") || m.customer.email}
                        </Link>
                      : "—"}
                  </td>
                  <td><code style={{ fontSize: 11, color: "#6b7280" }}>{m.providerMethodId}</code></td>
                  <td style={{ textAlign: "center" }}>
                    {m.isDefault ? <span style={{ color: "#059669", fontSize: 18 }}>✓</span> : "—"}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${STATUS_CLASS[m.status] ?? styles.badgeDraft}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => handleDelete(m.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
          }
          {!loading && methods.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No saved payment methods</td></tr>
          )}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{total} records</span>
        {Array.from({ length: pages }, (_, i) => (
          <button key={i} onClick={() => setPage(i + 1)}
            className={`${styles.btn} ${page === i + 1 ? styles.btnPrimary : styles.btnSecondary}`}
            style={{ padding: "4px 10px", minWidth: 36 }}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
