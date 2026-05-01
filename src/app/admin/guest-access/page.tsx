"use client";

import { useEffect, useState, useMemo } from "react";

type GuestAction = "open" | "close" | "parking";
type TokenStatus = "active" | "expired" | "revoked";
type Lang = "fr" | "en";

interface Car {
  id: string;
  name: string;
  immatriculation: string;
}

interface GuestToken {
  id: string;
  label: string | null;
  carId: string;
  allowedActions: GuestAction[];
  expiresAt: string;
  revokedAt: string | null;
  usageCount: number;
  createdAt: string;
}

interface AuditLog {
  id: string;
  tokenId: string;
  action: string;
  success: boolean;
  failReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<GuestAction, string> = {
  open: "Unlock", close: "Lock", parking: "Parking",
};

const STATUS_COLOR: Record<TokenStatus, string> = {
  active:  "#22c55e",
  expired: "#94a3b8",
  revoked: "#ef4444",
};

function tokenStatus(t: GuestToken): TokenStatus {
  if (t.revokedAt) return "revoked";
  if (new Date(t.expiresAt) < new Date()) return "expired";
  return "active";
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

function fmtDateShort(s: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(s));
}

const defaultExpiry = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString().slice(0, 16);
};

type Tab = "tokens" | "audit";

export default function AdminGuestAccessPage() {
  const [tab, setTab]             = useState<Tab>("tokens");

  // Cars
  const [cars, setCars]           = useState<Car[]>([]);

  // Tokens
  const [tokens, setTokens]       = useState<GuestToken[]>([]);
  const [tokensLoading, setTL]    = useState(true);
  const [statusFilter, setStatus] = useState<TokenStatus | "">("");
  const [carFilter, setCarFilter] = useState("");
  const [revoking, setRevoking]   = useState<string | null>(null);

  // Audit
  const [audit, setAudit]               = useState<AuditLog[]>([]);
  const [auditLoading, setAL]           = useState(false);
  const [auditTokenId, setAuditTId]     = useState("");
  const [auditAction, setAuditAction]   = useState("");
  const [auditSuccess, setAuditSuccess] = useState<"" | "true" | "false">("");

  // Create form
  const [showForm, setShowForm]   = useState(false);
  const [creating, setCreating]   = useState(false);
  const [newLink, setNewLink]     = useState<string | null>(null);
  const [formCarId, setFormCarId]       = useState("");
  const [formLabel, setFormLabel]       = useState("");
  const [formActions, setFormActions]   = useState<GuestAction[]>(["open"]);
  const [formExpiry, setFormExpiry]     = useState(defaultExpiry);
  const [formLang, setFormLang]         = useState<Lang>("fr");

  const loadCars = async () => {
    try {
      const res = await fetch("/next-api/cars");
      if (res.ok) {
        const data: Car[] = await res.json();
        setCars(data);
        if (data.length > 0 && !formCarId) setFormCarId(data[0].id);
      }
    } catch { /* silent */ }
  };

  const loadTokens = async () => {
    setTL(true);
    try {
      const res = await fetch("/next-api/admin/guest-tokens");
      if (res.ok) setTokens(await res.json());
    } finally {
      setTL(false);
    }
  };

  const loadAudit = async (tokenId?: string) => {
    setAL(true);
    try {
      const qs = tokenId ? `?tokenId=${tokenId}` : "";
      const res = await fetch(`/next-api/admin/guest-tokens/audit${qs}`);
      if (res.ok) setAudit(await res.json());
    } finally {
      setAL(false);
    }
  };

  useEffect(() => {
    loadCars();
    loadTokens();
  }, []);

  useEffect(() => {
    if (tab === "audit") loadAudit(auditTokenId || undefined);
  }, [tab]);

  const carMap = useMemo(() => Object.fromEntries(cars.map((c) => [c.id, c])), [cars]);
  const carFilterIds = useMemo(() => Array.from(new Set(tokens.map((t) => t.carId))), [tokens]);

  const filteredTokens = useMemo(() =>
    tokens.filter((t) => {
      if (statusFilter && tokenStatus(t) !== statusFilter) return false;
      if (carFilter && t.carId !== carFilter) return false;
      return true;
    }),
  [tokens, statusFilter, carFilter]);

  const filteredAudit = useMemo(() =>
    audit.filter((a) => {
      if (auditAction && a.action !== auditAction) return false;
      if (auditSuccess === "true" && !a.success) return false;
      if (auditSuccess === "false" && a.success) return false;
      return true;
    }),
  [audit, auditAction, auditSuccess]);

  const uniqueAuditActions = useMemo(() => Array.from(new Set(audit.map((a) => a.action))).sort(), [audit]);

  const toggleFormAction = (a: GuestAction) => {
    setFormActions((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const handleCreate = async () => {
    if (!formCarId || formActions.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/next-api/admin/guest-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId:          formCarId,
          label:          formLabel || null,
          allowedActions: formActions,
          expiresAt:      new Date(formExpiry).toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/guest-access/${data.rawToken}?lang=${formLang}`;
        setNewLink(link);
        setShowForm(false);
        setFormLabel("");
        setFormActions(["open"]);
        setFormExpiry(defaultExpiry());
        await loadTokens();
      } else {
        alert("Failed to create guest token");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this token? The guest will no longer be able to use the link.")) return;
    setRevoking(id);
    try {
      const res = await fetch(`/next-api/admin/guest-tokens/${id}/revoke`, { method: "DELETE" });
      if (res.ok) await loadTokens();
      else alert("Failed to revoke token");
    } finally {
      setRevoking(null);
    }
  };

  const handleDrillAudit = (tokenId: string) => {
    setAuditTId(tokenId);
    setTab("audit");
    loadAudit(tokenId);
  };

  const handleAuditTokenFilter = (tokenId: string) => {
    setAuditTId(tokenId);
    loadAudit(tokenId || undefined);
  };

  const carName = (id: string) => {
    const c = carMap[id];
    return c ? `${c.name} (${c.immatriculation})` : id.slice(0, 8) + "…";
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Guest Access</h1>
        {!showForm && tab === "tokens" && (
          <button
            onClick={() => { setShowForm(true); setNewLink(null); }}
            style={{ padding: "8px 16px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
          >
            + New Link
          </button>
        )}
      </div>

      {/* New link banner */}
      {newLink && (
        <div style={{ background: "#f0fdf4", border: "1px solid #22c55e", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#166534", marginBottom: "8px" }}>Guest link created — share this URL:</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <code style={{ fontSize: "12px", wordBreak: "break-all", flex: 1, color: "#0f172a", background: "#dcfce7", padding: "6px 10px", borderRadius: "4px" }}>
              {newLink}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newLink)}
              style={{ padding: "6px 14px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Copy
            </button>
          </div>
          <button onClick={() => setNewLink(null)} style={{ marginTop: "8px", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "11px", padding: 0 }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>New guest link</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Car *</label>
              <select value={formCarId} onChange={(e) => setFormCarId(e.target.value)} style={inputStyle}>
                <option value="">— select a car —</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.immatriculation})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Label (optional)</label>
              <input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Delivery — John"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Language</label>
              <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                {(["fr", "en"] as Lang[]).map((l) => (
                  <label key={l} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: formLang === l ? 700 : 400 }}>
                    <input type="radio" name="lang" value={l} checked={formLang === l} onChange={() => setFormLang(l)} />
                    {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Allowed actions *</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {(["open", "close", "parking"] as GuestAction[]).map((a) => (
                  <label key={a} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "13px" }}>
                    <input type="checkbox" checked={formActions.includes(a)} onChange={() => toggleFormAction(a)} />
                    {ACTION_LABEL[a]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Expires at *</label>
              <input type="datetime-local" value={formExpiry} onChange={(e) => setFormExpiry(e.target.value)} style={inputStyle} />
            </div>

          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={handleCreate}
              disabled={creating || !formCarId || formActions.length === 0}
              style={{ padding: "9px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
            >
              {creating ? "Creating…" : "Create link"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: "9px 16px", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" }}>
        {(["tokens", "audit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: 600,
              color: tab === t ? "#0f172a" : "#94a3b8",
              borderBottom: tab === t ? "2px solid #0f172a" : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            {t === "tokens" ? `Tokens (${tokens.length})` : "Audit Log"}
          </button>
        ))}
      </div>

      {/* ── Tokens tab ── */}
      {tab === "tokens" && (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value as TokenStatus | "")} style={selectStyle}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>

            {carFilterIds.length > 1 && (
              <select value={carFilter} onChange={(e) => setCarFilter(e.target.value)} style={selectStyle}>
                <option value="">All cars</option>
                {carFilterIds.map((id) => (
                  <option key={id} value={id}>{carName(id)}</option>
                ))}
              </select>
            )}

            <button onClick={loadTokens} style={refreshBtnStyle}>Refresh</button>
          </div>

          {tokensLoading ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>Loading…</p>
          ) : filteredTokens.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No tokens found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Status", "Label", "Car", "Actions", "Uses", "Expires", "Created", ""].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((t) => {
                    const status = tokenStatus(t);
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: status === "active" ? 1 : 0.65 }}>
                        <td style={tdStyle}>
                          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: "999px", background: `${STATUS_COLOR[status]}20`, color: STATUS_COLOR[status] }}>
                            {status}
                          </span>
                        </td>
                        <td style={tdStyle}>{t.label ?? <span style={{ color: "#94a3b8" }}>—</span>}</td>
                        <td style={{ ...tdStyle, fontSize: "12px", color: "#475569" }}>{carName(t.carId)}</td>
                        <td style={tdStyle}>{t.allowedActions.map((a) => ACTION_LABEL[a as GuestAction] ?? a).join(", ")}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{t.usageCount}</td>
                        <td style={{ ...tdStyle, color: "#475569" }}>{fmtDate(t.expiresAt)}</td>
                        <td style={{ ...tdStyle, color: "#475569" }}>{fmtDate(t.createdAt)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => handleDrillAudit(t.id)} style={ghostBtnStyle}>Audit</button>
                            {status === "active" && (
                              <button
                                onClick={() => handleRevoke(t.id)}
                                disabled={revoking === t.id}
                                style={{ padding: "3px 9px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                              >
                                {revoking === t.id ? "…" : "Revoke"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Audit tab ── */}
      {tab === "audit" && (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <select value={auditTokenId} onChange={(e) => handleAuditTokenFilter(e.target.value)} style={selectStyle}>
              <option value="">All tokens</option>
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>{t.label ?? t.id.slice(0, 8) + "…"}</option>
              ))}
            </select>

            <select value={auditAction} onChange={(e) => setAuditAction(e.target.value)} style={selectStyle}>
              <option value="">All actions</option>
              {uniqueAuditActions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <select value={auditSuccess} onChange={(e) => setAuditSuccess(e.target.value as "" | "true" | "false")} style={selectStyle}>
              <option value="">All results</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>

            <button onClick={() => loadAudit(auditTokenId || undefined)} style={refreshBtnStyle}>Refresh</button>

            {auditTokenId && (
              <button onClick={() => { setAuditTId(""); loadAudit(); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#3b82f6" }}>
                ✕ Clear filter
              </button>
            )}
          </div>

          {auditLoading ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>Loading…</p>
          ) : filteredAudit.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No audit events found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Time", "Token", "Action", "Result", "Reason", "IP", "User Agent"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#475569" }}>{fmtDateShort(a.createdAt)}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                        <button
                          onClick={() => { setAuditTId(a.tokenId); loadAudit(a.tokenId); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "11px", fontFamily: "monospace", padding: 0 }}
                        >
                          {a.tokenId.slice(0, 8)}…
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <code style={{ fontSize: "11px", background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px" }}>{a.action}</code>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: "999px", background: a.success ? "#f0fdf4" : "#fef2f2", color: a.success ? "#22c55e" : "#ef4444" }}>
                          {a.success ? "OK" : "FAIL"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b" }}>{a.failReason ?? "—"}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{a.ipAddress ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "#94a3b8", fontSize: "11px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.userAgent ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, color: "#475569",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0",
  borderRadius: "6px", fontSize: "13px", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0",
  fontSize: "13px", background: "#fff",
};
const thStyle: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569",
  fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = { padding: "10px 12px", color: "#334155" };
const ghostBtnStyle: React.CSSProperties = {
  padding: "3px 9px", background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: "4px", cursor: "pointer", fontSize: "11px",
};
const refreshBtnStyle: React.CSSProperties = {
  padding: "6px 14px", background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: "6px", cursor: "pointer", fontSize: "13px",
};
