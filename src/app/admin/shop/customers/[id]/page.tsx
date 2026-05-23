"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Address {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

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
  paymentType?: { code: string; name: string } | null;
}

interface Customer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpentCents: number;
  marketingOptIn: boolean;
  createdAt: string;
  addresses: Address[];
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/next-api/admin/shop/customers/${id}`),
      fetch(`/next-api/admin/shop/payment-methods/customer/${id}`),
    ]).then(async ([custRes, pmRes]) => {
      if (custRes.status === 404) { setNotFound(true); return; }
      if (custRes.ok) setCustomer(await custRes.json());
      if (pmRes.ok) setPaymentMethods(await pmRes.json());
    }).finally(() => setLoading(false));
  }, [id]);

  async function removePaymentMethod(pmId: string) {
    if (!confirm("Remove this saved payment method?")) return;
    const res = await fetch(`/next-api/admin/shop/payment-methods/${pmId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Payment method removed"); setPaymentMethods(prev => prev.filter(m => m.id !== pmId)); }
    else toast.error("Failed to remove payment method");
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.skeleton} style={{ height: 28, width: 200 }} />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <span className={styles.skeleton} style={{ height: 16, width: 300 + i * 20 }} />
          </div>
        ))}
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Customer not found</h1>
          <Link href="/admin/shop/customers" className={`${styles.btn} ${styles.btnSecondary}`}>← Back</Link>
        </div>
      </div>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{fullName}</h1>
        <Link href="/admin/shop/customers" className={`${styles.btn} ${styles.btnSecondary}`}>← Back</Link>
      </div>

      {/* Profile */}
      <section style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Profile</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</p>
            <p style={{ fontWeight: 500 }}>{customer.email}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Phone</p>
            <p style={{ fontWeight: 500 }}>{customer.phone ?? "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total orders</p>
            <p style={{ fontWeight: 500 }}>{customer.totalOrders}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total spent</p>
            <p style={{ fontWeight: 500 }}>€{(customer.totalSpentCents / 100).toFixed(2)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Marketing opt-in</p>
            <p style={{ fontWeight: 500 }}>{customer.marketingOptIn ? "Yes" : "No"}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Joined</p>
            <p style={{ fontWeight: 500 }}>{new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </section>

      {/* Addresses */}
      <section style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Saved addresses</h2>
        {customer.addresses.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No addresses saved</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {customer.addresses.map(addr => (
              <div key={addr.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, position: "relative" }}>
                {addr.isDefault && (
                  <span className={`${styles.badge} ${styles.badgePublished}`} style={{ position: "absolute", top: 12, right: 12, fontSize: 11 }}>
                    Default
                  </span>
                )}
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{addr.name}</p>
                <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
                  {addr.line1}<br />
                  {addr.line2 && <>{addr.line2}<br /></>}
                  {addr.city}, {addr.zip}<br />
                  {addr.country}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment methods */}
      <section style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Saved payment methods</h2>
        {paymentMethods.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No saved payment methods</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {paymentMethods.map(pm => (
              <div key={pm.id} style={{ display: "flex", alignItems: "center", gap: 16, border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, marginBottom: 2 }}>
                    {pm.cardLast4 ? `${pm.cardBrand ?? pm.provider} •••• ${pm.cardLast4}` : (pm.paymentType?.name ?? pm.provider)}
                    {pm.isDefault && <span className={`${styles.badge} ${styles.badgePublished}`} style={{ marginLeft: 8, fontSize: 11 }}>Default</span>}
                  </p>
                  {pm.cardExpMonth && <p style={{ fontSize: 12, color: "#6b7280" }}>Expires {String(pm.cardExpMonth).padStart(2, "0")}/{pm.cardExpYear}</p>}
                </div>
                <span className={`${styles.badge} ${{active: styles.badgeActive, expired: styles.badgePending, detached: styles.badgeDraft}[pm.status] ?? styles.badgeDraft}`}>
                  {pm.status}
                </span>
                <button className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => removePaymentMethod(pm.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
