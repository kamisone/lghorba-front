"use client";

import { useEffect, useState } from "react";

interface Supplier { id: string; name: string; specialty: string | null; phone: string | null; email: string | null; address: string | null; }

const EMPTY = { name: "", specialty: "", phone: "", email: "", address: "" };

function fmtDate(_: string) { return ""; }

export default function MaintenanceSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<string | null>(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    try { const r = await fetch("/next-api/maintenance/suppliers"); if (r.ok) setSuppliers(await r.json()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm(EMPTY); setEditing("new"); };
  const startEdit   = (s: Supplier) => { setForm({ name: s.name, specialty: s.specialty ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" }); setEditing(s.id); };

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editing === "new";
      const url   = isNew ? "/next-api/maintenance/suppliers" : `/next-api/maintenance/suppliers/${editing}`;
      const res   = await fetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { setEditing(null); await load(); }
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`/next-api/maintenance/suppliers/${id}`, { method: "DELETE" });
    await load();
  };

  const S: React.CSSProperties = { padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Maintenance Suppliers</h1>
        <button onClick={startCreate} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer" }}>+ Add Supplier</button>
      </div>

      {editing && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>{editing === "new" ? "New Supplier" : "Edit Supplier"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["name","Name *"],["specialty","Specialty"],["phone","Phone"],["email","Email"],["address","Address"]] .map(([key, label]) => (
              <div key={key} style={{ gridColumn: key === "address" ? "1 / -1" : undefined }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                <input style={S} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => setEditing(null)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : suppliers.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No suppliers yet.</p>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Name","Specialty","Phone","Email",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>{s.specialty ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{s.phone ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{s.email ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => startEdit(s)} style={{ fontSize: 12, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", marginRight: 10 }}>Edit</button>
                    <button onClick={() => remove(s.id)} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
