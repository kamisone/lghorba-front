"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getTranslations, type Locale, LOCALES } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n/translations";
import styles from "./page.module.css";

type GuestT = Translations["guestAccess"];
type GuestAction = "open" | "close" | "parking";
type Phase = "idle" | "loading" | "success" | "timeout" | "error";
type ErrorType = "expired" | "revoked" | "invalid" | "unavailable";

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

const MIN_LOADING_MS   = 10_000;
const POLL_TIMEOUT_MS  = 30_000;
const POLL_INTERVAL_MS = 3_000;
const REDIRECT_SECS    = 5;

// Ring geometry for action buttons (52×52 viewBox)
const BTN_RING_R    = 22;
const BTN_RING_CIRC = 2 * Math.PI * BTN_RING_R; // ≈ 138.2

// Ring geometry for countdown (70×70 viewBox)
const CD_RING_R    = 30;
const CD_RING_CIRC = 2 * Math.PI * CD_RING_R;   // ≈ 188.5

// ─── Countdown error ─────────────────────────────────────────────────────────

const ERROR_CONFIG = {
  expired:  { icon: "⏰", bg: "rgba(245,158,11,0.18)",  stroke: "#f59e0b" },
  revoked:  { icon: "🚫", bg: "rgba(239,68,68,0.18)",   stroke: "#ef4444" },
  invalid:  { icon: "❓", bg: "rgba(99,102,241,0.18)",  stroke: "#818cf8" },
};

