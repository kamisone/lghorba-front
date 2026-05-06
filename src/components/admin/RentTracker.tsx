"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { CalendarBooking, Car } from "./data";
import RentMap, { type RentPosition } from "./RentMap";
import BookingAdminModal from "./BookingAdminModal";
import { useToast } from "@/components/toast/ToastContext";
import { useModalUrl } from "@/hooks/useModalUrl";
import styles from "./RentTracker.module.css";

interface RentSession {
  id: string;
  carId: string;
  bookingId: string | null;
  booking: CalendarBooking | null;
  status: "active" | "ended";
  trackingPaused: boolean;
  startedAt: string;
  endedAt?: string;
  lastLocationRequestedAt?: string | null;
  nextLocationAt?: string | null;
  positions?: RentPosition[];
}

const INTERVAL_MS     = 15 * 60 * 1000;
const SESSION_POLL_MS = 5_000;

function computeForfaitKm(startDateTime: string, endDateTime: string): number {
  const ms = new Date(endDateTime).getTime() - new Date(startDateTime).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) * 200;
}

interface Props {
  car: Car;
  onBookingUpdate: (b: CalendarBooking) => void;
  onBookingDelete: (id: string) => void;
  onUsedBookingIdsChange?: (ids: string[]) => void;
  onEndedBookingIdsChange?: (ids: string[]) => void;
}

