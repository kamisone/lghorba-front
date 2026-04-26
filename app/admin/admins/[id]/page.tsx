"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./admin-detail.module.css";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "admin" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/next-api/admins/${id}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setAdmin(data);
          setForm({ name: data.name, email: data.email, role: data.role });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/next-api/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), role: form.role }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAdmin(updated);
        setForm({ name: updated.name, email: updated.email, role: updated.role });
        setEditing(false);
      } else {
        const data = await res.json();
        setError(data.message ?? "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSaving(true);
    setError("");
    try {
      const res = await fetch(`/next-api/admins/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setNewPassword("");
        setResetDone(true);
        setTimeout(() => setResetDone(false), 3000);
      } else {
        const data = await res.json();
        setError(data.message ?? "Failed to reset password.");
      }
    } finally {
      setResetSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/next-api/admins/${id}`, { method: "DELETE" });
      if (res.ok) router.replace("/admin/admins");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className={styles.page}><div className={styles.loadingRow}><span className={styles.spinner} /></div></div>
  );

  if (!admin) return (
    <div className={styles.page}>
      <p className={styles.errorMsg}>Admin not found.</p>
      <Link href="/admin/admins" className={styles.backLink}>← Back to admins</Link>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/admin/admins" className={styles.backLink}>← Admins</Link>
      </div>

      {/* ── Profile card ── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.avatar}>{admin.name?.[0]?.toUpperCase() ?? "?"}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.adminName}>{admin.name}</h1>
            <span className={`${styles.roleBadge} ${styles[`role_${admin.role}`]}`}>{admin.role}</span>
          </div>
          <button className={styles.editBtn} onClick={() => { setEditing(e => !e); setError(""); setConfirmDelete(false); }}>
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
                <label className={styles.label}>Role</label>
                <select className={styles.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.formActions}>
              <button
                type="button"
                className={confirmDelete ? styles.confirmDeleteBtn : styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete admin"}
              </button>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className={styles.infoGrid}>
            <dt>Email</dt><dd>{admin.email}</dd>
            <dt>Role</dt><dd><span className={`${styles.roleBadge} ${styles[`role_${admin.role}`]}`}>{admin.role}</span></dd>
            <dt>Created</dt><dd>{new Date(admin.createdAt).toLocaleDateString()}</dd>
          </dl>
        )}
      </div>

      {/* ── Reset password ── */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Reset password</h2>
        <form onSubmit={handleResetPassword} className={styles.resetForm}>
          <div className={styles.formField}>
            <label className={styles.label}>New password</label>
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
              style={{ maxWidth: 300 }}
            />
          </div>
          {resetDone && <p className={styles.successMsg}>Password updated successfully.</p>}
          <button type="submit" className={styles.saveBtn} disabled={resetSaving || newPassword.length < 8}>
            {resetSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
