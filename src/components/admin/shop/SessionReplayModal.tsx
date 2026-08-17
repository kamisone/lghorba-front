"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import shopStyles from "./ShopAdmin.module.css";
import styles from "./SessionReplay.module.css";
import type { ReplayPlayerHandle } from "./ReplayPlayer";

// Heavy, canvas/DOM-touching library — never server-rendered. Mirrors the
// existing next/dynamic({ ssr: false }) pattern for other admin-only heavy
// client components (e.g. ContentEditor, BlogRichEditor).
const ReplayPlayer = dynamic(() => import("./ReplayPlayer"), {
  ssr: false,
  loading: () => <div className={styles.stateBox}>Loading player…</div>,
});

interface SessionListItem {
  id: string;
  countryCode: string | null;
  countryName: string | null;
  device: string | null;
  source: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  eventCount: number;
  clickCount: number;
  maxScrollPct: number;
  pageUrl: string | null;
}

interface ReplayMarker {
  id: string;
  type: "session_start" | "session_end" | "click" | "scroll" | "navigation";
  timestampMs: number;
  label: string | null;
  meta: Record<string, unknown> | null;
}

interface SessionDetail {
  session: SessionListItem & { viewportWidth: number | null; viewportHeight: number | null };
  markers: ReplayMarker[];
}

type FetchState = "loading" | "ready" | "empty" | "error";

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const MARKER_DOT_CLASS: Record<string, string> = {
  click: styles.markerClick,
  scroll: styles.markerScroll,
  navigation: styles.markerNavigation,
  session_start: styles.markerSession,
  session_end: styles.markerSession,
};

const MARKER_LABEL: Record<string, string> = {
  click: "Click",
  scroll: "Scroll",
  navigation: "Navigation",
  session_start: "Session started",
  session_end: "Session ended",
};

