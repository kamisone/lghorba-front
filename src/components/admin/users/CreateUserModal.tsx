"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./CreateUserModal.module.css";
import { X, Check, Search } from "lucide-react";

interface UnlinkedSession {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  status: string;
  car?: { id: string; name: string; immatriculation: string } | null;
}

interface CreateForm {
  name: string;
  phone: string;
  email: string;
  score: string;
  turoJoinDate: string;
  getaroundJoinDate: string;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CreateUserModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateForm>({
    name: "", phone: "", email: "", score: "", turoJoinDate: "", getaroundJoinDate: "",
  });
  const [sessions, setSessions] = useState<UnlinkedSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    fetch("/next-api/rent-sessions?unlinked=true", { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .finally(() => setSessionsLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(s =>
      s.car?.name.toLowerCase().includes(q) ||
      s.car?.immatriculation.toLowerCase().includes(q) ||
      fmtDate(s.startedAt).toLowerCase().includes(q)
    );
  }, [sessions, sessionSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) { setSessionError(true); return; }
    setSessionError(false);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/next-api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          score: form.score !== "" ? Number(form.score) : null,
          turoJoinDate: form.turoJoinDate || null,
          getaroundJoinDate: form.getaroundJoinDate || null,
          rentSessionId: selectedSessionId,
        }),
      });
      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.message ?? "Failed to create user.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add user</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── User info ── */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>User info</p>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Name <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  placeholder="e.g. Yassine Alami"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Phone <span className={styles.required}>*</span></label>
                <input
                  className={styles.input}
                  placeholder="e.g. +212 6xx"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email <span className={styles.optional}>optional</span></label>
              <input
                className={styles.input}
                type="email"
                placeholder="e.g. user@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Score (1–10) <span className={styles.optional}>optional</span></label>
              <div className={styles.scorePicker}>
                {SCORE_OPTIONS.map(n => {
                  const active = form.score === String(n);
                  const cls = n >= 8 ? styles.scoreHigh : n >= 5 ? styles.scoreMid : styles.scoreLow;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.scoreBtn} ${cls} ${active ? styles.scoreBtnActive : ""}`}
                      onClick={() => setForm(f => ({ ...f, score: active ? "" : String(n) }))}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Turo join date <span className={styles.optional}>optional</span></label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.turoJoinDate}
                  onChange={e => setForm(f => ({ ...f, turoJoinDate: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Getaround join date <span className={styles.optional}>optional</span></label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.getaroundJoinDate}
                  onChange={e => setForm(f => ({ ...f, getaroundJoinDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* ── Rent session (required) ── */}
          <div className={`${styles.section} ${sessionError ? styles.sectionError : ""}`}>
            <div className={styles.sectionHeaderRow}>
              <p className={styles.sectionLabel}>
                Rent session <span className={styles.required}>*</span>
              </p>
              {sessionError && <span className={styles.fieldError}>Please select a session</span>}
            </div>

            {sessionsLoading ? (
              <div className={styles.sessionLoadingRow}><span className={styles.spinner} /></div>
            ) : sessions.length === 0 ? (
              <p className={styles.noSessions}>No unlinked sessions available.</p>
            ) : (
              <>
                <div className={styles.sessionSearchWrap}>
                  <Search size={16} strokeWidth={1.75} className={styles.sessionSearchIcon} />
                  <input
                    type="text"
                    className={styles.sessionSearchInput}
                    placeholder="Filter by car name…"
                    value={sessionSearch}
                    onChange={e => setSessionSearch(e.target.value)}
                  />
                </div>
                <div className={styles.sessionList}>
                  {filteredSessions.length === 0 ? (
                    <p className={styles.noSessions}>No sessions match.</p>
                  ) : filteredSessions.map(s => {
                    const selected = selectedSessionId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`${styles.sessionOption} ${selected ? styles.sessionOptionSelected : ""}`}
                        onClick={() => { setSelectedSessionId(s.id); setSessionError(false); }}
                      >
                        <div className={styles.sessionOptionMain}>
                          <span className={styles.sessionCar}>
                            {s.car ? `${s.car.name} · ${s.car.immatriculation}` : "Unknown car"}
                          </span>
                          <span className={`${styles.statusBadge} ${styles[`status_${s.status}`]}`}>{s.status}</span>
                        </div>
                        <div className={styles.sessionOptionDates}>
                          {fmtDate(s.startedAt)}
                          {s.endedAt ? ` → ${fmtDate(s.endedAt)}` : " → ongoing"}
                        </div>
                        {selected && <span className={styles.sessionCheck}><Check size={14} strokeWidth={2} /></span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
