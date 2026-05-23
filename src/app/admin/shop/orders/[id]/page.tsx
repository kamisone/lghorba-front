"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:          ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid:             ["processing", "refunded", "cancelled"],
  processing:       ["shipped", "refunded", "cancelled"],
  shipped:          ["delivered"],
  delivered:        ["refunded"],
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    fetch(`/next-api/shop/orders/${params.id}`).then(r => r.json()).then(setOrder);
  }, [params.id]);

  async function handleTransition(newStatus: string) {
    if (!confirm(`Change status to "${newStatus}"?`)) return;
    setTransitioning(true);
    const res = await fetch(`/next-api/shop/orders/${params.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrder(updated);
      toast.success(`Status updated to "${newStatus.replace(/_/g, " ")}"`);
    } else {
      toast.error("Failed to update order status");
    }
    setTransitioning(false);
  }

  if (!order) return <div className={styles.container}>Loading...</div>;

  const addr = order.shippingAddressSnapshot ?? {};
  const allowed = ORDER_TRANSITIONS[order.status] ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Order {order.orderNumber}</h1>
        <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnSecondary}`}>← Back</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <div>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3>Customer</h3>
            <p>{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p>{order.customerPhone}</p>
            <h3 style={{ marginTop: 16 }}>Shipping Address</h3>
            <p>{addr.name}</p>
            <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
            <p>{addr.city}, {addr.zip}, {addr.country}</p>
          </div>

          <h3>Items</h3>
          <table className={styles.table}>
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
            <tbody>
              {(order.items ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td>{item.titleSnapshot}</td>
                  <td style={{ color: "#9ca3af" }}>{item.skuSnapshot ?? "—"}</td>
                  <td>{item.quantity}</td>
                  <td>€{(item.unitPriceCents / 100).toFixed(2)}</td>
                  <td>€{(item.totalCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3>Summary</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Subtotal</span><span>€{(order.subtotalCents / 100).toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Shipping</span><span>€{(order.shippingCents / 100).toFixed(2)}</span></div>
            {order.discountCents > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Discount</span><span>-€{(order.discountCents / 100).toFixed(2)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}><span>Total</span><span>€{(order.totalCents / 100).toFixed(2)}</span></div>
          </div>

          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <h3>Status: <span style={{ color: "#1d4ed8" }}>{order.status.replace(/_/g, " ")}</span></h3>
            {allowed.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {allowed.map(s => (
                  <button key={s} disabled={transitioning} onClick={() => handleTransition(s)} className={`${styles.btn} ${styles.btnSecondary}`}>
                    → {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}

            <h4 style={{ marginTop: 20 }}>History</h4>
            {(order.statusHistory ?? []).map((h: any) => (
              <div key={h.id} style={{ fontSize: 13, marginBottom: 6, color: "#6b7280" }}>
                <strong>{new Date(h.createdAt).toLocaleString()}</strong>: {h.fromStatus ? `${h.fromStatus} →` : "Created as"} {h.toStatus}
                {h.note && <span style={{ marginLeft: 4, color: "#9ca3af" }}>({h.note})</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
