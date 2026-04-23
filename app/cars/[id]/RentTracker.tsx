"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Car } from "../data";
import type { RentSchedule } from "./RentCalendar";
import RentMap, { type RentPosition } from "./RentMap";
import RentScheduleModal from "./RentScheduleModal";
import { extractMapsUrl, extractLatLng } from "./mapUtils";
import styles from "./RentTracker.module.css";

interface SmsMessage { id: number; message: string; createdAt: string; }
interface LastConsumed { inbound: SmsMessage | null; outbound: SmsMessage | null; }

interface RentSession {
  id: string;
  carId: string;
  scheduleId?: string | null;
  status: "active" | "paused" | "pending_stop" | "ended";
  startedAt: string;
  endedAt?: string;
  lastLocationRequestedAt?: string | null;
  positions?: RentPosition[];
}

const INTERVAL_MS = 15 * 60 * 1000;

function computeForfaitKm(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) * 200;
}

interface Props {
  car: Car;
  lastConsumed: LastConsumed | null;
  activeSchedule: RentSchedule | null;
  allSchedules: RentSchedule[];
  onScheduleUpdate: (s: RentSchedule) => void;
  onScheduleDelete: (id: string) => void;
}

export default function RentTracker({ car, lastConsumed, activeSchedule, allSchedules, onScheduleUpdate, onScheduleDelete }: Props) {
  const [tracking,           setTracking]           = useState(false);
  const [sessionId,          setSessionId]          = useState<string | null>(null);
  const [positions,          setPositions]          = useState<RentPosition[]>([]);
  const [sessions,           setSessions]           = useState<RentSession[]>([]);
  const [toggling,           setToggling]           = useState(false);
  const [nextIn,             setNextIn]             = useState(0);
  const [confirmingEnd,      setConfirmingEnd]      = useState(false);
  const [restored,           setRestored]           = useState(false);
  const [mapFullscreen,      setMapFullscreen]      = useState(false);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showEditModal,      setShowEditModal]      = useState(false);
  const [editingSchedule,    setEditingSchedule]    = useState<RentSchedule | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);

  const countdownRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef        = useRef<string | null>(null);
  const lastLocationSentRef = useRef<number>(0);
  const lastSavedMsgIdRef   = useRef<number | null>(null);
  const lastConsumedRef     = useRef(lastConsumed);
  const endRentRef          = useRef<() => void>(() => {});

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

        const live = data.find((s) => s.status === "active" || s.status === "pending_stop" || s.status === "paused") ?? null;
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

        setTracking(live.status === "active");
        if (live.status === "active") startCountdown(Math.floor(remaining / 1000));
      } catch { /* silent */ }
      if (!cancelled) setRestored(true);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  // ── Auto-start when schedule begins + autoStartTracking enabled ───────────

  useEffect(() => {
    if (!activeSchedule?.autoStartTracking || !restored || tracking || sessionId !== null) return;
    startTracking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchedule?.id, restored]);

  // ── Auto-stop when rent ends ──────────────────────────────────────────────

  useEffect(() => {
    endRentRef.current = endRent;
  });

  useEffect(() => {
    if (!activeSchedule || !sessionId) return;
    const ms = new Date(activeSchedule.toDate).getTime() - Date.now();
    if (ms <= 0) { endRentRef.current(); return; }
    const t = setTimeout(() => endRentRef.current(), ms);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchedule?.id, sessionId]);

  // ── Watch for new location responses ─────────────────────────────────────

  useEffect(() => {
    if (!tracking || !sessionId || !lastConsumed?.inbound) return;
    const inbound = lastConsumed.inbound;
    if (inbound.id === lastSavedMsgIdRef.current) return;
    lastSavedMsgIdRef.current = inbound.id;
    savePosition(sessionId, inbound);
  }, [lastConsumed?.inbound?.id, tracking, sessionId, savePosition]);

  // ── Tracking toggle ───────────────────────────────────────────────────────

  const startTracking = async () => {
    if (sessionId) {
      fetch(`/next-api/rent-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      }).catch(() => {});
      setTracking(true);
      sendLocation();
      startCountdown();
      return;
    }
    if (!activeSchedule) return;
    setToggling(true);
    try {
      const res = await fetch("/next-api/rent-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: car.id, scheduleId: activeSchedule.id }),
      });
      if (!res.ok) return;
      const session: RentSession = await res.json();
      sessionIdRef.current = session.id;
      setSessionId(session.id);
      setPositions([]);
      lastSavedMsgIdRef.current = null;
      setTracking(true);
      sendLocation();
      startCountdown();
    } finally {
      setToggling(false);
    }
  };

  const pauseTracking = () => {
    stopCountdown();
    setTracking(false);
    const sId = sessionIdRef.current;
    if (sId) {
      fetch(`/next-api/rent-sessions/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      }).catch(() => {});
    }
  };

  // ── End rent ──────────────────────────────────────────────────────────────

  const endRent = async () => {
    setConfirmingEnd(false);
    setToggling(true);
    try {
      stopCountdown();
      if (sessionIdRef.current) {
        const res = await fetch(`/next-api/rent-sessions/${sessionIdRef.current}`, {
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

  // ── Schedule edit / delete ────────────────────────────────────────────────

  const openEditSchedule = (s: RentSchedule) => {
    setEditingSchedule(s);
    setShowEditModal(true);
  };

  const handleScheduleSaved = (updated: RentSchedule) => {
    onScheduleUpdate(updated);
    setShowEditModal(false);
    setEditingSchedule(null);
  };

  const handleScheduleDelete = async (schedule: RentSchedule) => {
    setDeletingScheduleId(schedule.id);
    try {
      const res = await fetch(`/next-api/cars/${car.id}/rent-schedules/${schedule.id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(prev => prev.filter(sess => sess.scheduleId !== schedule.id));
        if (schedule.id === activeSchedule?.id && (tracking || !!sessionId)) {
          stopCountdown();
          setTracking(false);
          setConfirmingEnd(false);
          setSessionId(null);
          setPositions([]);
          sessionIdRef.current = null;
        }
        onScheduleDelete(schedule.id);
      }
    } finally {
      setDeletingScheduleId(null);
    }
  };

  // ── Expand past schedule ──────────────────────────────────────────────────

  const toggleScheduleExpand = async (schedule: RentSchedule) => {
    if (expandedScheduleId === schedule.id) {
      setExpandedScheduleId(null);
      return;
    }
    setExpandedScheduleId(schedule.id);
    const linked = sessions.find(sess => sess.scheduleId === schedule.id);
    if (!linked || linked.positions) return;
    try {
      const res = await fetch(`/next-api/rent-sessions/${linked.id}/positions`, { cache: "no-store" });
      if (res.ok) {
        const pos: RentPosition[] = await res.json();
        setSessions(prev => prev.map(s => s.id === linked.id ? { ...s, positions: pos } : s));
      }
    } catch { /* silent */ }
  };

  // ── Formatters ────────────────────────────────────────────────────────────

  const fmt      = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const fmtShort = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const fmtDT    = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const canToggleOn = (!!activeSchedule || !!sessionId) && !toggling;
  const hasSession  = !!sessionId;

  const now = Date.now();
  const pastSchedules = allSchedules
    .filter(s => new Date(s.toDate).getTime() < now)
    .sort((a, b) => new Date(b.toDate).getTime() - new Date(a.toDate).getTime());

  return (
    <div className={styles.section}>

      {/* ── Header row ── */}
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
            {!activeSchedule && !hasSession && (
              <p className={styles.noRentMsg}>No active rent</p>
            )}
          </div>
        </div>

        {confirmingEnd ? (
          <div className={styles.confirmRow}>
            <button className={`${styles.confirmBtn} ${styles.confirmEnd}`} onClick={endRent}>End rent</button>
            <button className={`${styles.confirmBtn} ${styles.confirmPause}`} onClick={() => setConfirmingEnd(false)}>Cancel</button>
          </div>
        ) : (
          <div className={styles.headerRight}>
            {hasSession && (
              <button className={styles.endRentBtn} onClick={() => setConfirmingEnd(true)}>
                End rent
              </button>
            )}
            <button
              className={`${styles.toggle} ${tracking ? styles.toggleOn : ""} ${(!canToggleOn && !tracking) || toggling ? styles.toggleDisabled : ""}`}
              onClick={tracking ? pauseTracking : startTracking}
              disabled={toggling || (!tracking && !canToggleOn)}
              aria-label={tracking ? "Pause rent tracking" : "Start rent tracking"}
            >
              <span className={styles.thumb} />
            </button>
          </div>
        )}
      </div>

      {/* ── Active schedule info ── */}
      {activeSchedule && (
        <div className={styles.scheduleCard}>
          <div className={styles.scheduleCardHeader}>
            <div className={styles.scheduleCardDates}>
              <span>{fmtDT(activeSchedule.fromDate)}</span>
              <span className={styles.scheduleCardArrow}>→</span>
              <span>{fmtDT(activeSchedule.toDate)}</span>
            </div>
            <div className={styles.scheduleCardActions}>
              <button className={styles.sessionEditBtn} onClick={() => openEditSchedule(activeSchedule)} aria-label="Edit">✏</button>
              <button
                className={styles.sessionDeleteBtn}
                onClick={() => handleScheduleDelete(activeSchedule)}
                disabled={deletingScheduleId === activeSchedule.id}
                aria-label="Delete"
              >
                {deletingScheduleId === activeSchedule.id ? "…" : "×"}
              </button>
            </div>
          </div>
          <div className={styles.scheduleCardMeta}>
            {activeSchedule.guestName && <span className={styles.scheduleCardPill}>👤 {activeSchedule.guestName}</span>}
            {activeSchedule.reservationNumber && <span className={styles.scheduleCardPill}>📋 {activeSchedule.reservationNumber}</span>}
            <span className={styles.scheduleCardPill}>📏 {computeForfaitKm(activeSchedule.fromDate, activeSchedule.toDate).toLocaleString()} km</span>
            {activeSchedule.totalEarning != null && <span className={`${styles.scheduleCardPill} ${styles.scheduleCardPillEarning}`}>💶 {activeSchedule.totalEarning.toLocaleString()} €</span>}
            {activeSchedule.autoStartTracking && <span className={`${styles.scheduleCardPill} ${styles.scheduleCardPillTracking}`}>🔄 Auto-track</span>}
          </div>
        </div>
      )}

      {/* ── Active session badge ── */}
      {tracking && (
        <div className={styles.activeBadge}>
          <span className={styles.activeDot} />
          Rent in progress
        </div>
      )}

      {/* ── Live map ── */}
      {tracking && positions.length > 0 && (
        <>
          <div className={styles.mapWrap}>
            <div className={styles.mapHeader}>
              <div className={styles.mapRange}>
                <span className={styles.mapRangeStart}>● 1</span>
                <span className={styles.mapRangeDash} />
                <span className={styles.mapRangeEnd}>● {positions.length}</span>
              </div>
              <button className={styles.mapExpandBtn} onClick={() => setMapFullscreen(true)} title="Fullscreen">⛶</button>
            </div>
            <RentMap positions={positions} />
          </div>
          {mapFullscreen && (
            <div className={styles.mapFullscreenOverlay}>
              <div className={styles.mapFullscreenBar}>
                <span className={styles.mapFullscreenLabel}>{positions.length} position{positions.length !== 1 ? "s" : ""}</span>
                <button className={styles.mapFullscreenClose} onClick={() => setMapFullscreen(false)}>✕ Close</button>
              </div>
              <div className={styles.mapFullscreenBody}>
                <RentMap positions={positions} fill />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Past rents ── */}
      {pastSchedules.length > 0 && (
        <div className={styles.history}>
          <p className={styles.historyTitle}>Past rents</p>
          {pastSchedules.map(schedule => {
            const linked  = sessions.find(sess => sess.scheduleId === schedule.id);
            const isOpen  = expandedScheduleId === schedule.id;
            const forfait = computeForfaitKm(schedule.fromDate, schedule.toDate);
            return (
              <div key={schedule.id} className={styles.sessionBlock}>
                <div className={`${styles.sessionRow} ${isOpen ? styles.sessionRowActive : ""}`}>
                  <div
                    className={styles.sessionRowMain}
                    onClick={() => toggleScheduleExpand(schedule)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.sessionInfo}>
                      <span className={styles.sessionDate}>{fmtShort(schedule.fromDate)} → {fmtShort(schedule.toDate)}</span>
                      {schedule.guestName && <span className={styles.sessionGuest}>👤 {schedule.guestName}</span>}
                      {schedule.reservationNumber && <span className={styles.sessionRes}>#{schedule.reservationNumber}</span>}
                    </div>
                    <div className={styles.sessionRight}>
                      <span className={styles.sessionKm}>{forfait.toLocaleString()} km</span>
                      {schedule.totalEarning != null && <span className={styles.sessionEarning}>{schedule.totalEarning.toLocaleString()} €</span>}
                      <span className={styles.sessionPositions}>
                        {linked ? (linked.positions ? `${linked.positions.length} pts` : "…") : "–"}
                      </span>
                      <span className={styles.sessionChevron}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  <div className={styles.sessionRowActions}>
                    <button className={styles.sessionEditBtn} onClick={() => openEditSchedule(schedule)} aria-label="Edit">✏</button>
                    <button
                      className={styles.sessionDeleteBtn}
                      onClick={() => handleScheduleDelete(schedule)}
                      disabled={deletingScheduleId === schedule.id}
                      aria-label="Delete"
                    >
                      {deletingScheduleId === schedule.id ? "…" : "×"}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  linked?.positions && linked.positions.length > 0 ? (
                    <div className={styles.sessionMap}>
                      <RentMap positions={linked.positions} height={220} />
                    </div>
                  ) : (
                    <p className={styles.sessionNoMap}>
                      {linked ? "No positions recorded for this rent." : "No tracking for this rent."}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit schedule modal ── */}
      {showEditModal && editingSchedule && (
        <RentScheduleModal
          car={car}
          schedule={editingSchedule}
          onClose={() => { setShowEditModal(false); setEditingSchedule(null); }}
          onSaved={handleScheduleSaved}
        />
      )}
    </div>
  );
}
