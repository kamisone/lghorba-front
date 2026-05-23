"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Country {
  isoCode: string;
  name: string;
  nativeName: string | null;
  phonePrefix: string | null;
  currencyCode: string | null;
  continentCode: string | null;
  isActive: boolean;
  isShippingEnabled: boolean;
  isEuVat: boolean;
}

function flagEmoji(isoCode: string) {
  return isoCode
    .toUpperCase()
    .split("")
    .map(c => String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65))
    .join("");
}

export default function CountriesPage() {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/countries");
      if (res.ok) setCountries(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggle(isoCode: string, field: "isActive" | "isShippingEnabled", current: boolean) {
    setUpdating(isoCode + field);
    const res = await fetch(`/next-api/admin/shop/countries/${isoCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !current }),
    });
    if (res.ok) {
      const updated: Country = await res.json();
      setCountries(prev => prev.map(c => c.isoCode === isoCode ? updated : c));
      toast.success("Country updated");
    } else {
      toast.error("Failed to update country");
    }
    setUpdating(null);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Countries</h1>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Name</th>
            <th>ISO</th>
            <th>Currency</th>
            <th>EU VAT</th>
            <th>Shipping enabled</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  {[24, 120, 40, 50, 50, 80, 60].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : countries.map(c => (
                <tr key={c.isoCode}>
                  <td style={{ fontSize: 22 }}>{flagEmoji(c.isoCode)}</td>
                  <td><strong>{c.name}</strong>{c.nativeName && c.nativeName !== c.name && <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 6 }}>({c.nativeName})</span>}</td>
                  <td style={{ color: "#6b7280", fontSize: 13, fontFamily: "monospace" }}>{c.isoCode}</td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>{c.currencyCode ?? "—"}</td>
                  <td>
                    {c.isEuVat
                      ? <span className={`${styles.badge} ${styles.badgePublished}`}>EU VAT</span>
                      : <span style={{ color: "#9ca3af", fontSize: 13 }}>—</span>}
                  </td>
                  <td>
                    <button
                      disabled={updating === c.isoCode + "isShippingEnabled"}
                      className={`${styles.btn} ${c.isShippingEnabled ? styles.btnSuccess : styles.btnSecondary}`}
                      style={{ fontSize: 12, padding: "4px 12px" }}
                      onClick={() => toggle(c.isoCode, "isShippingEnabled", c.isShippingEnabled)}
                    >
                      {c.isShippingEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td>
                    <button
                      disabled={updating === c.isoCode + "isActive"}
                      className={`${styles.btn} ${c.isActive ? styles.btnSuccess : styles.btnSecondary}`}
                      style={{ fontSize: 12, padding: "4px 12px" }}
                      onClick={() => toggle(c.isoCode, "isActive", c.isActive)}
                    >
                      {c.isActive ? "Active" : "Hidden"}
                    </button>
                  </td>
                </tr>
              ))
          }
          {!loading && countries.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No countries seeded yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