function CountdownError({
  errorType,
  t,
  onRedirect,
}: {
  errorType: "expired" | "revoked" | "invalid";
  t: GuestT;
  onRedirect: () => void;
}) {
  const [secs, setSecs] = useState(REDIRECT_SECS);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(tick); onRedirect(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { icon, bg, stroke } = ERROR_CONFIG[errorType];
  const offset = CD_RING_CIRC * (1 - secs / REDIRECT_SECS);

  const titleKey = `${errorType}Title` as const;
  const subKey   = `${errorType}Sub`   as const;

  return (
    <div className={styles.errorWrap}>
      <div className={styles.errorIconCircle} style={{ background: bg }}>
        {icon}
      </div>
      <h2 className={styles.errorTitle}>{t[titleKey]}</h2>
      <p  className={styles.errorSub}>{t[subKey]}</p>

      <div className={styles.countdownWrap}>
        <div className={styles.countdownRing}>
          <svg className={styles.countdownRingSvg} viewBox="0 0 70 70">
            <circle cx="35" cy="35" r={CD_RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="35" cy="35" r={CD_RING_R}
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CD_RING_CIRC}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
          <div className={styles.countdownNumber}>{secs}</div>
        </div>
        <p className={styles.countdownText}>{t.redirecting} {secs} {t.seconds}</p>
      </div>
    </div>
  );
}

// ─── Unavailable error ───────────────────────────────────────────────────────

function UnavailableError({ t, onRetry }: { t: GuestT; onRetry: () => void }) {
  return (
    <div className={styles.errorWrap}>
      <div className={styles.errorIconCircle} style={{ background: "rgba(100,116,139,0.18)" }}>⚠️</div>
      <h2 className={styles.errorTitle}>{t.unavailableTitle}</h2>
      <p  className={styles.errorSub}>{t.unavailableSub}</p>
      <button className={styles.retryBtn} onClick={onRetry}>{t.retry}</button>
    </div>
  );
}

// ─── Main guest page ─────────────────────────────────────────────────────────

function GuestPage() {
  const { token }    = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const rawLang = searchParams.get("lang") ?? "fr";
  const lang: Locale = LOCALES.includes(rawLang as Locale) ? (rawLang as Locale) : "fr";
  const t            = getTranslations(lang).guestAccess;

  const [info, setInfo]           = useState<TokenInfo | null>(null);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);

  const [phases, setPhases]   = useState<Record<GuestAction, Phase>>({ open: "idle", close: "idle", parking: "idle" });
  const [ringKey, setRingKey] = useState(0);

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minWaitRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAction = useRef<GuestAction | null>(null);
  const baselineId   = useRef<number | null>(null);
  const gotResult    = useRef<Phase>("idle");

  // ── Load token info ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/next-api/guest-access/${token}/info`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg  = (body.message ?? "").toLowerCase();
          if (msg.includes("expired"))       setErrorType("expired");
          else if (msg.includes("revoked"))  setErrorType("revoked");
          else                               setErrorType("invalid");
          return;
        }
        setInfo(await res.json());
      })
      .catch(() => setErrorType("unavailable"));
  }, [token]);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (pollRef.current)    clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (minWaitRef.current) clearTimeout(minWaitRef.current);
    pollRef.current = timeoutRef.current = minWaitRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── Settle ──────────────────────────────────────────────────────────────
  const settle = useCallback((action: GuestAction, phase: Phase) => {
    clearTimers();
    activeAction.current = null;
    setPhases((p) => ({ ...p, [action]: phase }));
    setTimeout(() => setPhases((p) => ({ ...p, [action]: "idle" })), 3000);
  }, [clearTimers]);

  // ── Poll ────────────────────────────────────────────────────────────────
  const startPolling = useCallback((action: GuestAction, baseline: number | null) => {
    baselineId.current = baseline;
    gotResult.current  = "idle";

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/next-api/guest-access/${token}/car-status`);
        if (!res.ok) return;
        const status: CarStatus = await res.json();
        if (status.lastInboundId !== null && status.lastInboundId !== baselineId.current) {
          if (minWaitRef.current) { gotResult.current = "success"; }
          else                    { settle(action, "success"); }
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!);
      pollRef.current = null;
      if (minWaitRef.current) { gotResult.current = "timeout"; }
      else                    { settle(action, "timeout"); }
    }, POLL_TIMEOUT_MS);

    minWaitRef.current = setTimeout(() => {
      minWaitRef.current = null;
      if (gotResult.current !== "idle") settle(action, gotResult.current);
    }, MIN_LOADING_MS);
  }, [token, settle]);

  // ── Handle action ───────────────────────────────────────────────────────
  const handleAction = useCallback(async (action: GuestAction) => {
    if (activeAction.current !== null) return;
    activeAction.current = action;
    setPhases((p) => ({ ...p, [action]: "loading" }));
    setRingKey((k) => k + 1);

    try {
      let baseline: number | null = null;
      try {
        const sr = await fetch(`/next-api/guest-access/${token}/car-status`);
        if (sr.ok) baseline = ((await sr.json()) as CarStatus).lastInboundId;
      } catch { /* proceed */ }

      const res = await fetch(`/next-api/guest-access/${token}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        clearTimers();
        activeAction.current = null;
        setPhases((p) => ({ ...p, [action]: "error" }));
        setTimeout(() => setPhases((p) => ({ ...p, [action]: "idle" })), 3000);
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          const msg  = (body.message ?? "").toLowerCase();
          setErrorType(msg.includes("revoked") ? "revoked" : msg.includes("expired") ? "expired" : "invalid");
        }
        return;
      }

      startPolling(action, baseline);
    } catch {
      clearTimers();
      activeAction.current = null;
      setPhases((p) => ({ ...p, [action]: "error" }));
      setTimeout(() => setPhases((p) => ({ ...p, [action]: "idle" })), 3000);
    }
  }, [token, clearTimers, startPolling]);

  // ── Expiry ───────────────────────────────────────────────────────────────
  const minsLeft = info
    ? Math.max(0, Math.round((new Date(info.expiresAt).getTime() - Date.now()) / 60_000))
    : 0;
  const expiresText = info
    ? minsLeft >= 60
      ? `${Math.floor(minsLeft / 60)}${t.hours} ${minsLeft % 60}${t.minutes}`
      : `${minsLeft} ${t.minutes}`
    : "";
  const isExpiringSoon = info ? minsLeft < 60 : false;
  const isBlocked      = activeAction.current !== null;

  // ── Error states ─────────────────────────────────────────────────────────
  if (errorType === "unavailable") {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <UnavailableError t={t} onRetry={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  if (errorType) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <CountdownError
            errorType={errorType}
            t={t}
            onRedirect={() => router.replace("/")}
          />
        </div>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Inline keyframe for action ring — references computed CIRC value */}
      <style>{`@keyframes ring-fill{from{stroke-dashoffset:${BTN_RING_CIRC}}to{stroke-dashoffset:0}}`}</style>

      <div className={styles.wrap}>
        {/* App chip */}
        <div className={styles.chip}>
          <span>🔑</span>
          <span>{t.appName}</span>
        </div>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroIcon}>
            <div className={styles.heroIconGlow} />
            <div className={styles.heroIconBg}>🚗</div>
          </div>
          <div className={styles.heroLabel}>
            {info?.label
              ? <><span>📋</span><span>{info.label}</span></>
              : <><span>🔑</span><span>{t.carAccess}</span></>
            }
          </div>
        </div>

        {/* Skeleton */}
        {!info && (
          <div className={styles.skeletons}>
            <div className={styles.skeletonBtn} />
            <div className={styles.skeletonBtn} />
            <div className={styles.skeletonMeta} />
          </div>
        )}

        {/* Action buttons */}
        {info && (
          <>
            <div className={styles.actions}>
              {info.allowedActions.map((action) => {
                const phase  = phases[action];
                const isThis = activeAction.current === action;
                const blocked = isBlocked && !isThis;

                // CSS class names
                const colorClass = styles[`btn${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof typeof styles];
                const btnClass = [
                  styles.btn,
                  colorClass,
                  phase === "idle" && !isBlocked ? styles.btnIdle : "",
                  blocked ? styles.btnBlocked : "",
                ].filter(Boolean).join(" ");

                const badgeClass = [
                  styles.iconBadge,
                  phase === "success" || phase === "timeout" ? styles.iconBadgeSuccess : "",
                  phase === "error"   ? styles.iconBadgeError   : "",
                ].filter(Boolean).join(" ");

                const iconMap: Record<GuestAction, string> = { open: t.openIcon, close: t.closeIcon, parking: t.parkingIcon };
                const labelMap: Record<GuestAction, string> = { open: t.open,     close: t.close,     parking: t.parking     };
                const subMap:   Record<GuestAction, string> = { open: t.openSub,  close: t.closeSub,  parking: t.parkingSub  };

                const displayLabel = phase === "success" ? t.success
                                   : phase === "timeout" ? t.timeout
                                   : phase === "error"   ? t.error
                                   : labelMap[action];
                const displaySub   = phase === "loading" && isThis ? t.waiting
                                   : phase === "success"  ? t.successSub
                                   : phase === "timeout"  ? t.timeoutSub
                                   : phase === "error"    ? t.errorSub
                                   : subMap[action];
                const displayIcon  = phase === "success" || phase === "timeout" ? "✓"
                                   : phase === "error"   ? "✗"
                                   : iconMap[action];

                return (
                  <button
                    key={action}
                    className={btnClass}
                    onClick={() => handleAction(action)}
                    disabled={blocked || phase === "success" || phase === "timeout" || (phase === "loading" && isThis)}
                    aria-label={labelMap[action]}
                  >
                    {/* Icon / ring area */}
                    {phase === "loading" && isThis ? (
                      <div className={styles.ringWrap}>
                        <span className={styles.ringIcon}>{iconMap[action]}</span>
                        <svg key={ringKey} className={styles.ringSvg} viewBox="0 0 52 52">
                          <circle cx="26" cy="26" r={BTN_RING_R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                          <circle
                            cx="26" cy="26" r={BTN_RING_R}
                            fill="none"
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={BTN_RING_CIRC}
                            strokeDashoffset={BTN_RING_CIRC}
                            style={{ animation: `ring-fill ${MIN_LOADING_MS / 1000}s linear forwards` }}
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className={badgeClass}>
                        <span style={{ fontSize: "22px", lineHeight: 1 }}>{displayIcon}</span>
                      </div>
                    )}

                    {/* Text */}
                    <div className={styles.btnText}>
                      <span className={styles.btnLabel}>{displayLabel}</span>
                      <span className={`${styles.btnSub} ${phase === "loading" && isThis ? styles.btnSubActive : ""}`}>
                        {displaySub}
                      </span>
                    </div>

                    {/* Chevron — only on idle */}
                    {phase === "idle" && <i className={styles.chevron}>›</i>}
                  </button>
                );
              })}
            </div>

            {/* Footer meta */}
            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <div className={styles.metaDot} />
                <span>{t.usageLabel}: {info.usageCount}</span>
              </div>
              <div className={`${styles.metaItem} ${isExpiringSoon ? styles.metaExpiringSoon : ""}`}>
                <div className={`${styles.metaDot} ${isExpiringSoon ? styles.metaDotExpiringSoon : ""}`} />
                <span>{isExpiringSoon ? t.expiringSoon : `${t.expiresLabel} ${expiresText}`}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page export (Suspense required for useSearchParams) ─────────────────────

export default function GuestAccessPage() {
  return (
    <Suspense>
      <GuestPage />
    </Suspense>
  );
}
