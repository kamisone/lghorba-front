"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useModalUrl } from "@/hooks/useModalUrl";
import CreateGuestTokenModal from "@/components/admin/users/CreateGuestTokenModal";

type GuestAction = "open" | "close" | "parking";
type TokenStatus = "active" | "expired" | "revoked";

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

type Tab = "tokens" | "audit";

export default function AdminGuestAccessPage() {
  const { openModal, closeModal } = useModalUrl();
  const [showModal, setShowModal] = useState(false);
  const restored = useRef(false);

  const [tab, setTab]             = useState<Tab>("tokens");
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

  const loadCars = async () => {
    try {
      const res = await fetch("/next-api/cars");
      if (res.ok) setCars(await res.json());
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

  // Restore modal from URL on mount
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modal") === "create-guest-token") setShowModal(true);
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

  const uniqueAuditActions = useMemo(() =>
    Array.from(new Set(audit.map((a) => a.action))).sort(),
  [audit]);

  const handleOpenModal = () => {
    setShowModal(true);
    openModal("create-guest-token");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    closeModal();
  };

  const handleCreated = async () => {
    await loadTokens();
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
    <>
      <div style={{ padding: "24px", maxWidth: "1100px" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 2px", color: "var(--color-text-heading)" }}>
              Guest Access
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
              Manage time-limited guest links and review access logs
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 18px",
              background: "linear-gradient(135deg, var(--color-admin-secondary), var(--color-admin-indigo))",
              color: "#fff", border: "none", borderRadius: "9px",
              cursor: "pointer", fontSize: "13px", fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,92,143,0.3)",
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
            New link
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid var(--color-border)" }}>
          {(["tokens", "audit"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                fontSize: "14px", fontWeight: 600,
                color: tab === t ? "var(--color-text-heading)" : "var(--color-text-placeholder)",
                borderBottom: tab === t ? "2px solid var(--color-admin-secondary)" : "2px solid transparent",
                marginBottom: "-2px", transition: "color 0.15s",
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

              <button onClick={loadTokens} style={ghostBtnStyle}>Refresh</button>
            </div>

            {tokensLoading ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Loading…</p>
            ) : filteredTokens.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔑</div>
                <p style={{ fontSize: "14px", margin: 0, fontWeight: 500 }}>No tokens yet</p>
                <p style={{ fontSize: "13px", margin: "6px 0 16px" }}>Create a guest link to get started.</p>
                <button onClick={handleOpenModal} style={{ ...ghostBtnStyle, padding: "8px 18px", fontSize: "13px" }}>
                  + New link
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)" }}>
                      {["Status", "Label", "Car", "Actions", "Uses", "Expires", "Created", ""].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTokens.map((t) => {
                      const status = tokenStatus(t);
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--color-surface-raised)", opacity: status === "active" ? 1 : 0.6 }}>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                              padding: "2px 8px", borderRadius: "999px",
                              background: `${STATUS_COLOR[status]}20`, color: STATUS_COLOR[status],
                            }}>
                              {status}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{t.label ?? <span style={{ color: "var(--color-text-placeholder)" }}>—</span>}</td>
                          <td style={{ ...tdStyle, fontSize: "12px", color: "var(--color-text-secondary)" }}>{carName(t.carId)}</td>
                          <td style={tdStyle}>{t.allowedActions.map((a) => ACTION_LABEL[a as GuestAction] ?? a).join(", ")}</td>
                          <td style={{ ...tdStyle, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{t.usageCount}</td>
                          <td style={{ ...tdStyle, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(t.expiresAt)}</td>
                          <td style={{ ...tdStyle, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => handleDrillAudit(t.id)} style={ghostBtnStyle}>Audit</button>
                              {status === "active" && (
                                <button
                                  onClick={() => handleRevoke(t.id)}
                                  disabled={revoking === t.id}
                                  style={{ padding: "4px 10px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
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

              <button onClick={() => loadAudit(auditTokenId || undefined)} style={ghostBtnStyle}>Refresh</button>

              {auditTokenId && (
                <button
                  onClick={() => { setAuditTId(""); loadAudit(); }}
                  style={{ padding: "6px 10px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#3b82f6" }}
                >
                  ✕ Clear filter
                </button>
              )}
            </div>

            {auditLoading ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Loading…</p>
            ) : filteredAudit.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No audit events found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)" }}>
                      {["Time", "Token", "Action", "Result", "Reason", "IP", "User Agent"].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--color-surface-raised)" }}>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>{fmtDateShort(a.createdAt)}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px" }}>
                          <button
                            onClick={() => { setAuditTId(a.tokenId); loadAudit(a.tokenId); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "11px", fontFamily: "monospace", padding: 0 }}
                          >
                            {a.tokenId.slice(0, 8)}…
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <code style={{ fontSize: "11px", background: "var(--color-surface-raised)", padding: "1px 6px", borderRadius: "4px" }}>
                            {a.action}
                          </code>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                            padding: "2px 8px", borderRadius: "999px",
                            background: a.success ? "#f0fdf4" : "#fef2f2",
                            color: a.success ? "#22c55e" : "#ef4444",
                          }}>
                            {a.success ? "OK" : "FAIL"}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{a.failReason ?? "—"}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "var(--color-text-muted)" }}>{a.ipAddress ?? "—"}</td>
                        <td style={{ ...tdStyle, color: "var(--color-text-placeholder)", fontSize: "11px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* Modal */}
      {showModal && (
        <CreateGuestTokenModal
          onClose={handleCloseModal}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--color-border)",
  fontSize: "13px", background: "var(--color-white)", color: "var(--color-text-primary)",
};
const thStyle: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontWeight: 600,
  color: "var(--color-text-secondary)", fontSize: "11px",
  textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = { padding: "10px 12px", color: "var(--color-text-strong)" };
const ghostBtnStyle: React.CSSProperties = {
  padding: "4px 10px", background: "var(--color-surface)",
  border: "1px solid var(--color-border)", borderRadius: "6px",
  cursor: "pointer", fontSize: "11px", color: "var(--color-text-secondary)",
  fontWeight: 500,
};