export default function RentTracker({ car, onBookingUpdate, onBookingDelete, onUsedBookingIdsChange, onEndedBookingIdsChange }: Props) {
  const { toast } = useToast();
  const { openModal, closeModal } = useModalUrl();

  const [tracking,          setTracking]          = useState(false);
  const [sessionId,         setSessionId]         = useState<string | null>(null);
  const [activeBooking,     setActiveBooking]     = useState<CalendarBooking | null>(null);
  const [positions,         setPositions]         = useState<RentPosition[]>([]);
  const [sessions,          setSessions]          = useState<RentSession[]>([]);
  const [toggling,          setToggling]          = useState(false);
  const [nextIn,            setNextIn]            = useState(0);
  const [confirmingEnd,     setConfirmingEnd]     = useState(false);
  const [restored,          setRestored]          = useState(false);
  const [mapFullscreen,          setMapFullscreen]          = useState(false);
  const [fullscreenSessionId,    setFullscreenSessionId]    = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [editingBooking,    setEditingBooking]    = useState<CalendarBooking | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [deletingSessionId,  setDeletingSessionId]  = useState<string | null>(null);
  const [stoppingTrackingIds, setStoppingTrackingIds] = useState<Set<string>>(new Set());

  const countdownRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef             = useRef<string | null>(null);
  const trackingRef              = useRef(tracking);
  const lastLocationRequestedRef = useRef<string | null>(null);
  const togglingRef              = useRef(toggling);

  trackingRef.current = tracking;
  togglingRef.current = toggling;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const secsUntil = (iso: string | null | undefined): number =>
    iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 0;

  const remainingSecs = (lastReq: string | null | undefined, nextAt: string | null | undefined): number =>
    lastReq
      ? Math.max(0, Math.floor((INTERVAL_MS - (Date.now() - new Date(lastReq).getTime())) / 1000))
      : secsUntil(nextAt);

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

        setSessionId(live.id);
        setActiveBooking(live.booking ?? null);
        setPositions(restoredPositions);

        lastLocationRequestedRef.current = live.lastLocationRequestedAt ?? null;

        const trackingActive = !live.trackingPaused;
        setTracking(trackingActive);
        if (trackingActive) startCountdown(remainingSecs(live.lastLocationRequestedAt, live.nextLocationAt));
      } catch { /* silent */ } finally {
        if (!cancelled) setRestored(true);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  // ── Restore booking-edit modal from URL (runs once after sessions load) ───

  const trackerRestoredRef = useRef(false);
  useEffect(() => {
    if (!restored || trackerRestoredRef.current) return;
    trackerRestoredRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modal") !== "tracker-booking-edit") return;
    const bookingId = sp.get("bookingId");
    if (!bookingId) return;
    const candidate =
      activeBooking?.id === bookingId ? activeBooking
      : sessions.flatMap(s => s.booking ? [s.booking] : []).find(b => b.id === bookingId)
      ?? null;
    if (candidate) { setEditingBooking(candidate); setShowEditModal(true); }
  }, [restored, activeBooking, sessions]);

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

        if (!live && sessionIdRef.current) {
          stopCountdown();
          setTracking(false);
          setSessionId(null);
          setActiveBooking(null);
          setPositions([]);
          setConfirmingEnd(false);
          sessionIdRef.current = null;
          lastLocationRequestedRef.current = null;
          setSessions(data.filter(s => s.status === "ended"));
          return;
        }

        if (live && !sessionIdRef.current) {
          sessionIdRef.current = live.id;
          setSessionId(live.id);
          setActiveBooking(live.booking ?? null);
          setSessions(data.filter(s => s.status === "ended"));
          lastLocationRequestedRef.current = live.lastLocationRequestedAt ?? null;
          try {
            const posRes = await fetch(`/next-api/rent-sessions/${live.id}/positions`, { cache: "no-store" });
            if (posRes.ok) setPositions(await posRes.json());
          } catch { /* silent */ }
        }

        if (live && live.id === sessionIdRef.current) {
          const shouldTrack = !live.trackingPaused;
          if (shouldTrack !== trackingRef.current) {
            setTracking(shouldTrack);
            if (!shouldTrack) {
              stopCountdown();
            } else {
              lastLocationRequestedRef.current = live.lastLocationRequestedAt ?? null;
              startCountdown(remainingSecs(live.lastLocationRequestedAt, live.nextLocationAt));
            }
          }

          const newLastReq = live.lastLocationRequestedAt ?? null;
          if (shouldTrack && newLastReq !== lastLocationRequestedRef.current) {
            lastLocationRequestedRef.current = newLastReq;
            startCountdown(remainingSecs(live.lastLocationRequestedAt, live.nextLocationAt));
          }

          if (shouldTrack) {
            try {
              const posRes = await fetch(`/next-api/rent-sessions/${live.id}/positions`, { cache: "no-store" });
              if (posRes.ok) {
                const fetched: RentPosition[] = await posRes.json();
                setPositions(prev => {
                  if (prev.length === fetched.length && prev.at(-1)?.id === fetched.at(-1)?.id) return prev;
                  return fetched;
                });
              }
            } catch { /* silent */ }
          }
        }
      } catch { /* silent */ }
    }, SESSION_POLL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, car.id]);

  // ── Notify parent which booking IDs have sessions ────────────────────────

  useEffect(() => {
    const usedIds: string[] = [];
    const endedIds: string[] = [];
    if (sessionId && activeBooking?.id) usedIds.push(activeBooking.id);
    for (const s of sessions) {
      if (s.bookingId) {
        usedIds.push(s.bookingId);
        endedIds.push(s.bookingId);
      }
    }
    onUsedBookingIdsChange?.(Array.from(new Set(usedIds)));
    onEndedBookingIdsChange?.(Array.from(new Set(endedIds)));
  }, [sessions, sessionId, activeBooking, onUsedBookingIdsChange, onEndedBookingIdsChange]);

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
      if (!session.trackingPaused) {
        lastLocationRequestedRef.current = session.lastLocationRequestedAt ?? null;
        startCountdown(remainingSecs(session.lastLocationRequestedAt, session.nextLocationAt));
      }
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

  // ── Booking edit / delete ─────────────────────────────────────────────────

  const openEditBooking = (b: CalendarBooking) => {
    setEditingBooking(b);
    setShowEditModal(true);
    openModal("tracker-booking-edit", { bookingId: b.id });
  };

  const handleBookingSaved = (updated: CalendarBooking) => {
    onBookingUpdate(updated);
    setShowEditModal(false);
    setEditingBooking(null);
    closeModal();
  };

  const handleBookingDelete = async (bk: CalendarBooking) => {
    setDeletingBookingId(bk.id);
    try {
      const res = await fetch(`/next-api/bookings/${bk.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setSessions(prev => prev.filter(sess => sess.bookingId !== bk.id));
        if (bk.id === activeBooking?.id && (tracking || !!sessionId)) {
          stopCountdown();
          setTracking(false);
          setConfirmingEnd(false);
          setSessionId(null);
          setActiveBooking(null);
          setPositions([]);
          sessionIdRef.current = null;
        }
        onBookingDelete(bk.id);
      }
    } finally {
      setDeletingBookingId(null);
    }
  };

  // ── Stop manual GPS tracking on an ended session ──────────────────────────

  const stopManualTracking = async (sId: string) => {
    setStoppingTrackingIds(prev => new Set(prev).add(sId));
    try {
      const res = await fetch(`/next-api/rent-sessions/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingPaused: true }),
      });
      if (res.ok) {
        setSessions(prev =>
          prev.map(s => s.id === sId ? { ...s, trackingPaused: true, nextLocationAt: null } : s),
        );
      }
    } finally {
      setStoppingTrackingIds(prev => { const n = new Set(prev); n.delete(sId); return n; });
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
        if (session.bookingId) onBookingDelete(session.bookingId);
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

  const hasSession   = !!sessionId;
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
                <span className={styles.countdown}> · next in {fmt(nextIn)}</span>
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

      {/* ── Active booking info ── */}
      {activeBooking && hasSession && (
        <div className={styles.scheduleCard}>
          <div className={styles.scheduleCardHeader}>
            <div className={styles.scheduleCardDates}>
              <span>{fmtDT(activeBooking.startDateTime)}</span>
              <span className={styles.scheduleCardArrow}>→</span>
              <span>{fmtDT(activeBooking.endDateTime)}</span>
            </div>
            <div className={styles.scheduleCardActions}>
              <button className={styles.sessionEditBtn} onClick={() => openEditBooking(activeBooking)} aria-label="Edit">✏</button>
              <button
                className={styles.sessionDeleteBtn}
                onClick={() => handleBookingDelete(activeBooking)}
                disabled={deletingBookingId === activeBooking.id}
                aria-label="Delete"
              >
                {deletingBookingId === activeBooking.id ? "…" : "×"}
              </button>
            </div>
          </div>
          <div className={styles.scheduleCardMeta}>
            {activeBooking.user?.name && (
              <Link
                href={`/admin/users/${activeBooking.user.id}`}
                className={`${styles.scheduleCardPill} ${styles.scheduleCardPillUser}`}
              >
                👤 {activeBooking.user.name}
              </Link>
            )}
            {activeBooking.customerName && (
              <span className={styles.scheduleCardPill}>👤 {activeBooking.customerName}</span>
            )}
            {activeBooking.reservationNumber && <span className={styles.scheduleCardPill}>📋 {activeBooking.reservationNumber}</span>}
            <span className={styles.scheduleCardPill}>📏 {computeForfaitKm(activeBooking.startDateTime, activeBooking.endDateTime).toLocaleString()} km</span>
            {activeBooking.totalEarning != null && <span className={`${styles.scheduleCardPill} ${styles.scheduleCardPillEarning}`}>💶 {activeBooking.totalEarning.toLocaleString()} €</span>}
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
            const linked = session.booking;
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
                      {linked?.user?.name && (
                        <Link
                          href={`/admin/users/${linked.user.id}`}
                          className={styles.sessionGuestLink}
                          title={`View profile: ${linked.user.name}`}
                        >
                          👤 {linked.user.name}
                        </Link>
                      )}
                      {linked?.customerName && (
                        <span className={styles.sessionGuest}>👤 {linked.customerName}</span>
                      )}
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
                {!session.trackingPaused && session.booking?.gpsStopMode === "manual" && (
                  <div className={styles.manualTrackingBanner}>
                    <span className={styles.manualTrackingLabel}>
                      📡 GPS tracking still active
                    </span>
                    <button
                      className={styles.stopTrackingBtn}
                      onClick={() => stopManualTracking(session.id)}
                      disabled={stoppingTrackingIds.has(session.id)}
                    >
                      {stoppingTrackingIds.has(session.id) ? "Stopping…" : "Stop tracking"}
                    </button>
                  </div>
                )}

                {isOpen && (
                  <div className={styles.sessionDetail}>
                    <div className={styles.sessionDetailPills}>
                      {linked && (
                        <span className={styles.scheduleCardPill}>
                          📏 {computeForfaitKm(linked.startDateTime, linked.endDateTime).toLocaleString()} km
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
                      <>
                        <div className={styles.mapWrap}>
                          <div className={styles.mapHeader}>
                            <div className={styles.mapRange}>
                              <span className={styles.mapRangeStart}>● 1</span>
                              <span className={styles.mapRangeDash} />
                              <span className={styles.mapRangeEnd}>● {session.positions.length}</span>
                            </div>
                            <button className={styles.mapExpandBtn} onClick={() => setFullscreenSessionId(session.id)} title="Fullscreen">⛶</button>
                          </div>
                          <RentMap positions={session.positions} height={220} />
                        </div>
                        {fullscreenSessionId === session.id && (
                          <div className={styles.mapFullscreenOverlay}>
                            <div className={styles.mapFullscreenBar}>
                              <span className={styles.mapFullscreenLabel}>{session.positions.length} position{session.positions.length !== 1 ? "s" : ""}</span>
                              <button className={styles.mapFullscreenClose} onClick={() => setFullscreenSessionId(null)}>✕ Close</button>
                            </div>
                            <div className={styles.mapFullscreenBody}>
                              <RentMap positions={session.positions} fill />
                            </div>
                          </div>
                        )}
                      </>
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

      {/* ── Edit booking modal ── */}
      {showEditModal && editingBooking && (
        <BookingAdminModal
          car={car}
          booking={editingBooking}
          sessionStarted={hasSession}
          onClose={() => { setShowEditModal(false); setEditingBooking(null); closeModal(); }}
          onSaved={handleBookingSaved}
        />
      )}
    </div>
  );
}
