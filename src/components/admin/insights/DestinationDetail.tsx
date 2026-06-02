"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./DestinationDetail.module.css";
import { ArrowLeft } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type DestinationStatus   = "active" | "ignored" | "featured";
type DestinationCategory = "tourism" | "shopping" | "dining" | "beach" | "nature" | "airport" | "transport" | "healthcare" | "accommodation" | "services" | "other";

interface DestinationDetail {
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
  adminNotes:        string | null;
  osmPlace:          string | null;
  monthlyTrend:      { month: string; visits: number }[];
  peakDays:          { weekday: number; visits: number }[];
  vehicles:          { carId: string; visits: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: DestinationCategory[] = [
  "tourism", "shopping", "dining", "beach", "nature",
  "airport", "transport", "healthcare", "accommodation", "services", "other",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtDwell(mins: number | null): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function confidenceColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────

function BarChart({ data, labelKey, valueKey, color = "#3b82f6" }: {
  data:     Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
  color?:   string;
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey])), 1);
  return (
    <div className={styles.barChart}>
      {data.map((d, i) => (
        <div key={i} className={styles.barItem}>
          <div className={styles.barWrap}>
            <div
              className={styles.bar}
              style={{ height: `${Math.round((Number(d[valueKey]) / max) * 100)}%`, background: color }}
            />
          </div>
          <span className={styles.barLabel}>{String(d[labelKey])}</span>
          <span className={styles.barValue}>{Number(d[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DestinationDetail({ id }: { id: string }) {
  const [dest,    setDest]    = useState<DestinationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Editable fields
  const [editName,       setEditName]       = useState("");
  const [editStatus,     setEditStatus]     = useState<DestinationStatus>("active");
  const [editCategory,   setEditCategory]   = useState<string>("");
  const [editTags,       setEditTags]       = useState("");
  const [editNotes,      setEditNotes]      = useState("");
  const [editConfidence, setEditConfidence] = useState<string>("");

  useEffect(() => {
    fetch(`/next-api/insights/destinations/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: DestinationDetail) => {
        setDest(d);
        setEditName(d.name ?? "");
        setEditStatus(d.status);
        setEditCategory(d.category ?? "");
        setEditTags((d.tags ?? []).join(", "));
        setEditNotes(d.adminNotes ?? "");
        setEditConfidence(String(Math.round(+d.confidenceScore)));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const body: Record<string, unknown> = {
        name:            editName   || null,
        status:          editStatus,
        category:        editCategory || null,
        tags:            editTags ? editTags.split(",").map(t => t.trim()).filter(Boolean) : null,
        adminNotes:      editNotes || null,
        confidenceScore: editConfidence ? Number(editConfidence) : undefined,
      };
      const res = await fetch(`/next-api/insights/destinations/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setDest(prev => prev ? { ...prev, ...updated } : prev);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error)   return <div className={styles.error}>Failed to load: {error}</div>;
  if (!dest)   return null;

  const peakDaysData = WEEKDAY_LABELS.map((label, i) => {
    const found = dest.peakDays.find(p => p.weekday === i);
    return { label, visits: found?.visits ?? 0 };
  });

  const totalWeekendWeekday = dest.weekdayVisits + dest.weekendVisits;

  return (
    <div className={styles.page}>

      {/* ── Back + title ── */}
      <div className={styles.backRow}>
        <Link href="/admin/insights/destinations" className={styles.backLink}>
          <ArrowLeft size={16} strokeWidth={1.75} /> Destinations
        </Link>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{dest.name ?? <em>Unnamed destination</em>}</h1>
          <p className={styles.subtitle}>
            {[dest.city, dest.region, dest.country].filter(Boolean).join(", ")}
            &nbsp;·&nbsp;{dest.lat.toFixed(5)}, {dest.lng.toFixed(5)}
          </p>
        </div>
        <div className={styles.headerBadges}>
          {dest.isPublished && <span className={styles.publishedBadge}>Published</span>}
          <span className={`${styles.statusBadge} ${styles[`status_${dest.status}`]}`}>{dest.status}</span>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{(dest.visitCount ?? 0).toLocaleString("fr-FR")}</span>
          <span className={styles.kpiLabel}>Total visits</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{dest.uniqueRentalCount}</span>
          <span className={styles.kpiLabel}>Unique rentals</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{dest.vehicleCount}</span>
          <span className={styles.kpiLabel}>Vehicles</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue} style={{ color: confidenceColor(+dest.confidenceScore) }}>
            {Math.round(+dest.confidenceScore)}
          </span>
          <span className={styles.kpiLabel}>Confidence score</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{fmtDwell(dest.avgDwellMinutes)}</span>
          <span className={styles.kpiLabel}>Avg dwell time</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{fmtDate(dest.firstDetectedAt)}</span>
          <span className={styles.kpiLabel}>First detected</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>{fmtDate(dest.lastDetectedAt)}</span>
          <span className={styles.kpiLabel}>Last detected</span>
        </div>
      </div>

      <div className={styles.grid}>

        {/* ── Monthly trend ── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Monthly Visits (12 months)</h2>
          {dest.monthlyTrend.length === 0
            ? <p className={styles.noData}>No visit data</p>
            : <BarChart
                data={dest.monthlyTrend.map(m => ({ label: m.month.slice(5), visits: m.visits }))}
                labelKey="label"
                valueKey="visits"
                color="#3b82f6"
              />
          }
        </div>

        {/* ── Peak days ── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Peak Days</h2>
          <BarChart data={peakDaysData} labelKey="label" valueKey="visits" color="#8b5cf6" />
          {totalWeekendWeekday > 0 && (
            <div className={styles.weekSplit}>
              <span>Weekday: <strong>{Math.round(dest.weekdayVisits / totalWeekendWeekday * 100)}%</strong></span>
              <span>Weekend: <strong>{Math.round(dest.weekendVisits / totalWeekendWeekday * 100)}%</strong></span>
            </div>
          )}
        </div>

        {/* ── Vehicles ── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Top Vehicles</h2>
          {dest.vehicles.length === 0
            ? <p className={styles.noData}>No vehicle data</p>
            : (
              <div className={styles.vehicleList}>
                {dest.vehicles.slice(0, 10).map((v, i) => (
                  <div key={v.carId} className={styles.vehicleRow}>
                    <span className={styles.vehicleRank}>#{i + 1}</span>
                    <Link href={`/admin/fleet/${v.carId}`} className={styles.vehicleLink}>
                      {v.carId.slice(0, 8)}…
                    </Link>
                    <span className={styles.vehicleVisits}>{v.visits} visit{v.visits !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* ── Admin operations panel ── */}
        <div className={`${styles.card} ${styles.cardFull}`}>
          <h2 className={styles.cardTitle}>Admin Operations</h2>

          <div className={styles.adminGrid}>
            <label className={styles.fieldLabel}>
              Name
              <input
                className={styles.fieldInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Leave blank to auto-detect"
              />
            </label>

            <label className={styles.fieldLabel}>
              Status
              <select className={styles.fieldInput} value={editStatus} onChange={e => setEditStatus(e.target.value as DestinationStatus)}>
                <option value="active">Active</option>
                <option value="featured">Featured</option>
                <option value="ignored">Ignored</option>
              </select>
            </label>

            <label className={styles.fieldLabel}>
              Category
              <select className={styles.fieldInput} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                <option value="">— None —</option>
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className={styles.fieldLabel}>
              Confidence override (0–100)
              <input
                className={styles.fieldInput}
                type="number"
                value={editConfidence}
                onChange={e => setEditConfidence(e.target.value)}
                min={0} max={100}
              />
            </label>

            <label className={styles.fieldLabel} style={{ gridColumn: "1 / -1" }}>
              Tags (comma-separated)
              <input
                className={styles.fieldInput}
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="beach, family, popular…"
              />
            </label>

            <label className={styles.fieldLabel} style={{ gridColumn: "1 / -1" }}>
              Admin notes
              <textarea
                className={`${styles.fieldInput} ${styles.textarea}`}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes visible only to admins"
              />
            </label>
          </div>

          <div className={styles.adminFooter}>
            {saved && <span className={styles.savedMsg}>Saved successfully</span>}
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
