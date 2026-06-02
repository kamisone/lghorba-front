"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./DestinationsPage.module.css";
import {
  RefreshCw, MapPin, Globe, Star, EyeOff, List, Map, Search,
  ChevronLeft, ChevronRight, ExternalLink, ChevronDown, ChevronUp, ArrowUpDown,
  Utensils, ShoppingBag, Waves, Trees, PlaneTakeoff, TrainFront, Hospital, Hotel,
  Wrench, Landmark, type LucideIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type DestinationStatus   = "active" | "ignored" | "featured";
type DestinationCategory = "tourism" | "shopping" | "dining" | "beach" | "nature" | "airport" | "transport" | "healthcare" | "accommodation" | "services" | "other";

interface DestinationSummary {
  id:                string;
  name:              string | null;
  city:              string | null;
  region:            string | null;
  country:           string;
  lat:               number;
  lng:               number;
  visitCount:        number;
  uniqueRentalCount: number;
  vehicleCount:      number;
  confidenceScore:   number;
  avgDwellMinutes:   number | null;
  weekdayVisits:     number;
  weekendVisits:     number;
  firstDetectedAt:   string | null;
  lastDetectedAt:    string | null;
  category:          string | null;
  tags:              string[] | null;
  status:            DestinationStatus;
  isPublished:       boolean;
}

interface ListResponse {
  data:  DestinationSummary[];
  total: number;
}

interface Stats {
  total:       number;
  published:   number;
  featured:    number;
  ignored:     number;
  totalVisits: number;
  byCategory:  { category: string; count: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DestinationStatus, string> = {
  active:   "Active",
  featured: "Featured",
  ignored:  "Ignored",
};

const CATEGORY_LABELS: Record<DestinationCategory, string> = {
  tourism:       "Tourism",
  shopping:      "Shopping",
  dining:        "Dining",
  beach:         "Beach",
  nature:        "Nature",
  airport:       "Airport",
  transport:     "Transport",
  healthcare:    "Healthcare",
  accommodation: "Accommodation",
  services:      "Services",
  other:         "Other",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tourism:       Landmark,
  shopping:      ShoppingBag,
  dining:        Utensils,
  beach:         Waves,
  nature:        Trees,
  airport:       PlaneTakeoff,
  transport:     TrainFront,
  healthcare:    Hospital,
  accommodation: Hotel,
  services:      Wrench,
  other:         MapPin,
};

const STATUS_COLORS: Record<DestinationStatus, string> = {
  active:   "#22c55e",
  featured: "#f59e0b",
  ignored:  "#94a3b8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDwell(mins: number | null): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}

function confidenceColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") q.set(k, String(v));
  }
  return q.toString() ? `?${q.toString()}` : "";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DestinationsPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [data,    setData]    = useState<DestinationSummary[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list" | "map">("list");

  // Filters
  const [search,        setSearch]        = useState("");
  const [status,        setStatus]        = useState<string>("all");
  const [category,      setCategory]      = useState<string>("all");
  const [minConf,       setMinConf]       = useState<string>("");
  const [dateFrom,      setDateFrom]      = useState<string>("");
  const [dateTo,        setDateTo]        = useState<string>("");
  const [sort,          setSort]          = useState<string>("lastDetectedAt");
  const [order,         setOrder]         = useState<string>("desc");
  const [page,          setPage]          = useState(1);

  // Aggregation state
  const [aggLoading, setAggLoading] = useState(false);
  const [aggResult,  setAggResult]  = useState<{ processed: number; skipped: number; errors: number } | null>(null);

  const LIMIT = 25;

  // ── Fetch stats ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/next-api/insights/destinations/stats")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setStats)
      .catch(() => null);
  }, []);

  // ── Fetch list ───────────────────────────────────────────────────────────────

  const fetchList = useCallback(() => {
    setLoading(true);
    const qs = buildQuery({ page, limit: LIMIT, search, status, category, minConfidence: minConf || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sort, order });
    fetch(`/next-api/insights/destinations${qs}`)
      .then(r => r.json())
      .then((res: ListResponse) => {
        setData(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        setData([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, search, status, category, minConf, dateFrom, dateTo, sort, order]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, status, category, minConf, dateFrom, dateTo]);

  // ── Sort helper ──────────────────────────────────────────────────────────────

  function handleSort(col: string) {
    if (sort === col) {
      setOrder(o => o === "asc" ? "desc" : "asc");
    } else {
      setSort(col);
      setOrder("desc");
    }
  }

  function sortIcon(col: string) {
    if (sort !== col) return <ArrowUpDown size={14} strokeWidth={1.75} />;
    return order === "asc"
      ? <ChevronUp size={14} strokeWidth={1.75} />
      : <ChevronDown size={14} strokeWidth={1.75} />;
  }

  // ── Aggregation trigger ──────────────────────────────────────────────────────

  async function triggerAggregation() {
    setAggLoading(true);
    setAggResult(null);
    try {
      const res = await fetch("/next-api/insights/destinations/aggregate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      setAggResult(json);
      fetchList();
    } finally {
      setAggLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Popular Destinations</h1>
          <p className={styles.subtitle}>Aggregated GPS-derived destination analytics — anonymized data only</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.aggBtn}
            onClick={triggerAggregation}
            disabled={aggLoading}
          >
            <RefreshCw size={16} strokeWidth={1.75} />
            {aggLoading ? "Processing…" : "Run Aggregation"}
          </button>
        </div>
      </div>

      {aggResult && (
        <div className={styles.aggResult}>
          Aggregation complete: <strong>{aggResult.processed}</strong> processed, <strong>{aggResult.skipped}</strong> skipped, <strong>{aggResult.errors}</strong> errors.
        </div>
      )}

      {/* ── Stats cards ── */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <MapPin size={18} strokeWidth={1.75} className={styles.statIcon} style={{ color: "#3b82f6" }} />
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Destinations</div>
          </div>
          <div className={styles.statCard}>
            <Globe size={18} strokeWidth={1.75} className={styles.statIcon} style={{ color: "#22c55e" }} />
            <div className={styles.statValue}>{stats.published}</div>
            <div className={styles.statLabel}>Published</div>
          </div>
          <div className={styles.statCard}>
            <Star size={18} strokeWidth={1.75} className={styles.statIcon} style={{ color: "#f59e0b" }} />
            <div className={styles.statValue}>{stats.featured}</div>
            <div className={styles.statLabel}>Featured</div>
          </div>
          <div className={styles.statCard}>
            <MapPin size={18} strokeWidth={1.75} className={styles.statIcon} style={{ color: "#8b5cf6" }} />
            <div className={styles.statValue}>{(stats.totalVisits ?? 0).toLocaleString("fr-FR")}</div>
            <div className={styles.statLabel}>Total Visits</div>
          </div>
          <div className={styles.statCard}>
            <EyeOff size={18} strokeWidth={1.75} className={styles.statIcon} style={{ color: "#ef4444" }} />
            <div className={styles.statValue}>{stats.ignored}</div>
            <div className={styles.statLabel}>Ignored</div>
          </div>
        </div>
      )}

      {/* ── View toggle ── */}
      <div className={styles.viewToggle}>
        <button className={`${styles.viewBtn} ${view === "list" ? styles.viewBtnActive : ""}`} onClick={() => setView("list")}>
          <List size={16} strokeWidth={1.75} /> List
        </button>
        <button className={`${styles.viewBtn} ${view === "map" ? styles.viewBtnActive : ""}`} onClick={() => setView("map")}>
          <Map size={16} strokeWidth={1.75} /> Map
        </button>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={16} strokeWidth={1.75} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search name, city, region…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className={styles.filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="featured">Featured</option>
          <option value="ignored">Ignored</option>
        </select>

        <select className={styles.filterSelect} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <input
          type="number"
          className={styles.filterSelect}
          placeholder="Min confidence"
          value={minConf}
          onChange={e => setMinConf(e.target.value)}
          min={0} max={100}
          style={{ width: 130 }}
        />

        <input
          type="date"
          className={styles.filterSelect}
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="Last detected from"
        />
        <input
          type="date"
          className={styles.filterSelect}
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="Last detected to"
        />
      </div>

      {/* ── Map view ── */}
      {view === "map" && (
        <div className={styles.mapSection}>
          <DestinationsMapLoader category={category} minConfidence={minConf ? parseInt(minConf) : undefined} />
        </div>
      )}

      {/* ── List view ── */}
      {view === "list" && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Name / City</th>
                  <th className={styles.th}>
                    <button className={styles.sortBtn} onClick={() => handleSort("visitCount")}>
                      Visits {sortIcon("visitCount")}
                    </button>
                  </th>
                  <th className={styles.th}>
                    <button className={styles.sortBtn} onClick={() => handleSort("uniqueRentalCount")}>
                      Rentals {sortIcon("uniqueRentalCount")}
                    </button>
                  </th>
                  <th className={styles.th}>
                    <button className={styles.sortBtn} onClick={() => handleSort("confidenceScore")}>
                      Confidence {sortIcon("confidenceScore")}
                    </button>
                  </th>
                  <th className={styles.th}>
                    <button className={styles.sortBtn} onClick={() => handleSort("avgDwellMinutes")}>
                      Avg Dwell {sortIcon("avgDwellMinutes")}
                    </button>
                  </th>
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>
                    <button className={styles.sortBtn} onClick={() => handleSort("lastDetectedAt")}>
                      Last Detected {sortIcon("lastDetectedAt")}
                    </button>
                  </th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className={styles.loadingCell}>Loading…</td></tr>
                )}
                {!loading && data.length === 0 && (
                  <tr><td colSpan={9} className={styles.emptyCell}>No destinations found</td></tr>
                )}
                {!loading && data.map(d => (
                  <tr key={d.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.nameCell}>
                        <span className={styles.destName}>{d.name ?? <em className={styles.noName}>Unnamed</em>}</span>
                        <span className={styles.destCity}>{[d.city, d.region].filter(Boolean).join(", ") || d.country}</span>
                      </div>
                    </td>
                    <td className={styles.td}>{(d.visitCount ?? 0).toLocaleString("fr-FR")}</td>
                    <td className={styles.td}>{d.uniqueRentalCount}</td>
                    <td className={styles.td}>
                      <span className={styles.badge} style={{ color: confidenceColor(+d.confidenceScore), background: confidenceColor(+d.confidenceScore) + "18" }}>
                        {Math.round(+d.confidenceScore)}
                      </span>
                    </td>
                    <td className={styles.td}>{fmtDwell(d.avgDwellMinutes)}</td>
                    <td className={styles.td}>
                      {d.category ? (
                        <span className={styles.categoryBadge}>
                          {(() => { const Icon = CATEGORY_ICONS[d.category] ?? MapPin; return <Icon size={13} strokeWidth={1.75} />; })()}
                          {CATEGORY_LABELS[d.category as DestinationCategory] ?? d.category}
                        </span>
                      ) : <span className={styles.noName}>—</span>}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.statusDot} style={{ background: STATUS_COLORS[d.status] }} />
                      {STATUS_LABELS[d.status]}
                    </td>
                    <td className={styles.td}>{fmtDate(d.lastDetectedAt)}</td>
                    <td className={styles.td}>
                      <Link href={`/admin/insights/destinations/${d.id}`} className={styles.viewLink}>
                        <ExternalLink size={18} strokeWidth={1.75} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>
              <span className={styles.pageInfo}>{page} / {totalPages} &nbsp;·&nbsp; {total} destinations</span>
              <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// ── Lazy map loader ────────────────────────────────────────────────────────────

function DestinationsMapLoader({ category, minConfidence }: { category?: string; minConfidence?: number }) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ category?: string; minConfidence?: number }> | null>(null);

  useEffect(() => {
    import("./DestinationsMap").then(m => setMapComponent(() => m.default));
  }, []);

  if (!MapComponent) return <div className={styles.mapPlaceholder}>Loading map…</div>;
  return <MapComponent category={category} minConfidence={minConfidence} />;
}
