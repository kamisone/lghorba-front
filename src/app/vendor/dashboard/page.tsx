"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalProducts:       number;
  totalOrders:         number;
  totalEarnedCents:    number;
  pendingPayoutsCents: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: "#fff", padding: "24px 28px", borderRadius: 10,
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)", minWidth: 180,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-EU", { style: "currency", currency: "EUR" });
}

export default function VendorDashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/next-api/vendor/dashboard")
      .then(r => r.json())
      .then(d => setStats(d as Stats))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
      <p style={{ margin: "0 0 28px", color: "#6b7280" }}>Your store at a glance</p>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading…</p>
      ) : !stats ? (
        <p style={{ color: "#ef4444" }}>Failed to load stats</p>
      ) : (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
          <StatCard label="Products"        value={stats.totalProducts} />
          <StatCard label="Orders"          value={stats.totalOrders} />
          <StatCard label="Total earned"    value={fmt(stats.totalEarnedCents)} />
          <StatCard label="Pending payouts" value={fmt(stats.pendingPayoutsCents)} />
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { href: "/vendor/products",  label: "View Products" },
          { href: "/vendor/orders",    label: "View Orders" },
          { href: "/vendor/payouts",   label: "View Payouts" },
          { href: "/vendor/onboarding", label: "Connect Stripe" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: "10px 20px", background: "#2563eb", color: "#fff",
              borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 500,
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
