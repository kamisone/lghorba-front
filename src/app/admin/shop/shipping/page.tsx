"use client";

import { useEffect, useState } from "react";
import BilingualField from "@/components/admin/BilingualField";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";

interface ShippingZone {
  id: string;
  name: string;
  countryCodes: string[];
  isActive: boolean;
}

interface ShippingMethod {
  id: string;
  zoneId: string;
  name: string;
  carrier: string | null;
  priceCents: number;
  freeAboveCents: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  sortOrder: number;
}

type ZoneForm = { name: string; countryCodes: string; isActive: boolean };
type MethodForm = {
  zoneId: string; name: string; description: string; carrier: string;
  priceCents: number; freeAboveCents: string;
  estimatedDaysMin: number; estimatedDaysMax: number;
  isActive: boolean; sortOrder: number;
};

const EMPTY_ZONE: ZoneForm    = { name: "", countryCodes: "", isActive: true };
const EMPTY_METHOD: MethodForm = {
  zoneId: "", name: "", description: "", carrier: "",
  priceCents: 0, freeAboveCents: "",
  estimatedDaysMin: 2, estimatedDaysMax: 5,
  isActive: true, sortOrder: 0,
};

export default function ShippingPage() {
  const { toast } = useToast();

  const [zones,   setZones]   = useState<ShippingZone[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<string | "all">("all");

  const [zoneModal,   setZoneModal]   = useState<null | "create" | "edit">(null);
  const [methodModal, setMethodModal] = useState<null | "create" | "edit">(null);
  const [zoneForm,    setZoneForm]    = useState<ZoneForm>(EMPTY_ZONE);
  const [methodForm,  setMethodForm]  = useState<MethodForm>(EMPTY_METHOD);
  const [editZoneId,   setEditZoneId]   = useState<string | null>(null);
  const [editMethodId, setEditMethodId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { enValues: methodEn, setEn: setMethodEn, saveEnTranslations: saveMethodEn } =
    useEntityTranslations('shop_shipping_method', editMethodId);

  async function load() {
    setLoading(true);
    try {
      const [zr, mr] = await Promise.all([
        fetch("/next-api/admin/shop/shipping/zones"),
        fetch("/next-api/admin/shop/shipping/methods"),
      ]);
      if (zr.ok) setZones(await zr.json());
      if (mr.ok) setMethods(await mr.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Zones ──────────────────────────────────────────────────────────────────

  function openCreateZone() { setZoneForm(EMPTY_ZONE); setEditZoneId(null); setZoneModal("create"); }
  function openEditZone(z: ShippingZone) {
    setZoneForm({ name: z.name, countryCodes: z.countryCodes.join(", "), isActive: z.isActive });
    setEditZoneId(z.id);
    setZoneModal("edit");
  }

  async function saveZone() {
    setSaving(true);
    const body = { name: zoneForm.name, countryCodes: zoneForm.countryCodes.split(",").map(s => s.trim().toUpperCase()).filter(Boolean), isActive: zoneForm.isActive };
    const url    = zoneModal === "create" ? "/next-api/admin/shop/shipping/zones" : `/next-api/admin/shop/shipping/zones/${editZoneId}`;
    const method = zoneModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) toast.success(zoneModal === "create" ? "Zone created" : "Zone updated");
    else toast.error("Failed to save zone");
    setSaving(false);
    setZoneModal(null);
    load();
  }

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone? All shipping methods within it will also be removed.")) return;
    const res = await fetch(`/next-api/admin/shop/shipping/zones/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Zone deleted");
    else toast.error("Failed to delete zone");
    load();
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  function openCreateMethod(zoneId = "") {
    setMethodForm({ ...EMPTY_METHOD, zoneId });
    setEditMethodId(null);
    setMethodModal("create");
  }
  function openEditMethod(m: ShippingMethod & { description?: string | null }) {
    setMethodForm({
      zoneId: m.zoneId, name: m.name, description: m.description ?? "", carrier: m.carrier ?? "",
      priceCents: m.priceCents, freeAboveCents: m.freeAboveCents != null ? String(m.freeAboveCents) : "",
      estimatedDaysMin: m.estimatedDaysMin, estimatedDaysMax: m.estimatedDaysMax,
      isActive: m.isActive, sortOrder: m.sortOrder,
    });
    setEditMethodId(m.id);
    setMethodModal("edit");
  }

  async function saveMethod() {
    setSaving(true);
    const body = {
      ...methodForm,
      description:    methodForm.description || null,
      carrier:        methodForm.carrier || null,
      freeAboveCents: methodForm.freeAboveCents !== "" ? Number(methodForm.freeAboveCents) : null,
    };
    const url    = methodModal === "create" ? "/next-api/admin/shop/shipping/methods" : `/next-api/admin/shop/shipping/methods/${editMethodId}`;
    const method = methodModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json().catch(() => ({}));
      const id = saved?.id ?? editMethodId;
      if (id) await saveMethodEn(id, ['name', 'description']);
      toast.success(methodModal === "create" ? "Method created" : "Method updated");
    } else {
      toast.error("Failed to save method");
    }
    setSaving(false);
    setMethodModal(null);
    load();
  }

  async function deleteMethod(id: string) {
    if (!confirm("Delete this shipping method?")) return;
    const res = await fetch(`/next-api/admin/shop/shipping/methods/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Method deleted");
    else toast.error("Failed to delete method");
    load();
  }

  const visibleMethods = activeZone === "all" ? methods : methods.filter(m => m.zoneId === activeZone);
  const zoneMap = Object.fromEntries(zones.map(z => [z.id, z.name]));

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const SKEL = Array.from({ length: 3 }, (_, i) => i);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Shipping</h1>
      </div>

      {/* ── Zones ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>Shipping Zones</h2>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreateZone}>+ New zone</button>
      </div>

      <table className={styles.table} style={{ marginBottom: 40 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Countries</th>
            <th>Methods</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? SKEL.map(i => (
                <tr key={i}>
                  {[120, 200, 50, 60, 120].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : zones.map(z => (
                <tr key={z.id}>
                  <td><strong>{z.name}</strong></td>
                  <td style={{ fontSize: 12, color: "#6b7280" }}>
                    {z.countryCodes.length === 0 ? <em>Worldwide</em> : z.countryCodes.slice(0, 8).join(", ") + (z.countryCodes.length > 8 ? ` +${z.countryCodes.length - 8}` : "")}
                  </td>
                  <td>{methods.filter(m => m.zoneId === z.id).length}</td>
                  <td>
                    <span className={`${styles.badge} ${z.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                      {z.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEditZone(z)}>Edit</button>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openCreateMethod(z.id)}>+ Method</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => deleteZone(z.id)}>Delete</button>
                  </td>
                </tr>
              ))
          }
          {!loading && zones.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No shipping zones yet</td></tr>
          )}
        </tbody>
      </table>

      {/* ── Methods ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>Shipping Methods</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={activeZone}
            onChange={e => setActiveZone(e.target.value)}
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="all">All zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openCreateMethod()}>+ New method</button>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Zone</th>
            <th>Carrier</th>
            <th>Price</th>
            <th>Free above</th>
            <th>Delivery</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? SKEL.map(i => (
                <tr key={i}>
                  {[120, 90, 80, 70, 80, 80, 60, 120].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : visibleMethods.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td style={{ fontSize: 12, color: "#6b7280" }}>{zoneMap[m.zoneId] ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{m.carrier ?? "—"}</td>
                  <td>{fmt(m.priceCents)}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{m.freeAboveCents != null ? fmt(m.freeAboveCents) : "—"}</td>
                  <td style={{ fontSize: 13 }}>{m.estimatedDaysMin}–{m.estimatedDaysMax} days</td>
                  <td>
                    <span className={`${styles.badge} ${m.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEditMethod(m)}>Edit</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => deleteMethod(m.id)}>Delete</button>
                  </td>
                </tr>
              ))
          }
          {!loading && visibleMethods.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No shipping methods yet</td></tr>
          )}
        </tbody>
      </table>

      {/* ── Zone Modal ── */}
      {zoneModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 480, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {zoneModal === "create" ? "New Shipping Zone" : "Edit Shipping Zone"}
            </h2>
            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Name *</label>
                <input value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} placeholder="Europe, North America…" />
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Country codes (comma-separated, leave empty for worldwide)</label>
                <input value={zoneForm.countryCodes} onChange={e => setZoneForm(f => ({ ...f, countryCodes: e.target.value }))} placeholder="FR, DE, IT, ES…" />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={zoneForm.isActive ? "active" : "inactive"} onChange={e => setZoneForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setZoneModal(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !zoneForm.name} onClick={saveZone}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Method Modal ── */}
      {methodModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 560, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {methodModal === "create" ? "New Shipping Method" : "Edit Shipping Method"}
            </h2>
            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Zone *</label>
                <select value={methodForm.zoneId} onChange={e => setMethodForm(f => ({ ...f, zoneId: e.target.value }))}>
                  <option value="">— Select zone —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            </div>
            <BilingualField
              label="Name"
              frRequired
              frValue={methodForm.name}
              frOnChange={v => setMethodForm(f => ({ ...f, name: v }))}
              frPlaceholder="Livraison standard"
              enValue={methodEn.name ?? ""}
              enOnChange={v => setMethodEn('name', v)}
              enPlaceholder="Standard Delivery"
            />
            <BilingualField
              label="Description"
              frValue={methodForm.description}
              frOnChange={v => setMethodForm(f => ({ ...f, description: v }))}
              enValue={methodEn.description ?? ""}
              enOnChange={v => setMethodEn('description', v)}
              multiline rows={2}
            />
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Carrier</label>
                <input value={methodForm.carrier} onChange={e => setMethodForm(f => ({ ...f, carrier: e.target.value }))} placeholder="DHL, Colissimo…" />
              </div>
              <div className={styles.formField}>
                <label>Price (cents) *</label>
                <input type="number" min={0} value={methodForm.priceCents} onChange={e => setMethodForm(f => ({ ...f, priceCents: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Free above (cents, optional)</label>
                <input type="number" min={0} value={methodForm.freeAboveCents} onChange={e => setMethodForm(f => ({ ...f, freeAboveCents: e.target.value }))} placeholder="e.g. 5000 for $50" />
              </div>
              <div className={styles.formField}>
                <label>Est. days min</label>
                <input type="number" min={0} value={methodForm.estimatedDaysMin} onChange={e => setMethodForm(f => ({ ...f, estimatedDaysMin: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Est. days max</label>
                <input type="number" min={0} value={methodForm.estimatedDaysMax} onChange={e => setMethodForm(f => ({ ...f, estimatedDaysMax: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Sort order</label>
                <input type="number" value={methodForm.sortOrder} onChange={e => setMethodForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={methodForm.isActive ? "active" : "inactive"} onChange={e => setMethodForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setMethodModal(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !methodForm.zoneId || !methodForm.name} onClick={saveMethod}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
