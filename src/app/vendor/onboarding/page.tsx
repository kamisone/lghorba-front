"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VendorOnboardingPage() {
  const params    = useSearchParams();
  const completed = params.get("complete") === "1";
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function startOnboarding() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/next-api/vendor/onboarding", { method: "POST" });
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok || !data.url) { setError(data.message ?? "Failed to generate onboarding link"); return; }
      window.location.href = data.url;
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>Stripe Connect Onboarding</h1>
      <p style={{ margin: "0 0 24px", color: "#6b7280" }}>
        Connect your Stripe account to receive payouts directly to your bank account.
      </p>

      {completed && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
          padding: "14px 18px", marginBottom: 20, color: "#166534",
        }}>
          Onboarding complete! Your account is being reviewed by Stripe. Payouts will be enabled once verified.
        </div>
      )}

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
          padding: "14px 18px", marginBottom: 20, color: "#dc2626",
        }}>
          {error}
        </div>
      )}

      <button
        onClick={startOnboarding}
        disabled={loading}
        style={{
          padding: "12px 28px", background: loading ? "#93c5fd" : "#2563eb",
          color: "#fff", border: "none", borderRadius: 8,
          fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}
      >
        {loading ? "Redirecting…" : completed ? "Restart onboarding" : "Start onboarding"}
      </button>

      <p style={{ marginTop: 20, fontSize: 13, color: "#9ca3af" }}>
        You will be redirected to Stripe to complete identity verification.
      </p>
    </div>
  );
}
