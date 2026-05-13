"use client";

import { useEffect, useState } from "react";
import styles from "./VehicleIncidents.module.css";

type IncidentType = "scratch"|"broken_mirror"|"warning_light"|"accident"|"interior_damage"|"other";
type IncidentSeverity = "minor"|"moderate"|"major";

interface Incident {
  id: string; incidentType: IncidentType; severity: IncidentSeverity;
  reportedAt: string; description: string; repairRequired: boolean;
  maintenanceRecordId: string | null;
}

const TYPE_LABEL: Record<IncidentType, string> = {
  scratch: "Scratch", broken_mirror: "Broken Mirror", warning_light: "Warning Light",
  accident: "Accident", interior_damage: "Interior Damage", other: "Other",
};
const SEV_COLOR: Record<IncidentSeverity, string> = { minor: "#22c55e", moderate: "#f59e0b", major: "#ef4444" };

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

export default function VehicleIncidents({ carId }: { carId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [form,      setForm]      = useState({ type: "scratch" as IncidentType, severity: "minor" as IncidentSeverity, description: "", repairRequired: false });
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/next-api/incidents?carId=${carId}`);
      if (res.ok) setIncidents(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [carId]);

  const createIncident = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/next-api/incidents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, incidentType: form.type, severity: form.severity, description: form.description, repairRequired: form.repairRequired, reportedAt: new Date().toISOString() }),
      });
      if (res.ok) { setCreating(false); setForm({ type: "scratch", severity: "minor", description: "", repairRequired: false }); await load(); }
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading…</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Incidents</h2>
        {!creating ? (
          <button className={styles.addBtn} onClick={() => setCreating(true)}>+ Report Incident</button>
        ) : (
          <div className={styles.createForm}>
            <select className={styles.select} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as IncidentType }))}>
              {(Object.keys(TYPE_LABEL) as IncidentType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <select className={styles.select} value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as IncidentSeverity }))}>
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="major">Major</option>
            </select>
            <textarea
              className={styles.textarea} placeholder="Description (required)" rows={2}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={form.repairRequired} onChange={e => setForm(p => ({ ...p, repairRequired: e.target.checked }))} />
              Repair required
            </label>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={createIncident} disabled={saving || !form.description.trim()}>{saving ? "…" : "Save"}</button>
              <button className={styles.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {incidents.length === 0 ? (
        <p className={styles.empty}>No incidents reported.</p>
      ) : (
        <div className={styles.list}>
          {incidents.map(inc => (
            <div key={inc.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.typeBadge}>{TYPE_LABEL[inc.incidentType]}</span>
                <span className={styles.sevBadge} style={{ background: `${SEV_COLOR[inc.severity]}20`, color: SEV_COLOR[inc.severity] }}>{inc.severity}</span>
                {inc.repairRequired && (
                  <span className={styles.repairBadge}>🔧 Repair required</span>
                )}
                <span className={styles.date}>{fmtDate(inc.reportedAt)}</span>
              </div>
              <p className={styles.desc}>{inc.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
