"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import styles from "./AnalyticsTelemetry.module.css";
import { Map as MapIcon, MapPinOff } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RentPosition {
  id: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

interface RentSession {
  id: string;
  carId: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt?: string | null;
  booking?: {
    id: string;
    car?: { id: string; name: string; immatriculation: string } | null;
  } | null;
  positions?: RentPosition[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROUTE_COLORS = [
  "#8DC220", "#00466E", "#3b82f6", "#f59e0b",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
  "#22c55e", "#ef4444",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDuration(startedAt: string, endedAt?: string | null): string {
  if (!endedAt) return "Active";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs >= 48) return `${Math.round(hrs / 24)}d`;
  if (hrs >= 1) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function haversineKm(a: RentPosition, b: RentPosition): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

function totalDistanceKm(positions: RentPosition[]): number {
  let km = 0;
  for (let i = 1; i < positions.length; i++) km += haversineKm(positions[i - 1], positions[i]);
  return km;
}

// ── Telemetry Map ─────────────────────────────────────────────────────────────

interface MapProps {
  sessions: RentSession[];
  activeSessionId: string | null;
}

function TelemetryMap({ sessions, activeSessionId }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    import("leaflet").then(({ default: L }) => {
      // Rebuild map on dependency change
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current!, { center: [46.5, 2.5], zoom: 5 });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© <a href='https://openstreetmap.org'>OSM</a>",
        maxZoom: 19,
      }).addTo(map);

      const toShow = activeSessionId
        ? sessions.filter(s => s.id === activeSessionId)
        : sessions;

      const allBounds: [number, number][] = [];

      toShow.forEach((session, idx) => {
        const positions = session.positions ?? [];
        if (positions.length < 2) return;

        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        const latlngs: [number, number][] = positions.map(p => [p.lat, p.lng]);

        L.polyline(latlngs, {
          color,
          weight: activeSessionId ? 3.5 : 2,
          opacity: activeSessionId ? 0.9 : 0.65,
          smoothFactor: 1.5,
        }).addTo(map);

        const startIcon = L.divIcon({
          className: "",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([positions[0].lat, positions[0].lng], { icon: startIcon })
          .bindPopup(`<b>${session.booking?.car?.name ?? session.carId}</b><br>Start: ${fmtDateTime(session.startedAt)}`)
          .addTo(map);

        const last = positions[positions.length - 1];
        const endIcon = L.divIcon({
          className: "",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([last.lat, last.lng], { icon: endIcon })
          .bindPopup(`<b>${session.booking?.car?.name ?? session.carId}</b><br>End: ${fmtDateTime(session.endedAt ?? last.recordedAt)}`)
          .addTo(map);

        // Intermediate dots for single-session view
        if (activeSessionId && positions.length > 2) {
          positions.slice(1, -1).forEach(pos => {
            L.circleMarker([pos.lat, pos.lng], {
              radius: 3,
              color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 1,
            })
              .bindPopup(fmtDateTime(pos.recordedAt))
              .addTo(map);
          });
        }

        allBounds.push(...latlngs);
      });

      if (allBounds.length > 0) {
        map.fitBounds(L.latLngBounds(allBounds), { padding: [24, 24], maxZoom: 15 });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [sessions, activeSessionId]);

  return <div ref={containerRef} className={styles.mapContainer} />;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsTelemetry() {
  const [sessions, setSessions] = useState<RentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/rent-sessions?limit=20")
      .then(r => (r.ok ? r.json() : []))
      .then(async data => {
        const raw = safeArray<RentSession>(data);
        setSessions(raw);
        setLoading(false);

        if (raw.length === 0) return;

        setPositionsLoading(true);
        const toFetch = raw.slice(0, 12);
        const withPositions = await Promise.all(
          toFetch.map(async session => {
            try {
              const r = await fetch(`/next-api/rent-sessions/${session.id}/positions`);
              const positions = r.ok ? safeArray<RentPosition>(await r.json()) : [];
              return { ...session, positions };
            } catch {
              return { ...session, positions: [] as RentPosition[] };
            }
          }),
        );
        setSessions(prev => {
          const byId = new Map(withPositions.map(s => [s.id, s]));
          return prev.map(s => byId.get(s.id) ?? s);
        });
        setPositionsLoading(false);
      });
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(prev => (prev === id ? null : id));
  }, []);

  const sessionsWithRoutes = useMemo(
    () => sessions.filter(s => (s.positions?.length ?? 0) >= 2),
    [sessions],
  );

  const kpis = useMemo(() => {
    const allPositions = sessionsWithRoutes.flatMap(s => s.positions ?? []);
    const totalKm = sessionsWithRoutes.reduce(
      (sum, s) => sum + totalDistanceKm(s.positions ?? []),
      0,
    );
    return {
      sessionsWithRoutes: sessionsWithRoutes.length,
      totalPositions: allPositions.length,
      totalKm,
      avgKm: sessionsWithRoutes.length > 0 ? totalKm / sessionsWithRoutes.length : 0,
      activeSessions: sessions.filter(s => s.status === "active").length,
    };
  }, [sessions, sessionsWithRoutes]);

  const hasMap = sessionsWithRoutes.length > 0;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin/analytics" className={styles.breadcrumbLink}>Analytics</Link>
            <span className={styles.breadcrumbSep}>›</span>
            Telemetry & Routes
          </div>
          <h1 className={styles.title}>Telemetry & Route Analytics</h1>
          <p className={styles.subtitle}>
            GPS trip routes, geographic coverage, and position tracking
          </p>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Sessions w/ Routes</div>
          <div className={styles.kpiValue}>{kpis.sessionsWithRoutes}</div>
          <div className={styles.kpiSub}>of {sessions.length} loaded</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Positions</div>
          <div className={styles.kpiValue}>{kpis.totalPositions.toLocaleString()}</div>
          <div className={styles.kpiSub}>GPS data points</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Distance</div>
          <div className={styles.kpiValue}>{kpis.totalKm.toFixed(0)} km</div>
          <div className={styles.kpiSub}>estimated from GPS</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Avg Trip Distance</div>
          <div className={styles.kpiValue}>{kpis.avgKm.toFixed(0)} km</div>
          <div className={styles.kpiSub}>per session</div>
        </div>
      </div>

      {/* ── Map + Session List ── */}
      <div className={styles.mainLayout}>

        {/* Map */}
        <div className={styles.mapCard}>
          <div className={styles.mapHeader}>
            <h2 className={styles.mapTitle}>
              {activeSessionId ? "Selected Route" : "All Routes"}
              {positionsLoading && (
                <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>
                  Fetching positions…
                </span>
              )}
            </h2>
            <div className={styles.mapLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#22c55e" }} />
                Start
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                End
              </span>
              {activeSessionId && (
                <button
                  onClick={() => setActiveSessionId(null)}
                  style={{
                    fontSize: 11,
                    color: "#8DC220",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Show all routes
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className={styles.mapPlaceholder}>
              <MapIcon size={18} strokeWidth={1.75} className={styles.mapPlaceholderIcon} />
              <span className={styles.mapPlaceholderText}>Loading sessions…</span>
            </div>
          ) : !hasMap ? (
            <div className={styles.mapPlaceholder}>
              <MapPinOff size={18} strokeWidth={1.75} className={styles.mapPlaceholderIcon} />
              <span className={styles.mapPlaceholderText}>
                {positionsLoading ? "Fetching GPS positions…" : "No GPS route data available"}
              </span>
            </div>
          ) : (
            <TelemetryMap sessions={sessionsWithRoutes} activeSessionId={activeSessionId} />
          )}
        </div>

        {/* Session List */}
        <div className={styles.sessionList}>
          <div className={styles.sessionListHeader}>
            <h3 className={styles.sessionListTitle}>
              Recent Sessions
              <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6, fontSize: 13 }}>
                ({sessions.length})
              </span>
            </h3>
          </div>
          <div className={styles.sessionItems}>
            {loading ? (
              <div className={styles.emptyState}>Loading…</div>
            ) : sessions.length === 0 ? (
              <div className={styles.emptyState}>No sessions found</div>
            ) : (
              sessions.map((session, idx) => {
                const positions = session.positions ?? [];
                const distKm = positions.length >= 2 ? totalDistanceKm(positions) : 0;
                const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
                const isActive = activeSessionId === session.id;
                const hasRoute = positions.length >= 2;

                return (
                  <div
                    key={session.id}
                    className={`${styles.sessionItem} ${isActive ? styles.sessionItemActive : ""}`}
                    onClick={() => hasRoute && selectSession(session.id)}
                    style={{ cursor: hasRoute ? "pointer" : "default", opacity: hasRoute ? 1 : 0.6 }}
                  >
                    <div className={styles.sessionName}>
                      {hasRoute && (
                        <span className={styles.sessionColor} style={{ background: color }} />
                      )}
                      {session.booking?.car?.name ?? session.carId.slice(0, 8)}
                      {session.booking?.car?.immatriculation && (
                        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>
                          {session.booking.car.immatriculation}
                        </span>
                      )}
                    </div>
                    <div className={styles.sessionMeta}>
                      <span>{fmtDateTime(session.startedAt)}</span>
                      <span>·</span>
                      <span>{fmtDuration(session.startedAt, session.endedAt)}</span>
                    </div>
                    <div className={styles.sessionPositions}>
                      {positionsLoading && !positions.length
                        ? "Loading positions…"
                        : `${positions.length} positions${distKm > 0 ? ` · ~${distKm.toFixed(1)} km` : ""}${!hasRoute && positions.length > 0 ? " · too few for route" : !hasRoute ? " · no data" : ""}`}
                    </div>
                    <span
                      className={`${styles.sessionBadge} ${
                        session.status === "active"
                          ? styles.sessionBadgeActive
                          : styles.sessionBadgeEnded
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      {sessionsWithRoutes.length > 0 && (
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <div className={styles.statsLabel}>Longest Route</div>
            <div className={styles.statsValue}>
              {Math.max(...sessionsWithRoutes.map(s => totalDistanceKm(s.positions ?? []))).toFixed(1)} km
            </div>
          </div>
          <div className={styles.statsCard}>
            <div className={styles.statsLabel}>Most Positions</div>
            <div className={styles.statsValue}>
              {Math.max(...sessionsWithRoutes.map(s => s.positions?.length ?? 0))}
            </div>
          </div>
          <div className={styles.statsCard}>
            <div className={styles.statsLabel}>Active Tracking Now</div>
            <div
              className={styles.statsValue}
              style={{ color: kpis.activeSessions > 0 ? "#22c55e" : "#94a3b8" }}
            >
              {kpis.activeSessions}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
