"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

// ─── i18n ────────────────────────────────────────────────────────────────────

const T = {
  fr: {
    title:       "Accès au véhicule",
    open:        "Ouvrir",
    close:       "Fermer",
    parking:     "Parking",
    openIcon:    "🔓",
    closeIcon:   "🔒",
    parkingIcon: "🅿️",
    loading:     "Chargement…",
    sending:     "Envoi…",
    waiting:     "En attente de réponse…",
    success:     "Commande reçue !",
    timeout:     "Commande envoyée",
    error:       "Échec — réessayez",
    invalid:     "Ce lien est invalide ou a expiré.",
    revoked:     "Ce lien a été révoqué.",
    unavailable: "Impossible de charger les informations d'accès.",
    usageLabel:  "Utilisations",
    expiresLabel:"Expire dans",
    hours:       "h",
    minutes:     "min",
  },
  en: {
    title:       "Car Access",
    open:        "Unlock",
    close:       "Lock",
    parking:     "Parking",
    openIcon:    "🔓",
    closeIcon:   "🔒",
    parkingIcon: "🅿️",
    loading:     "Loading…",
    sending:     "Sending…",
    waiting:     "Waiting for response…",
    success:     "Command received!",
    timeout:     "Command sent",
    error:       "Failed — try again",
    invalid:     "This link is invalid or has expired.",
    revoked:     "This link has been revoked.",
    unavailable: "Could not load access information.",
    usageLabel:  "Uses",
    expiresLabel:"Expires in",
    hours:       "h",
    minutes:     "min",
  },
} as const;

type Lang = keyof typeof T;
type GuestAction = "open" | "close" | "parking";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TokenInfo {
  carId:          string;
  label:          string | null;
  allowedActions: GuestAction[];
  expiresAt:      string;
  usageCount:     number;
}

