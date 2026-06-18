"use client";

import { useEffect, useRef, useState } from "react";
import BilingualField from "@/components/admin/BilingualField";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import { getFlagSvgDataUrl } from "@/lib/european-flags";

interface ShippingCountry {
  isoCode: string;
  name: string;
  isShippingEnabled: boolean;
}

interface ShippingZone {
  id: string;
  name: string;
  countryCodes: string[];
  isActive: boolean;
  surchargeCents: number;
  freeShippingThresholdCents: number | null;
  estimatedDeliveryDays: string | null;
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

type ZoneForm = {
  name: string; countryCodes: string[]; isActive: boolean;
  surcharge: string; freeShippingThreshold: string;
  estimatedDeliveryDays: string;
};
type MethodForm = {
  zoneId: string; name: string; description: string; carrier: string;
  price: string; freeAbove: string;
  estimatedDaysMin: number; estimatedDaysMax: number;
  isActive: boolean; sortOrder: number;
};

const EMPTY_ZONE: ZoneForm = {
  name: "", countryCodes: [], isActive: true,
  surcharge: "0", freeShippingThreshold: "",
  estimatedDeliveryDays: "",
};
const EMPTY_METHOD: MethodForm = {
  zoneId: "", name: "", description: "", carrier: "",
  price: "0", freeAbove: "",
  estimatedDaysMin: 2, estimatedDaysMax: 5,
  isActive: true, sortOrder: 0,
};

const centsToEur = (c: number) => (c / 100).toFixed(2);
const eurToCents = (e: string) => Math.round(parseFloat(e || "0") * 100);

function flagEmoji(isoCode: string) {
  return isoCode.toUpperCase().split("").map(c =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join("");
}

function FlagInline({ code, size = 14 }: { code: string; size?: number }) {
  const url = getFlagSvgDataUrl(code);
  if (!url) return <>{flagEmoji(code)}</>;
  return <img src={url} alt={code} width={size * 1.5} height={size} style={{ borderRadius: 2, verticalAlign: "middle", border: "1px solid #e5e7eb" }} />;
}

function CountryPicker({ available, selected, onChange }: {
  available: ShippingCountry[];
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = available.filter(c =>
    !selected.includes(c.isoCode) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.isoCode.toLowerCase().includes(search.toLowerCase()))
  );

  function add(code: string) {
    onChange([...selected, code]);
    setSearch("");
  }
  function remove(code: string) {
    onChange(selected.filter(c => c !== code));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 10px",
          border: "1px solid #d1d5db", borderRadius: 8, minHeight: 38, cursor: "text",
          background: "#fff", alignItems: "center",
        }}
        onClick={() => setOpen(true)}
      >
        {selected.map(code => (
          <span
            key={code}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "#f3f4f6", borderRadius: 6, padding: "2px 8px",
              fontSize: 12, fontWeight: 500, color: "#374151",
            }}
          >
            <FlagInline code={code} /> {available.find(c => c.isoCode === code)?.name ?? code}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(code); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af", lineHeight: 1, padding: 0 }}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Search countries…" : ""}
          style={{ border: "none", outline: "none", flex: 1, minWidth: 80, fontSize: 13, background: "transparent" }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
            background: "#fff", border: "1px solid #d1d5db", borderRadius: 8,
            marginTop: 4, maxHeight: 200, overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {filtered.map(c => (
            <div
              key={c.isoCode}
              onClick={() => add(c.isoCode)}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <FlagInline code={c.isoCode} size={16} />
              <span>{c.name}</span>
              <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: "auto" }}>{c.isoCode}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShippingPage() {
  const { toast } = useToast();

  const [zones,     setZones]     = useState<ShippingZone[]>([]);
  const [methods,   setMethods]   = useState<ShippingMethod[]>([]);
  const [countries, setCountries] = useState<ShippingCountry[]>([]);
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
      const [zr, mr, cr] = await Promise.all([
        fetch("/next-api/admin/shop/shipping/zones"),
        fetch("/next-api/admin/shop/shipping/methods"),
        fetch("/next-api/admin/shop/countries"),
      ]);
      if (zr.ok) setZones(await zr.json());
      if (mr.ok) setMethods(await mr.json());
      if (cr.ok) setCountries(await cr.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Zones ──────────────────────────────────────────────────────────────────

  function openCreateZone() { setZoneForm(EMPTY_ZONE); setEditZoneId(null); setZoneModal("create"); }
  function openEditZone(z: ShippingZone) {
    setZoneForm({
      name: z.name,
      countryCodes: [...z.countryCodes],
      isActive: z.isActive,
      surcharge: centsToEur(z.surchargeCents ?? 0),
      freeShippingThreshold: z.freeShippingThresholdCents != null ? centsToEur(z.freeShippingThresholdCents) : "",
      estimatedDeliveryDays: z.estimatedDeliveryDays ?? "",
    });
    setEditZoneId(z.id);
    setZoneModal("edit");
  }

  async function saveZone() {
    setSaving(true);
    const body = {
      name: zoneForm.name,
      countryCodes: zoneForm.countryCodes,
      isActive: zoneForm.isActive,
      surchargeCents: eurToCents(zoneForm.surcharge),
      freeShippingThresholdCents: zoneForm.freeShippingThreshold !== "" ? eurToCents(zoneForm.freeShippingThreshold) : null,
      estimatedDeliveryDays: zoneForm.estimatedDeliveryDays || null,
    };
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
      price: centsToEur(m.priceCents), freeAbove: m.freeAboveCents != null ? centsToEur(m.freeAboveCents) : "",
      estimatedDaysMin: m.estimatedDaysMin, estimatedDaysMax: m.estimatedDaysMax,
      isActive: m.isActive, sortOrder: m.sortOrder,
    });
    setEditMethodId(m.id);
    setMethodModal("edit");
  }

  async function saveMethod() {
    setSaving(true);
    const body = {
      zoneId:         methodForm.zoneId,
      name:           methodForm.name,
      description:    methodForm.description || null,
      carrier:        methodForm.carrier || null,
      priceCents:     eurToCents(methodForm.price),
      freeAboveCents: methodForm.freeAbove !== "" ? eurToCents(methodForm.freeAbove) : null,
      estimatedDaysMin: methodForm.estimatedDaysMin,
      estimatedDaysMax: methodForm.estimatedDaysMax,
      isActive:       methodForm.isActive,
      sortOrder:      methodForm.sortOrder,
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
  const countryMap = Object.fromEntries(countries.map(c => [c.isoCode, c.name]));
  const shippingCountries = countries.filter(c => c.isShippingEnabled);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2)} €`;

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
            <th>Surcharge</th>
            <th>Free above</th>
            <th>Est. delivery</th>
            <th>Methods</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? SKEL.map(i => (
                <tr key={i}>
                  {[120, 200, 70, 80, 90, 50, 60, 120].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : zones.map(z => (
                <tr key={z.id}>
                  <td><strong>{z.name}</strong></td>
                  <td style={{ fontSize: 12, color: "#6b7280" }}>
                    {z.countryCodes.length === 0
                      ? <em>Worldwide</em>
                      : <>
                          {z.countryCodes.slice(0, 5).map(c => (
                            <span key={c} style={{ marginRight: 8, whiteSpace: "nowrap" }}><FlagInline code={c} /> {countryMap[c] ?? c}</span>
                          ))}
                          {z.countryCodes.length > 5 && <span>+{z.countryCodes.length - 5}</span>}
                        </>}
                  </td>
                  <td>{z.surchargeCents ? fmt(z.surchargeCents) : "—"}</td>
                  <td style={{ fontSize: 13, color: "#6b7280" }}>{z.freeShippingThresholdCents != null ? fmt(z.freeShippingThresholdCents) : "—"}</td>
                  <td style={{ fontSize: 13 }}>{z.estimatedDeliveryDays ?? "—"}</td>
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
            <tr><td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No shipping zones yet</td></tr>
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
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 560, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {zoneModal === "create" ? "New Shipping Zone" : "Edit Shipping Zone"}
            </h2>
            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Name *</label>
                <input value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} placeholder="Europe, North America…" />
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Countries (leave empty for worldwide)</label>
                <CountryPicker
                  available={shippingCountries}
                  selected={zoneForm.countryCodes}
                  onChange={codes => setZoneForm(f => ({ ...f, countryCodes: codes }))}
                />
              </div>
              <div className={styles.formField}>
                <label>Surcharge (€)</label>
                <input type="number" min={0} step="0.01" value={zoneForm.surcharge} onChange={e => setZoneForm(f => ({ ...f, surcharge: e.target.value }))} placeholder="e.g. 5.00" />
              </div>
              <div className={styles.formField}>
                <label>Free shipping above (€)</label>
                <input type="number" min={0} step="0.01" value={zoneForm.freeShippingThreshold} onChange={e => setZoneForm(f => ({ ...f, freeShippingThreshold: e.target.value }))} placeholder="e.g. 100.00" />
              </div>
              <div className={styles.formField}>
                <label>Est. delivery time</label>
                <input value={zoneForm.estimatedDeliveryDays} onChange={e => setZoneForm(f => ({ ...f, estimatedDeliveryDays: e.target.value }))} placeholder="3-5 business days" />
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
                <label>Price (€) *</label>
                <input type="number" min={0} step="0.01" value={methodForm.price} onChange={e => setMethodForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 4.90" />
              </div>
              <div className={styles.formField}>
                <label>Free above (€, optional)</label>
                <input type="number" min={0} step="0.01" value={methodForm.freeAbove} onChange={e => setMethodForm(f => ({ ...f, freeAbove: e.target.value }))} placeholder="e.g. 50.00" />
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
