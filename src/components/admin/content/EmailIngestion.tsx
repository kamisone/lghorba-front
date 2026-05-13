"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./EmailIngestion.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type IngestionStatus = "pending" | "parsed" | "matched" | "booked" | "skipped" | "failed";
type Provider = "turo" | "getaround";

interface ExtractedBooking {
  provider: Provider;
  reservationNumber: string;
  guestName: string;
  vehicleName: string;
  startDateTime: string;
  endDateTime: string;
  totalEarning: number | null;
  pickupLocation: string | null;
  guestPhone: string | null;
  includedMileageKm: number | null;
  detectedLanguage: "fr" | "en";
}

interface IngestedEmail {
  id: string;
  messageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: string | null;
  provider: Provider | null;
  status: IngestionStatus;
  errorMessage: string | null;
  reservationNumber: string | null;
  bookingId: string | null;
  extractedBooking: ExtractedBooking | null;
  createdAt: string;
}

type Stats = Partial<Record<IngestionStatus, number>>;

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<IngestionStatus, string> = {
  pending:  "Pending",
  parsed:   "Parsed",
  matched:  "Matched",
  booked:   "Booked",
  skipped:  "Skipped",
  failed:   "Failed",
};

const STATUS_COLOR: Record<IngestionStatus, string> = {
  booked:   "#22c55e",
  failed:   "#ef4444",
  pending:  "#f59e0b",
  parsed:   "#f59e0b",
  matched:  "#f59e0b",
  skipped:  "#94a3b8",
};

const PROVIDER_COLOR: Record<Provider, string> = {
  turo:       "#3b82f6",
  getaround:  "#f97316",
};