interface CarStatus {
  lastInboundId: number | null;
  lastInboundAt: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_LOADING_MS = 10_000;
const POLL_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 3_000;
const RING_R = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ~276.5

// ─── Inner component (needs useSearchParams) ────────────────────────────────

function GuestPage() {
  const { token }       = useParams<{ token: string }>();
  const searchParams    = useSearchParams();
  const lang: Lang      = (searchParams.get("lang") === "en" ? "en" : "fr");
  const t               = T[lang];

  const [info, setInfo]           = useState<TokenInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-button phases
  type Phase = "idle" | "loading" | "success" | "timeout" | "error";
  const [phases, setPhases]       = useState<Record<GuestAction, Phase>>({ open: "idle", close: "idle", parking: "idle" });
  const [ringKey, setRingKey]     = useState(0); // forces CSS animation restart

  // Polling refs
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minWaitRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAction  = useRef<GuestAction | null>(null);
  const baselineId    = useRef<number | null>(null);
  const gotResult     = useRef<Phase>("idle"); // result received before min-wait ends

  // ── Load token info ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/next-api/guest-access/${token}/info`)
      .then(async (res) => {
        if (!res.ok) {
          setLoadError(t.invalid);
          return;
        }
        setInfo(await res.json());
      })
      .catch(() => setLoadError(t.unavailable));
  }, [token, t.invalid, t.unavailable]);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (pollRef.current)    clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (minWaitRef.current) clearTimeout(minWaitRef.current);
    pollRef.current = timeoutRef.current = minWaitRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── Settle: called when we have a final phase after min-wait elapsed ────
  const settle = useCallback((action: GuestAction, phase: Phase) => {
    clearTimers();
    activeAction.current = null;
    setPhases((p) => ({ ...p, [action]: phase }));
    // auto-reset after 3s
    setTimeout(() => setPhases((p) => ({ ...p, [action]: "idle" })), 3000);
  }, [clearTimers]);

  // ── Poll for SMS response ────────────────────────────────────────────────
  const startPolling = useCallback((action: GuestAction, baseline: number | null) => {
    baselineId.current = baseline;
    gotResult.current  = "idle";

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/next-api/guest-access/${token}/car-status`);
        if (!res.ok) return;
        const status: CarStatus = await res.json();
        if (status.lastInboundId !== null && status.lastInboundId !== baselineId.current) {
          // New inbound received — record success
          if (minWaitRef.current) {
            // Min-wait still running; store result and settle when it fires
            gotResult.current = "success";
          } else {
            settle(action, "success");
          }
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);

    // Hard timeout: settle as "timeout" (command sent, no confirmation)
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!);
      pollRef.current = null;
      if (minWaitRef.current) {
        gotResult.current = "timeout";
      } else {
        settle(action, "timeout");
      }
    }, POLL_TIMEOUT_MS);

    // Minimum wait: after 10s, check if result already received
    minWaitRef.current = setTimeout(() => {
      minWaitRef.current = null;
      if (gotResult.current !== "idle") {
        settle(action, gotResult.current);
      }
      // else: keep waiting (poll + timeout still running)
    }, MIN_LOADING_MS);
  }, [token, settle]);

  // ── Handle button click ──────────────────────────────────────────────────
  const handleAction = useCallback(async (action: GuestAction) => {
    if (activeAction.current !== null) return; // one at a time
    activeAction.current = action;

    setPhases((p) => ({ ...p, [action]: "loading" }));
    setRingKey((k) => k + 1); // restart CSS ring animation

    try {
      // 1. Record baseline inbound id
      let baseline: number | null = null;
      try {
        const sr = await fetch(`/next-api/guest-access/${token}/car-status`);
        if (sr.ok) {
          const s: CarStatus = await sr.json();
          baseline = s.lastInboundId;
        }
      } catch { /* proceed without baseline */ }

      // 2. Enqueue the action
      const res = await fetch(`/next-api/guest-access/${token}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        clearTimers();
        activeAction.current = null;
        setPhases((p) => ({ ...p, [action]: "error" }));
        setTimeout(() => setPhases((p) => ({ ...p, [action]: "idle" })), 3000);
        if (res.status === 401) setLoadError(body.message ?? t.revoked);
        return;
      }

      // 3. Start polling for SMS response
      startPolling(action, baseline);

    } catch {
      clearTimers();
      activeAction.current = null;
      setPhases((p) => ({ ...p, [action]: "error" }));
      setTimeout(() => setPhases((p) => ({ ...p, [action]: "idle" })), 3000);
    }
  }, [token, t.revoked, clearTimers, startPolling]);

  // ── Expiry display ───────────────────────────────────────────────────────
  const expiresText = (() => {
    if (!info) return "";
    const mins = Math.max(0, Math.round((new Date(info.expiresAt).getTime() - Date.now()) / 60_000));
    if (mins >= 60) return `${Math.floor(mins / 60)}${t.hours} ${mins % 60}${t.minutes}`;
    return `${mins} ${t.minutes}`;
  })();

  const isBlocked = activeAction.current !== null;

  return (
    <>
      {/* Ring animation keyframes */}
      <style>{`
        @keyframes ring-fill {
          from { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ring-spin {
          from { transform: rotate(-90deg); }
          to   { transform: rotate(270deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        .action-btn { -webkit-tap-highlight-color: transparent; }
        .action-btn:active:not(:disabled) { transform: scale(0.97); }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <div style={{ fontSize: "44px", marginBottom: "10px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>🚗</div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.3px" }}>
              {t.title}
            </h1>
            {info?.label && (
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: "8px 0 0", fontWeight: 500 }}>
                {info.label}
              </p>
            )}
          </div>

          {/* Error state */}
          {loadError && (
            <div style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "16px",
              padding: "20px",
              color: "#fca5a5",
              fontSize: "15px",
              textAlign: "center",
              lineHeight: 1.6,
            }}>
              {loadError}
            </div>
          )}

          {/* Loading skeleton */}
          {!loadError && !info && (
            <div style={{ textAlign: "center", color: "#475569", fontSize: "15px" }}>
              {t.loading}
            </div>
          )}

          {/* Main content */}
          {info && !loadError && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
                {info.allowedActions.map((action) => {
                  const phase = phases[action];
                  const isThis = activeAction.current === action;

                  const baseColor: Record<GuestAction, string> = {
                    open:    "#22c55e",
                    close:   "#ef4444",
                    parking: "#3b82f6",
                  };
                  const color = phase === "success" || phase === "timeout" ? "#22c55e"
                              : phase === "error"   ? "#ef4444"
                              : baseColor[action];

                  const icon = phase === "success" ? "✓"
                             : phase === "timeout"  ? "✓"
                             : phase === "error"    ? "✗"
                             : action === "open"    ? t.openIcon
                             : action === "close"   ? t.closeIcon
                             : t.parkingIcon;

                  const label = phase === "loading" && isThis ? ""  // hidden while ring shows
                              : phase === "success"  ? t.success
                              : phase === "timeout"  ? t.timeout
                              : phase === "error"    ? t.error
                              : action === "open"    ? t.open
                              : action === "close"   ? t.close
                              : t.parking;

                  return (
                    <button
                      key={action}
                      className="action-btn"
                      onClick={() => handleAction(action)}
                      disabled={isBlocked || phase === "success" || phase === "timeout"}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        padding: "20px 24px",
                        minHeight: "72px",
                        background: phase === "idle" || phase === "loading"
                          ? `linear-gradient(135deg, ${color}dd, ${color}aa)`
                          : color,
                        border: "none",
                        borderRadius: "18px",
                        color: "#fff",
                        fontSize: "18px",
                        fontWeight: 800,
                        cursor: isBlocked || phase === "success" || phase === "timeout" ? "not-allowed" : "pointer",
                        opacity: isBlocked && !isThis ? 0.45 : 1,
                        transition: "opacity 0.2s, background 0.3s",
                        boxShadow: phase === "idle" ? `0 4px 20px ${color}44` : "none",
                        letterSpacing: "0.1px",
                        overflow: "hidden",
                      }}
                    >
                      {/* Circular progress ring — only for the active loading button */}
                      {phase === "loading" && isThis && (
                        <div style={{ position: "relative", width: "52px", height: "52px", flexShrink: 0 }}>
                          <svg
                            key={ringKey}
                            width="52" height="52"
                            viewBox="0 0 96 96"
                            style={{ transform: "rotate(-90deg)" }}
                          >
                            {/* Track */}
                            <circle
                              cx="48" cy="48" r={RING_R}
                              fill="none"
                              stroke="rgba(255,255,255,0.25)"
                              strokeWidth="6"
                            />
                            {/* Animated fill */}
                            <circle
                              cx="48" cy="48" r={RING_R}
                              fill="none"
                              stroke="#fff"
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={RING_CIRCUMFERENCE}
                              strokeDashoffset={RING_CIRCUMFERENCE}
                              style={{
                                animation: `ring-fill ${MIN_LOADING_MS / 1000}s linear forwards`,
                              }}
                            />
                          </svg>
                          {/* Icon centred inside ring */}
                          <span style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "20px",
                          }}>
                            {action === "open" ? t.openIcon : action === "close" ? t.closeIcon : t.parkingIcon}
                          </span>
                        </div>
                      )}

                      {/* Normal icon */}
                      {!(phase === "loading" && isThis) && (
                        <span style={{
                          fontSize: "24px",
                          animation: phase === "success" || phase === "timeout" ? "fade-in 0.3s ease" : "none",
                        }}>
                          {icon}
                        </span>
                      )}

                      {/* Label */}
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span>{label}</span>
                        {phase === "loading" && isThis && (
                          <span style={{ fontSize: "12px", fontWeight: 500, opacity: 0.85, marginTop: "2px" }}>
                            {t.waiting}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer meta */}
              <div style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(8px)",
                borderRadius: "12px",
                padding: "12px 18px",
                fontSize: "12px",
                color: "#64748b",
                display: "flex",
                justifyContent: "space-between",
              }}>
                <span>{t.usageLabel}: {info.usageCount}</span>
                <span>{t.expiresLabel}: {expiresText}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page export (Suspense required for useSearchParams) ────────────────────

export default function GuestAccessPage() {
  return (
    <Suspense>
      <GuestPage />
    </Suspense>
  );
}
