"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Car } from "../data";
import type { RentSchedule } from "./RentCalendar";
import RentMap, { type RentPosition } from "./RentMap";
import RentScheduleModal from "./RentScheduleModal";
import { extractMapsUrl, extractLatLng } from "./mapUtils";
import { useToast } from "@/app/components/toast/ToastContext";
import styles from "./RentTracker.module.css";

interface SmsMessage { id: number; message: string; createdAt: string; }
interface LastConsumed { inbound: SmsMessage | null; outbound: SmsMessage | null; }

interface RentSession {
  id: string;
  carId: string;
  scheduleId?: string | null;
  status: "active" | "ended";
  trackingPaused: boolean;
  startedAt: string;
  endedAt?: string;
  lastLocationRequestedAt?: string | null;
  positions?: RentPosition[];
}

const INTERVAL_MS     = 15 * 60 * 1000;
const SESSION_POLL_MS = 5_000;

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
  onUsedScheduleIdsChange?: (ids: string[]) => void;
  onActiveScheduleIdChange?: (id: string | null) => void;
}

export default function RentTracker({ car, lastConsumed, activeSchedule, allSchedules, onScheduleUpdate, onScheduleDelete, onUsedScheduleIdsChange, onActiveScheduleIdChange }: Props) {
  const { toast } = useToast();
  const [tracking,           setTracking]           = useState(false);
  const [sessionId,          setSessionId]          = useState<string | null>(null);
  const [positions,          setPositions]          = useState<RentPosition[]>([]);
  const [sessions,           setSessions]           = useState<RentSession[]>([]);
  const [toggling,           setToggling]           = useState(false);
  const [nextIn,             setNextIn]             = useState(0);
  const [confirmingEnd,      setConfirmingEnd]      = useState(false);
  const [restored,           setRestored]           = useState(false);
  const [mapFullscreen,      setMapFullscreen]      = useState(false);
  const [expandedSessionId,  setExpandedSessionId]  = useState<string | null>(null);
  const [showEditModal,      setShowEditModal]      = useState(false);
  const [editingSchedule,    setEditingSchedule]    = useState<RentSchedule | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [deletingSessionId,  setDeletingSessionId]  = useState<string | null>(null);

  const countdownRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef             = useRef<string | null>(null);
  const lastSavedMsgIdRef        = useRef<number | null>(null);
  const lastConsumedRef          = useRef(lastConsumed);
  const trackingRef              = useRef(tracking);
  const lastLocationRequestedRef = useRef<string | null>(null);
  const togglingRef              = useRef(toggling);

  lastConsumedRef.current = lastConsumed;
  trackingRef.current     = tracking;
  togglingRef.current     = toggling;

  // ── Helpers ───────────────────────────────────────────────────────────────

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

        const live = data.find((s) => s.status === "active") ?? null;
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
        onActiveScheduleIdChange?.(live.scheduleId ?? null);

        lastLocationRequestedRef.current = live.lastLocationRequestedAt ?? null;
        const lastSent  = live.lastLocationRequestedAt ? new Date(live.lastLocationRequestedAt).getTime() : 0;
        const elapsed   = lastSent ? Date.now() - lastSent : INTERVAL_MS;
        const remaining = Math.max(0, INTERVAL_MS - elapsed);

        const trackingActive = !live.trackingPaused;
        setTracking(trackingActive);
        if (trackingActive) startCountdown(Math.floor(remaining / 1000));
      } catch { /* silent */ } finally {
        if (!cancelled) setRestored(true);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  // ── Poll: sync session state from backend every 5s ───────────────────────

  useEffect(() => {
    if (!restored) return;
    const id = setInterval(async () => {
      if (togglingRef.current) return;
      try {
        const r = await fetch(`/next-api/rent-sessions?carId=${car.id}`, { cache: "no-store" });
        if (!r.ok) return;
        const data: RentSession[] = await r.json();
        const live = data.find(s => s.status === "active") ?? null;

        // Session ended by NestJS cron or manually
        if (!live && sessionIdRef.current) {
          stopCountdown();
          setTracking(false);
          setSessionId(null);
          setPositions([]);
          setConfirmingEnd(false);
          sessionIdRef.current = null;
          lastLocationRequestedRef.current = null;
          setSessions(data.filter(s => s.status === "ended"));
          onActiveScheduleIdChange?.(null);
          return;
        }

        // New session created by NestJS cron
        if (live && !sessionIdRef.current) {
          sessionIdRef.current = live.id;
          setSessionId(live.id);
          setSessions(data.filter(s => s.status === "ended"));
          onActiveScheduleIdChange?.(live.scheduleId ?? null);
          lastSavedMsgIdRef.current = lastConsumedRef.current?.inbound?.id ?? null;
          lastLocationRequestedRef.current = live.lastLocationRequestedAt ?? null;
          try {
            const posRes = await fetch(`/next-api/rent-sessions/${live.id}/positions`, { cache: "no-store" });
            if (posRes.ok) setPositions(await posRes.json());
          } catch { /* silent */ }
        }

        // Sync trackingPaused → switch
        if (live && live.id === sessionIdRef.current) {
          const shouldTrack = !live.trackingPaused;
          if (shouldTrack !== trackingRef.current) {
            setTracking(shouldTrack);
            if (!shouldTrack) stopCountdown();
          }

          // Sync countdown from lastLocationRequestedAt when it changes
          const newLastReq = live.lastLocationRequestedAt ?? null;
          if (shouldTrack && newLastReq !== lastLocationRequestedRef.current) {
            lastLocationRequestedRef.current = newLastReq;
            const lastSent  = newLastReq ? new Date(newLastReq).getTime() : 0;
            const remaining = Math.max(0, INTERVAL_MS - (lastSent ? Date.now() - lastSent : INTERVAL_MS));
            startCountdown(Math.floor(remaining / 1000));
          }
        }
      } catch { /* silent */ }
    }, SESSION_POLL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, car.id]);

  // ── Notify parent which schedule IDs have sessions ───────────────────────

  useEffect(() => {
    const ids: string[] = [];
    if (sessionId && activeSchedule?.id) ids.push(activeSchedule.id);
    for (const s of sessions) {
      if (s.scheduleId) ids.push(s.scheduleId);
    }
    onUsedScheduleIdsChange?.(Array.from(new Set(ids)));
  }, [sessions, sessionId, activeSchedule, onUsedScheduleIdsChange]);

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
    if (!sessionId) return;
    setToggling(true);
    try {
      const res = await fetch(`/next-api/rent-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingPaused: false }),
      });
      if (!res.ok) return;
      const session: RentSession = await res.json();
      setTracking(!session.trackingPaused);
    } finally {
      setToggling(false);
    }
  };

  const pauseTracking = async () => {
    const sId = sessionIdRef.current;
    if (!sId) return;
    setToggling(true);
    try {
      const res = await fetch(`/next-api/rent-sessions/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingPaused: true }),
      });
      if (!res.ok) return;
      const session: RentSession = await res.json();
      stopCountdown();
      setTracking(!session.trackingPaused);
    } finally {
      setToggling(false);
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

  // ── Expand / collapse session history row ────────────────────────────────

  const toggleSessionExpand = async (session: RentSession) => {
    if (expandedSessionId === session.id) {
      setExpandedSessionId(null);
      return;
    }
    setExpandedSessionId(session.id);
    if (session.positions !== undefined) return;
    try {
      const res = await fetch(`/next-api/rent-sessions/${session.id}/positions`, { cache: "no-store" });
      if (res.ok) {
        const pos: RentPosition[] = await res.json();
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, positions: pos } : s));
      }
    } catch { /* silent */ }
  };

  // ── Delete ended session ──────────────────────────────────────────────────

  const handleSessionDelete = async (session: RentSession) => {
    setDeletingSessionId(session.id);
    try {
      const res = await fetch(`/next-api/rent-sessions/${session.id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== session.id));
        if (expandedSessionId === session.id) setExpandedSessionId(null);
        toast.success("Session deleted");
      } else {
        toast.error("Could not delete session — please try again");
      }
    } catch {
      toast.error("Network error — could not delete session");
    } finally {
      setDeletingSessionId(null);
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────────

  const fmt      = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const fmtShort = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const fmtDT    = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const hasSession  = !!sessionId;
  const pastSessions = sessions.filter(s => s.id !== sessionId);

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
                <span className={styles.countdown}> · next in {nextIn > 0 ? fmt(nextIn) : "now"}</span>
              </p>
            )}
            {!hasSession && (
              <p className={styles.noRentMsg}>No active rent</p>
            )}
          </div>
        </div>

        {hasSession && (
          confirmingEnd ? (
            <div className={styles.confirmRow}>
              <button className={`${styles.confirmBtn} ${styles.confirmEnd}`} onClick={endRent}>End rent</button>
              <button className={`${styles.confirmBtn} ${styles.confirmPause}`} onClick={() => setConfirmingEnd(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.headerRight}>
              <button className={styles.endRentBtn} onClick={() => setConfirmingEnd(true)}>
                End rent
              </button>
              <button
                className={`${styles.toggle} ${tracking ? styles.toggleOn : ""} ${toggling ? styles.toggleDisabled : ""}`}
                onClick={tracking ? pauseTracking : startTracking}
                disabled={toggling}
                aria-label={tracking ? "Pause tracking" : "Resume tracking"}
              >
                <span className={styles.thumb} />
              </button>
            </div>
          )
        )}
      </div>

      {/* ── Active schedule info ── */}
      {activeSchedule && hasSession && (
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
      {hasSession && (
        <div className={`${styles.activeBadge} ${!tracking ? styles.activeBadgePaused : ""}`}>
          <span className={styles.activeDot} />
          {tracking ? "Rent in progress" : "Rent active · tracking paused"}
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

      {/* ── Session history ── */}
      {pastSessions.length > 0 && (
        <div className={styles.history}>
          <p className={styles.historyTitle}>Past rents</p>
          {pastSessions.map(session => {
            const linked = allSchedules.find(s => s.id === session.scheduleId) ?? null;
            const isOpen = expandedSessionId === session.id;
            return (
              <div key={session.id} className={styles.sessionBlock}>
                <div className={`${styles.sessionRow} ${isOpen ? styles.sessionRowActive : ""}`}>
                  <div
                    className={styles.sessionRowMain}
                    onClick={() => toggleSessionExpand(session)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.sessionInfo}>
                      <span className={styles.sessionDate}>
                        {fmtShort(session.startedAt)} → {session.endedAt ? fmtShort(session.endedAt) : "…"}
                      </span>
                      {linked?.guestName && <span className={styles.sessionGuest}>👤 {linked.guestName}</span>}
                      {linked?.reservationNumber && <span className={styles.sessionRes}>#{linked.reservationNumber}</span>}
                    </div>
                    <span className={styles.sessionChevron}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  <div className={styles.sessionRowActions}>
                    <button
                      className={styles.sessionDeleteBtn}
                      onClick={() => handleSessionDelete(session)}
                      disabled={deletingSessionId === session.id}
                      aria-label="Delete"
                    >
                      {deletingSessionId === session.id ? "…" : "×"}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className={styles.sessionDetail}>
                    <div className={styles.sessionDetailPills}>
                      {linked && (
                        <span className={styles.scheduleCardPill}>
                          📏 {computeForfaitKm(linked.fromDate, linked.toDate).toLocaleString()} km
                        </span>
                      )}
                      {linked?.totalEarning != null && (
                        <span className={`${styles.scheduleCardPill} ${styles.scheduleCardPillEarning}`}>
                          💶 {linked.totalEarning.toLocaleString()} €
                        </span>
                      )}
                      <span className={styles.scheduleCardPill}>
                        📍 {session.positions !== undefined ? `${session.positions.length} positions` : "Loading…"}
                      </span>
                    </div>
                    {session.positions && session.positions.length > 0 ? (
                      <div className={styles.sessionMap}>
                        <RentMap positions={session.positions} height={220} />
                      </div>
                    ) : (
                      <p className={styles.sessionNoMap}>
                        {session.positions ? "No positions recorded." : "Loading…"}
                      </p>
                    )}
                  </div>
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
          sessionStarted={hasSession}
          onClose={() => { setShowEditModal(false); setEditingSchedule(null); }}
          onSaved={handleScheduleSaved}
        />
      )}
    </div>
  );
}