export default function SessionReplayModal({
  productId,
  productTitle,
  windowParams,
  onClose,
}: {
  productId: string;
  productTitle: string;
  windowParams: Record<string, string>;
  onClose: () => void;
}) {
  const [listState, setListState] = useState<FetchState>("loading");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [detailState, setDetailState] = useState<FetchState>("loading");
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [events, setEvents] = useState<unknown[]>([]);

  const [activeTimeMs, setActiveTimeMs] = useState(0);
  const playerRef = useRef<ReplayPlayerHandle>(null);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams(windowParams);
    params.set("productId", productId);
    return params.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, JSON.stringify(windowParams)]);

  useEffect(() => {
    let cancelled = false;
    setListState("loading");
    fetch(`/next-api/admin/shop/analytics/replay/sessions?${listQuery}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: SessionListItem[]) => {
        if (cancelled) return;
        setSessions(Array.isArray(data) ? data : []);
        setListState(Array.isArray(data) && data.length ? "ready" : "empty");
      })
      .catch(() => { if (!cancelled) setListState("error"); });
    return () => { cancelled = true; };
  }, [listQuery]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetailState("loading");
    setDetail(null);
    setEvents([]);
    Promise.all([
      fetch(`/next-api/admin/shop/analytics/replay/sessions/${selectedId}`).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch(`/next-api/admin/shop/analytics/replay/sessions/${selectedId}/events`).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
    ])
      .then(([detailData, eventsData]: [SessionDetail, unknown[]]) => {
        if (cancelled) return;
        setDetail(detailData);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setDetailState("ready");
      })
      .catch(() => { if (!cancelled) setDetailState("error"); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const durationMs = detail?.session.durationMs ?? detail?.markers.at(-1)?.timestampMs ?? 0;

  const seekTo = (ms: number) => {
    playerRef.current?.goto(ms);
    setActiveTimeMs(ms);
  };

  return createPortal(
    <div className={shopStyles.modalOverlay} onClick={onClose}>
      <div
        className={`${shopStyles.modalPanel} ${styles.wide}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={shopStyles.modalHeader}>
          <div>
            <h3 className={shopStyles.modalTitle}>Session Replays</h3>
            <div className={shopStyles.modalSubtitle}>{productTitle}</div>
          </div>
          <button className={shopStyles.modalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={shopStyles.modalBody}>
          {!selectedId ? (
            <SessionList
              state={listState}
              sessions={sessions}
              onSelect={setSelectedId}
            />
          ) : (
            <>
              <button className={styles.backBtn} onClick={() => setSelectedId(null)}>
                ← Back to sessions
              </button>

              {detailState === "loading" && <div className={styles.stateBox}>Loading session…</div>}
              {detailState === "error" && (
                <div className={`${styles.stateBox} ${styles.stateBoxError}`}>
                  Couldn&apos;t load this replay. Try again in a moment.
                </div>
              )}
              {detailState === "ready" && detail && (
                <div className={styles.playerLayout}>
                  <div className={styles.playerCol}>
                    <ReplayPlayer
                      ref={playerRef}
                      events={events as any}
                      viewportWidth={detail.session.viewportWidth}
                      viewportHeight={detail.session.viewportHeight}
                      onTimeUpdate={setActiveTimeMs}
                    />
                    <Timeline
                      markers={detail.markers}
                      durationMs={durationMs || 1}
                      activeTimeMs={activeTimeMs}
                      onSeek={seekTo}
                    />
                  </div>
                  <EventList
                    markers={detail.markers}
                    activeTimeMs={activeTimeMs}
                    onSeek={seekTo}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SessionList({
  state,
  sessions,
  onSelect,
}: {
  state: FetchState;
  sessions: SessionListItem[];
  onSelect: (id: string) => void;
}) {
  if (state === "loading") {
    return <span className={shopStyles.skeleton} style={{ height: 180, width: "100%", borderRadius: 10, display: "block" }} />;
  }
  if (state === "error") {
    return <div className={`${styles.stateBox} ${styles.stateBoxError}`}>Couldn&apos;t load sessions. Try again in a moment.</div>;
  }
  if (state === "empty" || sessions.length === 0) {
    return <div className={shopStyles.modalEmpty}>No recorded sessions for this product in this date range.</div>;
  }
  return (
    <table className={shopStyles.table}>
      <thead>
        <tr>
          <th>Started</th>
          <th>Duration</th>
          <th>Device</th>
          <th>Country</th>
          <th>Source</th>
          <th>Clicks</th>
          <th>Max scroll</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.id} className={shopStyles.clickableRow} onClick={() => onSelect(s.id)} title="Click to open replay">
            <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(s.startedAt)}</td>
            <td>{fmtDuration(s.durationMs)}</td>
            <td>{s.device === "mobile" ? "Mobile" : s.device === "desktop" ? "Desktop" : "—"}</td>
            <td>{s.countryName ?? "—"}</td>
            <td>{s.source ?? "—"}</td>
            <td>{s.clickCount}</td>
            <td>{s.maxScrollPct}%</td>
            <td>
              <span className={`${styles.metaBadge} ${s.status === "active" ? styles.statusActive : styles.statusEnded}`}>
                {s.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Timeline({
  markers,
  durationMs,
  activeTimeMs,
  onSeek,
}: {
  markers: ReplayMarker[];
  durationMs: number;
  activeTimeMs: number;
  onSeek: (ms: number) => void;
}) {
  return (
    <div
      className={styles.timeline}
      role="slider"
      aria-label="Replay timeline"
      aria-valuemin={0}
      aria-valuemax={durationMs}
      aria-valuenow={activeTimeMs}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        onSeek(Math.round(pct * durationMs));
      }}
    >
      {markers.map((m) => (
        <span
          key={m.id}
          className={`${styles.timelineMarker} ${MARKER_DOT_CLASS[m.type] ?? ""}`}
          style={{ left: `${Math.min(100, (m.timestampMs / durationMs) * 100)}%` }}
          title={`${MARKER_LABEL[m.type]}${m.label ? ` — ${m.label}` : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(m.timestampMs);
          }}
        />
      ))}
    </div>
  );
}

function EventList({
  markers,
  activeTimeMs,
  onSeek,
}: {
  markers: ReplayMarker[];
  activeTimeMs: number;
  onSeek: (ms: number) => void;
}) {
  return (
    <div className={styles.eventCol}>
      <div className={styles.eventColHead}>Events ({markers.length})</div>
      <div className={styles.eventList}>
        {markers.map((m) => {
          const active = Math.abs(m.timestampMs - activeTimeMs) < 400;
          return (
            <button
              key={m.id}
              type="button"
              className={`${styles.eventRow} ${active ? styles.eventRowActive : ""}`}
              onClick={() => onSeek(m.timestampMs)}
            >
              <span className={styles.eventDot} style={{ background: dotColor(m.type) }} />
              <span className={styles.eventTime}>{(m.timestampMs / 1000).toFixed(1)}s</span>
              <span className={styles.eventLabel}>
                {MARKER_LABEL[m.type]}
                {m.label ? ` — ${m.label}` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function dotColor(type: string): string {
  switch (type) {
    case "click": return "#f59e0b";
    case "scroll": return "#3b82f6";
    case "navigation": return "#8b5cf6";
    default: return "#10b981";
  }
}
