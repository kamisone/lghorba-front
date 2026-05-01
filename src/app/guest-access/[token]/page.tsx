"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type GuestAction = "open" | "close" | "parking";

interface TokenInfo {
  carId: string;
  label: string | null;
  allowedActions: GuestAction[];
  expiresAt: string;
  usageCount: number;
}

const ACTION_LABEL: Record<GuestAction, string> = {
  open:    "Unlock",
  close:   "Lock",
  parking: "Parking",
};

const ACTION_ICON: Record<GuestAction, string> = {
  open:    "🔓",
  close:   "🔒",
  parking: "🅿️",
};

const ACTION_COLOR: Record<GuestAction, string> = {
  open:    "#22c55e",
  close:   "#ef4444",
  parking: "#3b82f6",
};

type ButtonState = "idle" | "loading" | "success" | "error";

export default function GuestAccessPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo]       = useState<TokenInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [states, setStates]   = useState<Record<GuestAction, ButtonState>>({
    open: "idle", close: "idle", parking: "idle",
  });

  useEffect(() => {
    fetch(`/next-api/guest-access/${token}/info`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setLoadError(body.message ?? "This link is invalid or has expired.");
          return;
        }
        setInfo(await res.json());
      })
      .catch(() => setLoadError("Could not load access information."));
  }, [token]);

  const handleAction = useCallback(async (action: GuestAction) => {
    setStates((s) => ({ ...s, [action]: "loading" }));
    try {
      const res = await fetch(`/next-api/guest-access/${token}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setStates((s) => ({ ...s, [action]: "success" }));
        setTimeout(() => setStates((s) => ({ ...s, [action]: "idle" })), 2000);
      } else {
        const body = await res.json().catch(() => ({}));
        setStates((s) => ({ ...s, [action]: "error" }));
        setTimeout(() => setStates((s) => ({ ...s, [action]: "idle" })), 3000);
        if (res.status === 401) setLoadError(body.message ?? "Token expired or revoked.");
      }
    } catch {
      setStates((s) => ({ ...s, [action]: "error" }));
      setTimeout(() => setStates((s) => ({ ...s, [action]: "idle" })), 3000);
    }
  }, [token]);

  const expiresIn = info
    ? Math.max(0, Math.round((new Date(info.expiresAt).getTime() - Date.now()) / 60_000))
    : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🚗</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Car Access
          </h1>
          {info?.label && (
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: "6px 0 0" }}>
              {info.label}
            </p>
          )}
        </div>

        {loadError && (
          <div style={{
            background: "#450a0a",
            border: "1px solid #ef4444",
            borderRadius: "12px",
            padding: "16px",
            color: "#fca5a5",
            fontSize: "14px",
            textAlign: "center",
          }}>
            {loadError}
          </div>
        )}

        {!loadError && !info && (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: "14px" }}>
            Loading…
          </div>
        )}

        {info && !loadError && (
          <>
            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {info.allowedActions.map((action) => {
                const state = states[action];
                const bg = state === "success" ? "#166534"
                         : state === "error"   ? "#7f1d1d"
                         : ACTION_COLOR[action];
                return (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={state === "loading" || state === "success"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      padding: "18px",
                      background: bg,
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "17px",
                      fontWeight: 700,
                      cursor: state === "loading" || state === "success" ? "not-allowed" : "pointer",
                      opacity: state === "loading" ? 0.7 : 1,
                      transition: "background 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "22px" }}>
                      {state === "loading" ? "⏳"
                       : state === "success" ? "✓"
                       : state === "error"   ? "✗"
                       : ACTION_ICON[action]}
                    </span>
                    {state === "loading" ? "Sending…"
                     : state === "success" ? "Sent!"
                     : state === "error"   ? "Failed — try again"
                     : ACTION_LABEL[action]}
                  </button>
                );
              })}
            </div>

            {/* Meta */}
            <div style={{
              background: "#1e293b",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "12px",
              color: "#64748b",
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span>Uses: {info.usageCount}</span>
              <span>Expires in: {expiresIn} min</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
