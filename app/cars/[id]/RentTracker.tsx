"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Car } from "../data";
import RentMap, { type RentPosition } from "./RentMap";
import { extractMapsUrl, extractLatLng } from "./mapUtils";
import styles from "./RentTracker.module.css";

interface SmsMessage { id: number; message: string; createdAt: string; }
interface LastConsumed { inbound: SmsMessage | null; outbound: SmsMessage | null; }

interface RentSession {
  id: string;
  carId: string;
  status: "active" | "pending_stop" | "ended";
  startedAt: string;
  endedAt?: string;
  lastLocationRequestedAt?: string | null;
  positions?: RentPosition[];
}

const INTERVAL_MS = 15 * 60 * 1000;

interface Props {
  car: Car;
  lastConsumed: LastConsumed | null;
  isScheduleActive?: boolean;
}

export default function RentTracker({ car, lastConsumed, isScheduleActive }: Props) {
  const [tracking,    setTracking]    = useState(false);
  const [sessionId,   setSessionId]   = useState<string | null>(null);
  const [positions,   setPositions]   = useState<RentPosition[]>([]);
  const [sessions,    setSessions]    = useState<RentSession[]>([]);
  const [viewSession, setViewSession] = useState<RentSession | null>(null);
  const [toggling,    setToggling]    = useState(false);
  const [nextIn,      setNextIn]      = useState(0);
  const [confirming,  setConfirming]  = useState(false);
  const [restored,    setRestored]    = useState(false);

  const countdownRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef        = useRef<string | null>(null);
  const lastLocationSentRef = useRef<number>(0);
  const lastSavedMsgIdRef   = useRef<number | null>(null);
  const lastConsumedRef     = useRef(lastConsumed);

  lastConsumedRef.current = lastConsumed;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const sendLocation = useCallback(async () => {
    lastLocationSentRef.current = Date.now();
    await fetch("/next-api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: car.phoneNumber, message: "location" }),
    }).catch(() => {});
    const sId = sessionIdRef.current;
    if (sId) {
      fetch(`/next-api/rent-sessions/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastLocationRequestedAt: new Date().toISOString() }),
      }).catch(() => {});
    }
  }, [car.phoneNumber]);

  const savePosition = useCallback(async (sId: string, inbound: SmsMessage) => {
    const url    = extractMapsUrl(inbound.message);
    if (!url) return;
    const coords = extractLatLng(url);
    if (!coords) return;

    try {
      const res = await fetch(`/next-api/rent-sessions/${sId}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng, rawMessage: inbound.message, recordedAt: inbound.createdAt }),
      });
      if (res.ok) {
        const pos: RentPosition = await res.json();
        setPositions((prev) => [...prev, pos]);
        // Backend just completed a location exchange — reset the countdown
        startCountdown();
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = useCallback((seconds = INTERVAL_MS / 1000) => {
    setNextIn(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setNextIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setNextIn(0);
  }, []);

  // ── Restore active session + load history on mount ────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/next-api/rent-sessions?carId=${car.id}`, { cache: "no-store" });
        if (!r.ok || cancelled) return;
        const data: RentSession[] = await r.json();

        const live = data.find((s) => s.status === "active" || s.status === "pending_stop") ?? null;
        if (!cancelled) setSessions(data.filter((s) => s.status === "ended"));
        if (!live || cancelled) return;

        let restoredPositions: RentPosition[] = [];
        try {
          const posRes = await fetch(`/next-api/rent-sessions/${live.id}/positions`, { cache: "no-store" });
          if (posRes.ok && !cancelled) restoredPositions = await posRes.json();
        } catch { /* silent */ }

        if (cancelled) return;
        sessionIdRef.current = live.id;

        const currentInbound = lastConsumedRef.current?.inbound ?? null;
        const latestPos      = restoredPositions.at(-1) ?? null;
        const alreadySaved   =
          currentInbound !== null &&
          latestPos !== null &&
          new Date(latestPos.recordedAt).getTime() === new Date(currentInbound.createdAt).getTime();
        lastSavedMsgIdRef.current = alreadySaved ? currentInbound.id : null;

        setSessionId(live.id);
        setPositions(restoredPositions);

        lastLocationSentRef.current = live.lastLocationRequestedAt
          ? new Date(live.lastLocationRequestedAt).getTime()
          : 0;

        const elapsed   = lastLocationSentRef.current ? Date.now() - lastLocationSentRef.current : INTERVAL_MS;
        const remaining = Math.max(0, INTERVAL_MS - elapsed);

        if (live.status === "pending_stop") {
          setNextIn(Math.floor(remaining / 1000));
          setConfirming(true);
          return;
        }

        setTracking(true);
        // Countdown display only — backend cron drives actual sends
        startCountdown(Math.floor(remaining / 1000));
      } catch { /* silent */ }
      if (!cancelled) setRestored(true);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  // ── Auto-start when a scheduled rent period is active ────────────────────

  useEffect(() => {
    if (!isScheduleActive || !restored || tracking || confirming || sessionId !== null) return;
    startTracking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScheduleActive, restored]);

  // ── Watch for new location responses ─────────────────────────────────────

  useEffect(() => {
    if (!tracking || !sessionId || !lastConsumed?.inbound) return;
    const inbound = lastConsumed.inbound;
    if (inbound.id === lastSavedMsgIdRef.current) return;
    lastSavedMsgIdRef.current = inbound.id;
    savePosition(sessionId, inbound);
  }, [lastConsumed?.inbound?.id, tracking, sessionId, savePosition]);

  // ── Toggle ────────────────────────────────────────────────────────────────

  const startTracking = async () => {
    setToggling(true);
    try {
      const res = await fetch("/next-api/rent-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: car.id }),
      });
      if (!res.ok) return;
      const session: RentSession = await res.json();
      sessionIdRef.current = session.id;
      setSessionId(session.id);
      setPositions([]);
      lastSavedMsgIdRef.current = null;
      setTracking(true);
      sendLocation();   // initial send for immediate UX; backend cron handles repeats
      startCountdown();
    } finally {
      setToggling(false);
    }
  };

  const requestStop = () => {
    if (countdownRef.current) clearInterval(countdownRef.current); // freeze display, keep nextIn
    setTracking(false);
    setConfirming(true);
    const sId = sessionIdRef.current;
    if (sId) {
      fetch(`/next-api/rent-sessions/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_stop" }),
      }).catch(() => {});
    }
  };

  const resumeTracking = () => {
    const sId = sessionIdRef.current;
    if (sId) {
      fetch(`/next-api/rent-sessions/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      }).catch(() => {});
    }
    setConfirming(false);
    setTracking(true);
    if (nextIn === 0) {
      sendLocation();   // overdue — send now, backend will pick up from nextLocationAt
      startCountdown();
    } else {
      startCountdown(nextIn); // resume from frozen value
    }
  };

  const stopTracking = async () => {
    setConfirming(false);
    setToggling(true);
    try {
      stopCountdown();
      if (sessionId) {
        const res = await fetch(`/next-api/rent-sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ended" }),
        });
        if (res.ok) {
          const ended: RentSession = await res.json();
          setSessions((prev) => [ended, ...prev]);
        }
      }
      sessionIdRef.current = null;
      setTracking(false);
      setSessionId(null);
      setPositions([]);
    } finally {
      setToggling(false);
    }
  };

  // ── Load session positions for history view ───────────────────────────────

  const loadSession = async (session: RentSession) => {
    if (viewSession?.id === session.id) { setViewSession(null); return; }
    if (session.positions) { setViewSession(session); return; }
    try {
      const res = await fetch(`/next-api/rent-sessions/${session.id}/positions`, { cache: "no-store" });
      const pos: RentPosition[] = await res.json();
      const full = { ...session, positions: pos };
      setSessions((prev) => prev.map((s) => s.id === session.id ? full : s));
      setViewSession(full);
    } catch { /* silent */ }
  };

  // ── Formatters ────────────────────────────────────────────────────────────

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  const mapPositions = tracking ? positions : (viewSession?.positions ?? []);

  return (
    <div className={styles.section}>
      {/* ── Toggle row ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>🚗</span>
          <div>
            <p className={styles.label}>Rent Tracking</p>
            {tracking && (
              <p className={styles.meta}>
                {positions.length} position{positions.length !== 1 ? "s" : ""}
                {nextIn > 0 && <span className={styles.countdown}> · next in {fmt(nextIn)}</span>}
              </p>
            )}
          </div>
        </div>

        {confirming ? (
          <div className={styles.confirmRow}>
            <button className={`${styles.confirmBtn} ${styles.confirmEnd}`} onClick={stopTracking}>
              End rent
            </button>
            <button className={`${styles.confirmBtn} ${styles.confirmPause}`} onClick={resumeTracking}>
              Continue
            </button>
          </div>
        ) : (
          <button
            className={`${styles.toggle} ${tracking ? styles.toggleOn : ""} ${toggling ? styles.toggleDisabled : ""}`}
            onClick={tracking ? requestStop : startTracking}
            disabled={toggling}
            aria-label={tracking ? "Stop rent tracking" : "Start rent tracking"}
          >
            <span className={styles.thumb} />
          </button>
        )}
      </div>

      {/* ── Active session status ── */}
      {tracking && (
        <div className={styles.activeBadge}>
          <span className={styles.activeDot} />
          Rent in progress
        </div>
      )}

      {/* ── Map ── */}
      {mapPositions.length > 0 && (
        <div className={styles.mapWrap}>
          <div className={styles.mapRange}>
            <span className={styles.mapRangeStart}>● {1}</span>
            <span className={styles.mapRangeDash} />
            <span className={styles.mapRangeEnd}>● {mapPositions.length}</span>
          </div>
          <RentMap positions={mapPositions} />
        </div>
      )}

      {/* ── History ── */}
      {sessions.length > 0 && (
        <div className={styles.history}>
          <p className={styles.historyTitle}>Past rents</p>
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`${styles.sessionRow} ${viewSession?.id === s.id ? styles.sessionRowActive : ""}`}
              onClick={() => loadSession(s)}
            >
              <span className={styles.sessionDate}>{fmtDate(s.startedAt)}</span>
              <span className={styles.sessionPositions}>
                {s.positions ? `${s.positions.length} pts` : "…"}
              </span>
              <span className={styles.sessionChevron}>{viewSession?.id === s.id ? "▲" : "▼"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