const FILTER_OPTIONS: Array<{ value: IngestionStatus | ""; label: string }> = [
  { value: "",         label: "All" },
  { value: "failed",   label: "Failed" },
  { value: "pending",  label: "Pending" },
  { value: "booked",   label: "Booked" },
  { value: "skipped",  label: "Skipped" },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

function fmtDateTime(s: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

function fmtEur(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailIngestion() {
  const [emails,      setEmails]      = useState<IngestedEmail[]>([]);
  const [stats,       setStats]       = useState<Stats>({});
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<IngestionStatus | "">("");
  const [selected,    setSelected]    = useState<string | null>(null);
  const [detail,      setDetail]      = useState<IngestedEmail | null>(null);
  const [polling,     setPolling]     = useState(false);
  const [replaying,   setReplaying]   = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = async (status?: IngestionStatus | "") => {
    try {
      const qs = status ? `?status=${status}` : "";
      const [emailsRes, statsRes] = await Promise.all([
        fetch(`/next-api/admin/email-ingestion${qs}`),
        fetch("/next-api/admin/email-ingestion/stats"),
      ]);
      if (emailsRes.ok) setEmails(await emailsRes.json());
      if (statsRes.ok)  setStats(await statsRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filter || undefined);
    intervalRef.current = setInterval(() => loadData(filter || undefined), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Load full detail when a row is selected
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    fetch(`/next-api/admin/email-ingestion/${selected}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDetail(d));
  }, [selected]);

  const handlePoll = async () => {
    setPolling(true);
    try {
      await fetch("/next-api/admin/email-ingestion", { method: "POST" });
      await loadData(filter || undefined);
    } finally {
      setTimeout(() => setPolling(false), 3_000);
    }
  };

  const handleReplay = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplaying(id);
    try {
      await fetch(`/next-api/admin/email-ingestion/${id}/replay`, { method: "POST" });
      await loadData(filter || undefined);
      setSelected(null);
    } finally {
      setReplaying(null);
    }
  };

  const toggleRow = (id: string) => setSelected(prev => prev === id ? null : id);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const total = Object.values(stats).reduce((s, v) => s + (v ?? 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Email Import</h1>
        <div className={styles.headerActions}>
          <span className={styles.refreshNote}>Auto-refresh every 30s</span>
          <button
            className={styles.pollBtn}
            onClick={handlePoll}
            disabled={polling}
          >
            {polling
              ? <><span className={styles.loadingSpinner} /> Polling…</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>inbox</span> Poll now</>
            }
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        <StatCard label="Total"   value={total}              color="#64748b" />
        <StatCard label="Booked"  value={stats.booked  ?? 0} color="#22c55e" />
        <StatCard label="Failed"  value={stats.failed  ?? 0} color="#ef4444" />
        <StatCard label="Pending" value={(stats.pending ?? 0) + (stats.parsed ?? 0) + (stats.matched ?? 0)} color="#f59e0b" />
        <StatCard label="Skipped" value={stats.skipped ?? 0} color="#94a3b8" />
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`${styles.filterBtn} ${filter === opt.value ? styles.filterBtnActive : ""}`}
            onClick={() => { setFilter(opt.value); setSelected(null); }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Received</th>
              <th>From</th>
              <th>Subject</th>
              <th>Provider</th>
              <th>Reservation #</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className={styles.emptyRow}>
                <td colSpan={6}><span className={styles.loadingSpinner} /> Loading…</td>
              </tr>
            )}
            {!loading && emails.length === 0 && (
              <tr className={styles.emptyRow}>
                <td colSpan={6}>No emails found</td>
              </tr>
            )}
            {!loading && emails.map(email => (
              <>
                <tr
                  key={email.id}
                  className={`${styles.rowClickable} ${selected === email.id ? styles.rowSelected : ""}`}
                  onClick={() => toggleRow(email.id)}
                >
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(email.receivedAt ?? email.createdAt)}</td>
                  <td style={{ fontSize: 12, color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email.fromAddress}
                  </td>
                  <td className={styles.subjectCell}>{email.subject}</td>
                  <td>
                    {email.provider ? (
                      <ProviderBadge provider={email.provider} />
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {email.reservationNumber ?? "—"}
                  </td>
                  <td><StatusBadge status={email.status} /></td>
                </tr>

                {/* ── Expanded detail ── */}
                {selected === email.id && (
                  <tr key={`${email.id}-detail`} className={styles.expandedRow}>
                    <td colSpan={6}>
                      <ExpandedDetail
                        email={detail ?? email}
                        onReplay={handleReplay}
                        replaying={replaying === email.id}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.statCard} style={{ borderTopColor: color }}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: IngestionStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className={styles.badge}
      style={{ background: `${color}20`, color }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: Provider }) {
  const color = PROVIDER_COLOR[provider];
  return (
    <span
      className={styles.badge}
      style={{ background: `${color}18`, color, textTransform: "capitalize" }}
    >
      {provider}
    </span>
  );
}

function ExpandedDetail({
  email,
  onReplay,
  replaying,
}: {
  email: IngestedEmail;
  onReplay: (id: string, e: React.MouseEvent) => void;
  replaying: boolean;
}) {
  const ex = email.extractedBooking;
  const canReplay = email.status === "failed" || email.status === "skipped";

  return (
    <div className={styles.expandedPanel}>

      {/* Error message */}
      {email.errorMessage && (
        <div className={styles.errorBox}>
          ⚠ {email.errorMessage}
        </div>
      )}

      {/* Extracted booking fields */}
      {ex && (
        <div className={styles.expandedGrid}>
          <Field label="Guest"        value={ex.guestName} />
          <Field label="Vehicle"      value={ex.vehicleName} />
          <Field label="Reservation"  value={ex.reservationNumber} />
          <Field label="Language"     value={ex.detectedLanguage.toUpperCase()} />
          <Field label="Start"        value={fmtDateTime(ex.startDateTime)} />
          <Field label="End"          value={fmtDateTime(ex.endDateTime)} />
          <Field label="Earning"      value={fmtEur(ex.totalEarning)} />
          <Field label="Pickup"       value={ex.pickupLocation ?? "—"} />
          <Field label="Phone"        value={ex.guestPhone ?? "—"} />
          <Field label="Mileage"      value={ex.includedMileageKm != null ? `${ex.includedMileageKm} km` : "—"} />
        </div>
      )}

      {!ex && email.status !== "skipped" && (
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>No extraction data available.</p>
      )}
      {email.status === "skipped" && !ex && (
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Email was not recognised as a booking confirmation.</p>
      )}

      {/* Actions */}
      <div className={styles.expandedActions}>
        {email.bookingId && (
          <Link href={`/admin/bookings?modal=booking&id=${email.bookingId}`} className={styles.bookingLink}>
            → View booking
          </Link>
        )}
        {canReplay && (
          <button
            className={styles.replayBtn}
            onClick={e => onReplay(email.id, e)}
            disabled={replaying}
          >
            {replaying ? "Replaying…" : "↺ Replay"}
          </button>
        )}
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
          ID: {email.id}
        </span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.expandedField}>
      <label>{label}</label>
      <span>{value}</span>
    </div>
  );
}
