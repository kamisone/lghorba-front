"use client";

import { useEffect, useState, useCallback } from "react";

type GuestAction = "open" | "close" | "parking";

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

interface GuestTokenWithRaw extends GuestToken {
  rawToken?: string;
}

const ACTION_LABELS: Record<GuestAction, string> = {
  open: "Unlock", close: "Lock", parking: "Parking",
};

const ALL_ACTIONS: GuestAction[] = ["open", "close", "parking"];

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

function isExpired(token: GuestToken) {
  return new Date(token.expiresAt) < new Date();
}
function isRevoked(token: GuestToken) {
  return !!token.revokedAt;
}
function tokenStatus(token: GuestToken): "active" | "expired" | "revoked" {
  if (isRevoked(token)) return "revoked";
  if (isExpired(token)) return "expired";
  return "active";
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  expired: "#94a3b8",
  revoked: "#ef4444",
};

const defaultExpiry = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString().slice(0, 16);
};

export default function GuestTokenManager({ carId }: { carId: string }) {
  const [tokens, setTokens]       = useState<GuestTokenWithRaw[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [creating, setCreating]   = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);
  const [newLink, setNewLink]     = useState<string | null>(null);

  const [label, setLabel]                 = useState("");
  const [actions, setActions]             = useState<GuestAction[]>(["open"]);
  const [expiresAt, setExpiresAt]         = useState(defaultExpiry);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/guest-tokens");
      if (res.ok) {
        const all: GuestToken[] = await res.json();
        setTokens(all.filter((t) => t.carId === carId));
      }
    } finally {
      setLoading(false);
    }
  }, [carId]);

  useEffect(() => { load(); }, [load]);

  const toggleAction = (a: GuestAction) => {
    setActions((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const handleCreate = async () => {
    if (actions.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/next-api/admin/guest-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          label:          label || null,
          allowedActions: actions,
          expiresAt:      new Date(expiresAt).toISOString(),
        }),
      });
      if (res.ok) {
        const data: GuestTokenWithRaw = await res.json();
        const link = `${window.location.origin}/guest-access/${data.rawToken}`;
        setNewLink(link);
        setShowForm(false);
        setLabel("");
        setActions(["open"]);
        setExpiresAt(defaultExpiry());
        await load();
      } else {
        alert("Failed to create guest token");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this link? The guest will no longer be able to use it.")) return;
    setRevoking(id);
    try {
      const res = await fetch(`/next-api/admin/guest-tokens/${id}/revoke`, { method: "DELETE" });
      if (res.ok) await load();
      else alert("Failed to revoke token");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Guest Access Links</h2>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setNewLink(null); }}
            style={{ padding: "6px 14px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
          >
            + New Link
          </button>
        )}
      </div>

      {/* New link banner */}
      {newLink && (
        <div style={{ background: "#f0fdf4", border: "1px solid #22c55e", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#166534", marginBottom: "6px" }}>Guest link created — share it:</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <code style={{ fontSize: "11px", wordBreak: "break-all", flex: 1, color: "#0f172a" }}>{newLink}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(newLink); }}
              style={{ padding: "4px 10px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Copy
            </button>
          </div>
          <button onClick={() => setNewLink(null)} style={{ marginTop: "6px", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "11px", padding: 0 }}>Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Label (optional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Delivery — John Doe"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Allowed actions</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {ALL_ACTIONS.map((a) => (
                  <label key={a} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={actions.includes(a)}
                      onChange={() => toggleAction(a)}
                    />
                    {ACTION_LABELS[a]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Expires at</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCreate}
                disabled={creating || actions.length === 0}
                style={{ padding: "8px 18px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                {creating ? "Creating…" : "Create link"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: "8px 14px", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token list */}
      {loading ? (
        <p style={{ color: "#94a3b8", fontSize: "13px" }}>Loading…</p>
      ) : tokens.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: "13px" }}>No guest links yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {tokens.map((t) => {
            const status = tokenStatus(t);
            return (
              <div
                key={t.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                  opacity: status !== "active" ? 0.65 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      {t.label ?? "Untitled"}
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                      padding: "1px 7px", borderRadius: "999px",
                      background: `${STATUS_COLOR[status]}20`,
                      color: STATUS_COLOR[status],
                    }}>
                      {status}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <span>Actions: {t.allowedActions.map((a) => ACTION_LABELS[a]).join(", ")}</span>
                    <span>Uses: {t.usageCount}</span>
                    <span>Expires: {fmtDate(t.expiresAt)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  {status === "active" && (
                    <button
                      onClick={() => handleRevoke(t.id)}
                      disabled={revoking === t.id}
                      style={{ padding: "4px 10px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "5px", cursor: "pointer", fontSize: "11px" }}
                    >
                      {revoking === t.id ? "…" : "Revoke"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  fontSize: "13px",
  boxSizing: "border-box",
};
