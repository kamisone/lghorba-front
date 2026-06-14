"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./user.module.css";
import { Star } from "lucide-react";

interface RentSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  car?: { id: string; name: string; immatriculation: string };
  booking?: { id: string; startDateTime: string; endDateTime: string } | null;
}

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rentCount?: number;
  score?: number;
  turoJoinDate?: string;
  getaroundJoinDate?: string;
  platformProfileUrl?: string;
  createdAt: string;
  rentSessions?: RentSession[];
}

interface EditForm {
  name: string;
  phone: string;
  email: string;
  score: string;
  turoJoinDate: string;
  getaroundJoinDate: string;
  platformProfileUrl: string;
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function ScorePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.scorePicker}>
      {SCORE_OPTIONS.map(n => {
        const active = value === String(n);
        const cls = n >= 8 ? styles.scoreHigh : n >= 5 ? styles.scoreMid : styles.scoreLow;
        return (
          <button
            key={n}
            type="button"
            className={`${styles.scoreBtn} ${cls} ${active ? styles.scoreBtnActive : ""}`}
            onClick={() => onChange(active ? "" : String(n))}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({ name: "", phone: "", email: "", score: "", turoJoinDate: "", getaroundJoinDate: "", platformProfileUrl: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fillForm = (u: User) => setForm({
    name: u.name ?? "",
    phone: u.phone ?? "",
    email: u.email ?? "",
    score: u.score != null ? String(u.score) : "",
    turoJoinDate: u.turoJoinDate ? u.turoJoinDate.slice(0, 10) : "",
    getaroundJoinDate: u.getaroundJoinDate ? u.getaroundJoinDate.slice(0, 10) : "",
    platformProfileUrl: u.platformProfileUrl ?? "",
  });

  useEffect(() => {
    fetch(`/next-api/users/${id}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setUser(data); fillForm(data); } })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/next-api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          score: form.score !== "" ? Number(form.score) : null,
          turoJoinDate: form.turoJoinDate || null,
          getaroundJoinDate: form.getaroundJoinDate || null,
          platformProfileUrl: form.platformProfileUrl.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        fillForm(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/next-api/users/${id}`, { method: "DELETE" });
      if (res.ok) router.replace("/admin/users");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className={styles.page}><div className={styles.loadingRow}><span className={styles.spinner} /></div></div>
  );

  if (!user) return (
    <div className={styles.page}>
      <p className={styles.errorMsg}>User not found.</p>
      <Link href="/admin/users" className={styles.backLink}>← Back to users</Link>
    </div>
  );

  const scoreNum = user.score ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/admin/users" className={styles.backLink}>← Users</Link>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.avatar}>{user.name?.[0]?.toUpperCase() ?? "?"}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.userName}>{user.name}</h1>
            <div className={styles.headerBadges}>
              {!!user.rentCount && user.rentCount > 0 && (
                <span className={styles.rentBadge}>{user.rentCount} rent{user.rentCount > 1 ? "s" : ""}</span>
              )}
              {scoreNum != null && (
                <span className={`${styles.scoreBadge} ${scoreNum >= 8 ? styles.scoreHigh : scoreNum >= 5 ? styles.scoreMid : styles.scoreLow}`}>
                  <Star size={14} strokeWidth={1.75} /> {scoreNum}/10
                </span>
              )}
            </div>
          </div>
          <button className={styles.editBtn} onClick={() => { setEditing(e => !e); setConfirmDelete(false); }}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className={styles.editForm}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.label}>Name</label>
                <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Phone</label>
                <input className={styles.input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Score (1–10)</label>
              <ScorePicker value={form.score} onChange={v => setForm(f => ({ ...f, score: v }))} />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.label}>Turo join date</label>
                <input className={styles.input} type="date" value={form.turoJoinDate} onChange={e => setForm(f => ({ ...f, turoJoinDate: e.target.value }))} />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Getaround join date</label>
                <input className={styles.input} type="date" value={form.getaroundJoinDate} onChange={e => setForm(f => ({ ...f, getaroundJoinDate: e.target.value }))} />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Platform profile URL</label>
              <input
                className={styles.input}
                type="url"
                placeholder="https://turo.com/…/drivers/… or https://getaround.com/…"
                value={form.platformProfileUrl}
                onChange={e => setForm(f => ({ ...f, platformProfileUrl: e.target.value }))}
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={confirmDelete ? styles.confirmDeleteBtn : styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete user"}
              </button>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className={styles.infoGrid}>
            <dt>Phone</dt><dd>{user.phone || <span className={styles.na}>—</span>}</dd>
            <dt>Email</dt><dd>{user.email || <span className={styles.na}>—</span>}</dd>
            <dt>Score</dt>
            <dd>
              {scoreNum != null
                ? <span className={`${styles.scoreBadge} ${scoreNum >= 8 ? styles.scoreHigh : scoreNum >= 5 ? styles.scoreMid : styles.scoreLow}`}><Star size={14} strokeWidth={1.75} /> {scoreNum}/10</span>
                : <span className={styles.na}>Not rated</span>
              }
            </dd>
            <dt>Turo</dt>
            <dd>
              {user.turoJoinDate ? new Date(user.turoJoinDate).toLocaleDateString() : <span className={styles.na}>—</span>}
            </dd>
            <dt>Profile</dt>
            <dd>
              {user.platformProfileUrl
                ? <a href={user.platformProfileUrl} target="_blank" rel="noopener noreferrer" className={styles.profileLink}>View profile ↗</a>
                : <span className={styles.na}>—</span>
              }
            </dd>
            <dt>Getaround</dt>
            <dd>{user.getaroundJoinDate ? new Date(user.getaroundJoinDate).toLocaleDateString() : <span className={styles.na}>—</span>}</dd>
            <dt>Joined</dt><dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </dl>
        )}
      </div>

      {user.rentSessions && user.rentSessions.length > 0 && (
        <div className={styles.sessionsSection}>
          <h2 className={styles.sectionTitle}>Rent history</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Car</th><th>Started</th><th>Ended</th><th>Status</th><th>Booking</th></tr>
              </thead>
              <tbody>
                {user.rentSessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      {s.car
                        ? <Link href={`/admin/fleet/${s.car.id}`} className={styles.carLink}>{s.car.name} <span className={styles.immat}>{s.car.immatriculation}</span></Link>
                        : <span className={styles.na}>—</span>
                      }
                    </td>
                    <td className={styles.dateCell}>{new Date(s.startedAt).toLocaleString()}</td>
                    <td className={styles.dateCell}>{s.endedAt ? new Date(s.endedAt).toLocaleString() : <span className={styles.na}>ongoing</span>}</td>
                    <td><span className={`${styles.statusBadge} ${styles[`status_${s.status}`]}`}>{s.status}</span></td>
                    <td>
                      {s.booking
                        ? <Link href={`/admin/bookings?modal=booking&id=${s.booking.id}`} className={styles.carLink}>View booking ↗</Link>
                        : <span className={styles.na}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
