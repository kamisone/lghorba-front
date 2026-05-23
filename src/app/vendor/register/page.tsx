"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ businessName: "", email: "", password: "", website: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/next-api/vendor/auth?action=register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, website: form.website || undefined }),
      });
      const data = await res.json().catch(() => ({})) as { message?: string; email?: string };
      if (!res.ok) { setError(data.message ?? "Registration failed"); return; }
      router.push("/vendor/login?registered=1");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 14, boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <div style={{ background: "#fff", padding: 40, borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: 420 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700 }}>Apply to sell</h1>
        <p style={{ margin: "0 0 28px", color: "#6b7280", fontSize: 14 }}>Your account will be reviewed before activation.</p>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 14 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {[
            { label: "Business name", field: "businessName", type: "text",     required: true },
            { label: "Email",         field: "email",        type: "email",    required: true },
            { label: "Password",      field: "password",     type: "password", required: true },
            { label: "Website",       field: "website",      type: "url",      required: false },
          ].map(({ label, field, type, required }) => (
            <div key={field} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
                {label}{required ? "" : " (optional)"}
              </label>
              <input
                type={type}
                value={(form as Record<string, string>)[field]}
                onChange={set(field)}
                required={required}
                style={inputStyle}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 8, padding: "11px 0",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}
          >
            {loading ? "Submitting…" : "Submit application"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b7280" }}>
          Already have an account?{" "}
          <Link href="/vendor/login" style={{ color: "#2563eb", textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
