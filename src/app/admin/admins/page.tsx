"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./admins.module.css";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: "", email: "", password: "", role: "admin" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchAdmins = () => {
    setLoading(true);
    fetch("/next-api/admins", { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAdmins(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/next-api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ name: "", email: "", password: "", role: "admin" });
        fetchAdmins();
      } else {
        const data = await res.json();
        setError(data.message ?? "Failed to create admin.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Admins</h1>
        <button className={styles.addBtn} onClick={() => { setShowCreate(true); setError(""); }}>
          + Add Admin
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingRow}><span className={styles.spinner} /></div>
      ) : admins.length === 0 ? (
        <p className={styles.empty}>No admins found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id}>
                  <td className={styles.nameCell}>{a.name}</td>
                  <td>{a.email}</td>
                  <td><span className={`${styles.roleBadge} ${styles[`role_${a.role}`]}`}>{a.role}</span></td>
                  <td className={styles.dateCell}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td><Link href={`/admin/admins/${a.id}`} className={styles.viewBtn}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className={styles.overlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New admin</h2>
              <button className={styles.closeBtn} onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.label}>Name</label>
                  <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Ahmed" />
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
                <input className={styles.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="admin@example.com" />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Password</label>
                <input className={styles.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} placeholder="Min. 8 characters" />
              </div>
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={creating}>
                  {creating ? "Creating…" : "Create admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
