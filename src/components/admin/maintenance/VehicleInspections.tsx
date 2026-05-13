"use client";

import { useEffect, useState } from "react";
import styles from "./VehicleInspections.module.css";

type InspectionType = "pre_rental" | "post_rental" | "periodic";
type OverallCondition = "good" | "fair" | "poor";
type ChecklistStatus = "ok" | "issue" | "not_checked";

interface ChecklistItem { id: string; category: string; itemLabel: string; status: ChecklistStatus; note: string | null; }
interface Inspection {
  id: string; inspectionType: InspectionType; conductedAt: string;
  conductedBy: string | null; odometerKm: number | null; fuelLevelPct: number | null;
  overallCondition: OverallCondition | null; notes: string | null;
  checklistItems: ChecklistItem[];
}

const TYPE_LABEL: Record<InspectionType, string> = { pre_rental: "Pre-rental", post_rental: "Post-rental", periodic: "Periodic" };
const TYPE_COLOR: Record<InspectionType, string> = { pre_rental: "#3b82f6", post_rental: "#f97316", periodic: "#8b5cf6" };
const COND_COLOR: Record<OverallCondition, string> = { good: "#22c55e", fair: "#f59e0b", poor: "#ef4444" };
const ITEM_ICON: Record<ChecklistStatus, string> = { ok: "✓", issue: "✗", not_checked: "○" };
const ITEM_COLOR: Record<ChecklistStatus, string> = { ok: "#22c55e", issue: "#ef4444", not_checked: "#94a3b8" };

const DEFAULT_CHECKLIST = [
  { category: "exterior", itemLabel: "Body / paintwork" },
  { category: "exterior", itemLabel: "Windows / windscreen" },
  { category: "exterior", itemLabel: "Lights" },
  { category: "exterior", itemLabel: "Tyres" },
  { category: "interior", itemLabel: "Interior cleanliness" },
  { category: "interior", itemLabel: "Upholstery" },
  { category: "mechanical", itemLabel: "Oil level" },
  { category: "mechanical", itemLabel: "Fuel level" },
  { category: "documentation", itemLabel: "Registration document" },
  { category: "documentation", itemLabel: "Insurance certificate" },
];

export default function VehicleInspections({ carId }: { carId: string }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newType,     setNewType]     = useState<InspectionType>("periodic");
  const [newKm,       setNewKm]       = useState("");
  const [newFuel,     setNewFuel]     = useState("");
  const [saving,      setSaving]      = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/next-api/inspections?carId=${carId}`);
      if (res.ok) setInspections(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [carId]);

  const createInspection = async () => {
    setSaving(true);
    try {
      const res = await fetch("/next-api/inspections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          inspectionType: newType,
          conductedAt: new Date().toISOString(),
          odometerKm: newKm ? +newKm : undefined,
          fuelLevelPct: newFuel ? +newFuel : undefined,
          checklistItems: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, status: "not_checked", sortOrder: i })),
        }),
      });
      if (res.ok) { setCreating(false); setNewKm(""); setNewFuel(""); await load(); }
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading…</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Inspections</h2>
        {!creating ? (
          <button className={styles.addBtn} onClick={() => setCreating(true)}>+ New Inspection</button>
        ) : (
          <div className={styles.createForm}>
            <select className={styles.select} value={newType} onChange={e => setNewType(e.target.value as InspectionType)}>
              {(Object.keys(TYPE_LABEL) as InspectionType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <input className={styles.input} type="number" placeholder="Odometer (km)" value={newKm} onChange={e => setNewKm(e.target.value)} />
            <input className={styles.input} type="number" min="0" max="100" placeholder="Fuel %" value={newFuel} onChange={e => setNewFuel(e.target.value)} />
            <button className={styles.saveBtn} onClick={createInspection} disabled={saving}>{saving ? "…" : "Create"}</button>
            <button className={styles.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        )}
      </div>

      {inspections.length === 0 ? (
        <p className={styles.empty}>No inspections recorded.</p>
      ) : (
        <div className={styles.list}>
          {inspections.map(ins => {
            const isOpen  = expanded === ins.id;
            const issues  = ins.checklistItems?.filter(i => i.status === "issue").length ?? 0;
            const grouped = (ins.checklistItems ?? []).reduce<Record<string, ChecklistItem[]>>((acc, item) => {
              (acc[item.category] ??= []).push(item);
              return acc;
            }, {});

            return (
              <div key={ins.id} className={styles.card}>
                <div className={styles.cardHeader} onClick={() => setExpanded(isOpen ? null : ins.id)}>
                  <div className={styles.cardLeft}>
                    <span className={styles.typeBadge} style={{ background: `${TYPE_COLOR[ins.inspectionType]}18`, color: TYPE_COLOR[ins.inspectionType] }}>
                      {TYPE_LABEL[ins.inspectionType]}
                    </span>
                    <span className={styles.cardDate}>
                      {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ins.conductedAt))}
                    </span>
                    {ins.overallCondition && (
                      <span className={styles.condBadge} style={{ color: COND_COLOR[ins.overallCondition] }}>
                        {ins.overallCondition}
                      </span>
                    )}
                    {issues > 0 && <span className={styles.issueCount}>⚠ {issues} issue{issues > 1 ? "s" : ""}</span>}
                  </div>
                  <span className={styles.chevron}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div className={styles.cardBody}>
                    <div className={styles.metaRow}>
                      {ins.odometerKm != null && <span>🛣 {ins.odometerKm.toLocaleString()} km</span>}
                      {ins.fuelLevelPct != null && <span>⛽ {ins.fuelLevelPct}%</span>}
                      {ins.conductedBy && <span>👤 {ins.conductedBy}</span>}
                    </div>
                    {ins.notes && <p className={styles.notes}>{ins.notes}</p>}
                    {Object.entries(grouped).map(([cat, items]) => (
                      <div key={cat} className={styles.checklistGroup}>
                        <p className={styles.checklistCat}>{cat}</p>
                        {items.map(item => (
                          <div key={item.id} className={styles.checklistItem}>
                            <span style={{ color: ITEM_COLOR[item.status], fontWeight: 700, width: 16 }}>{ITEM_ICON[item.status]}</span>
                            <span className={styles.checklistLabel}>{item.itemLabel}</span>
                            {item.note && <span className={styles.checklistNote}>{item.note}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
