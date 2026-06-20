"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, AlertCircle } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "./track.module.css";

export default function OrderTrackLookupPage({ params }: { params: { locale: string } }) {
  const t = getTranslations(params.locale).shop;
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = orderNumber.trim().toUpperCase();
    const em = email.trim().toLowerCase();
    if (!num || !em) return;

    setLoading(true);
    setError("");

    const res = await fetch(`/next-api/public/shop/orders/${encodeURIComponent(num)}/track?email=${encodeURIComponent(em)}`);
    if (res.ok) {
      router.push(`/${params.locale}/shop/orders/track/${num}?email=${encodeURIComponent(em)}`);
    } else {
      setError(t.trackOrderNotFound);
    }
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Package size={32} strokeWidth={1.5} />
        </div>
        <h1 className={styles.title}>{t.trackOrderTitle}</h1>
        <p className={styles.subtitle}>{t.trackOrderSubtitle}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t.trackOrderNumber}</label>
            <input
              className={styles.input}
              placeholder="ORD-000001"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t.trackOrderEmail}</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className={styles.error}>
              <AlertCircle size={15} />
              {error}
            </p>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <Search size={16} />
            {loading ? "..." : t.trackOrderSubmit}
          </button>
        </form>
      </div>
    </div>
  );
}
