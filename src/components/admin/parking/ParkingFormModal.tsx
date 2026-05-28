"use client";

import { useState } from "react";
import styles from "./ParkingFormModal.module.css";
import type { Parking } from "./ParkingList";
import AddressAutocomplete, { type SelectedAddress } from "@/components/AddressAutocomplete";
import { X, Plus, Trash2, Copy } from "lucide-react";

interface Props {
  parking: Parking | null;
  onClose: () => void;
  onSaved: () => void;
}

const PARKING_TYPES = [
  { value: "covered",     label: "Covered" },
  { value: "outdoor",     label: "Outdoor" },
  { value: "underground", label: "Underground" },
  { value: "garage",      label: "Garage" },
  { value: "street",      label: "Street" },
  { value: "other",       label: "Other" },
];

const STATUSES = [
  { value: "active",      label: "Active" },
  { value: "inactive",    label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
  { value: "blocked",     label: "Blocked" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface FormPhone { phoneNumber: string; label: string; }

function emptyForm(): Omit<Parking, "id" | "ownerPhones" | "documents" | "cars" | "createdAt" | "updatedAt"> & { ownerPhones: FormPhone[] } {
  return {
    label: "", address: "", city: "", latitude: null, longitude: null,
    monthlyRentEur: null, cautionEur: null, paymentDueDay: null,
    ownerName: "", status: "active", parkingType: null,
    accessInstructions: "", pedestrianCode: "", gateCode: "",
    dimensionNotes: "", comments: "", isActive: true, ownerPhones: [],
  };
}

export default function ParkingFormModal({ parking, onClose, onSaved }: Props) {
  const isEdit = !!parking;
  const [form, setForm] = useState(() =>
    parking
      ? { ...parking, ownerPhones: parking.ownerPhones.map(p => ({ phoneNumber: p.phoneNumber, label: p.label ?? "" })) }
      : emptyForm(),
  );
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<"info" | "access" | "notes">("info");

  // AddressAutocomplete selection — kept in sync with form.address
  const initialAddr: SelectedAddress | null = parking?.address
    ? { label: parking.address, lat: parking.latitude ?? 0, lng: parking.longitude ?? 0 }
    : null;
  const [addrSelection, setAddrSelection] = useState<SelectedAddress | null>(initialAddr);

  const handleAddressSelect = (addr: SelectedAddress | null) => {
    setAddrSelection(addr);
    if (addr) {
      setForm(f => ({
        ...f,
        address:   addr.label,
        city:      addr.city ?? f.city,
        latitude:  addr.lat,
        longitude: addr.lng,
      }));
    } else {
      setForm(f => ({ ...f, address: "", latitude: null, longitude: null }));
    }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const addPhone = () =>
    setForm(f => ({ ...f, ownerPhones: [...f.ownerPhones, { phoneNumber: "", label: "" }] }));

  const updatePhone = (i: number, field: keyof FormPhone, val: string) =>
    setForm(f => {
      const phones = [...f.ownerPhones];
      phones[i] = { ...phones[i], [field]: val };
      return { ...f, ownerPhones: phones };
    });

  const removePhone = (i: number) =>
    setForm(f => ({ ...f, ownerPhones: f.ownerPhones.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        city:           form.city || null,
        ownerName:      form.ownerName || null,
        parkingType:    form.parkingType || null,
        pedestrianCode: form.pedestrianCode || null,
        gateCode:       form.gateCode || null,
        accessInstructions: form.accessInstructions || null,
        dimensionNotes: form.dimensionNotes || null,
        comments:       form.comments || null,
        latitude:       form.latitude  ? Number(form.latitude)  : null,
        longitude:      form.longitude ? Number(form.longitude) : null,
        monthlyRentEur: form.monthlyRentEur  ? Number(form.monthlyRentEur)  : null,
        cautionEur:     form.cautionEur      ? Number(form.cautionEur)      : null,
        paymentDueDay:  form.paymentDueDay   ? Number(form.paymentDueDay)   : null,
        ownerPhones: form.ownerPhones.filter(p => p.phoneNumber).map((p, i) => ({
          phoneNumber: p.phoneNumber, label: p.label || null, sortOrder: i,
        })),
      };

      const url    = isEdit ? `/next-api/parkings/${parking.id}` : "/next-api/parkings";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Error ${res.status}`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? `Edit — ${parking.label}` : "New parking"}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          {(["info", "access", "notes"] as const).map(t => (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`} onClick={() => setTab(t)}>
              {{ info: "Information", access: "Access & Codes", notes: "Notes & Dimensions" }[t]}
            </button>
          ))}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.scrollArea}>

            {/* ── Tab: Info ── */}
            {tab === "info" && (
              <div className={styles.section}>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Name / Label *</label>
                    <input className={styles.input} required value={form.label}
                      onChange={e => set("label", e.target.value)} placeholder="e.g. Underground Châtelet P3" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Status</label>
                    <select className={styles.select} value={form.status} onChange={e => set("status", e.target.value as any)}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Full address *</label>
                  <AddressAutocomplete
                    value={addrSelection}
                    onChange={handleAddressSelect}
                    placeholder="Search address in France…"
                    required
                  />
                </div>

                <div className={styles.row3}>
                  <div className={styles.field}>
                    <label className={styles.label}>City</label>
                    <input className={styles.input} value={form.city ?? ""}
                      onChange={e => set("city", e.target.value)} placeholder="Paris" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Latitude</label>
                    <input className={styles.input} type="number" step="any" value={form.latitude ?? ""}
                      onChange={e => set("latitude", e.target.value ? Number(e.target.value) : null)} placeholder="48.8566" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Longitude</label>
                    <input className={styles.input} type="number" step="any" value={form.longitude ?? ""}
                      onChange={e => set("longitude", e.target.value ? Number(e.target.value) : null)} placeholder="2.3522" />
                  </div>
                </div>

                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Parking type</label>
                    <select className={styles.select} value={form.parkingType ?? ""} onChange={e => set("parkingType", (e.target.value || null) as any)}>
                      <option value="">— Select —</option>
                      {PARKING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Active</label>
                    <div className={styles.checkRow}>
                      <input type="checkbox" id="isActive" checked={form.isActive}
                        onChange={e => set("isActive", e.target.checked)} />
                      <label htmlFor="isActive" style={{ fontWeight: 400, fontSize: 13 }}>Parking operational</label>
                    </div>
                  </div>
                </div>

                {/* ── Financial ── */}
                <div className={styles.sectionTitle}>Financial</div>
                <div className={styles.row3}>
                  <div className={styles.field}>
                    <label className={styles.label}>Monthly rent (€)</label>
                    <input className={styles.input} type="number" step="0.01" min="0" value={form.monthlyRentEur ?? ""}
                      onChange={e => set("monthlyRentEur", e.target.value ? Number(e.target.value) : null)} placeholder="0.00" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Deposit (€)</label>
                    <input className={styles.input} type="number" step="0.01" min="0" value={form.cautionEur ?? ""}
                      onChange={e => set("cautionEur", e.target.value ? Number(e.target.value) : null)} placeholder="0.00" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Payment due day</label>
                    <select className={styles.select} value={form.paymentDueDay ?? ""} onChange={e => set("paymentDueDay", e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— Day —</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Owner ── */}
                <div className={styles.sectionTitle}>Owner</div>
                <div className={styles.field}>
                  <label className={styles.label}>Owner name</label>
                  <input className={styles.input} value={form.ownerName ?? ""}
                    onChange={e => set("ownerName", e.target.value)} placeholder="Mr. Dupont" />
                </div>

                <div className={styles.phonesSection}>
                  <div className={styles.phonesSectionHeader}>
                    <span className={styles.label}>Phone numbers</span>
                    <button type="button" className={styles.addPhoneBtn} onClick={addPhone}>
                      <Plus size={16} strokeWidth={1.75} /> Add
                    </button>
                  </div>
                  {form.ownerPhones.map((ph, i) => (
                    <div key={i} className={styles.phoneRow}>
                      <input className={styles.input} value={ph.phoneNumber}
                        onChange={e => updatePhone(i, "phoneNumber", e.target.value)}
                        placeholder="+33 6 12 34 56 78" style={{ flex: 2 }} />
                      <input className={styles.input} value={ph.label}
                        onChange={e => updatePhone(i, "label", e.target.value)}
                        placeholder="Label (e.g. Mobile)" style={{ flex: 1 }} />
                      <button type="button" className={styles.removePhoneBtn} onClick={() => removePhone(i)}>
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  ))}
                  {form.ownerPhones.length === 0 && (
                    <p className={styles.noPhones}>No phone numbers registered</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Access ── */}
            {tab === "access" && (
              <div className={styles.section}>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Pedestrian code</label>
                    <div className={styles.codeInputWrap}>
                      <input className={styles.input} value={form.pedestrianCode ?? ""}
                        onChange={e => set("pedestrianCode", e.target.value)} placeholder="e.g. 1234" />
                      <button type="button" className={styles.copyBtn} title="Copy"
                        onClick={() => navigator.clipboard.writeText(form.pedestrianCode ?? "")}>
                        <Copy size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Gate / access code</label>
                    <div className={styles.codeInputWrap}>
                      <input className={styles.input} value={form.gateCode ?? ""}
                        onChange={e => set("gateCode", e.target.value)} placeholder="e.g. A4512" />
                      <button type="button" className={styles.copyBtn} title="Copy"
                        onClick={() => navigator.clipboard.writeText(form.gateCode ?? "")}>
                        <Copy size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Access instructions</label>
                  <textarea className={styles.textarea} rows={8} value={form.accessInstructions ?? ""}
                    onChange={e => set("accessInstructions", e.target.value)}
                    placeholder="Enter via Rue Lecourbe, intercom 3rd button from bottom left, gate code A4512, then 2nd basement level -2…" />
                </div>
              </div>
            )}

            {/* ── Tab: Notes ── */}
            {tab === "notes" && (
              <div className={styles.section}>
                <div className={styles.field}>
                  <label className={styles.label}>Constraints / dimensions</label>
                  <textarea className={styles.textarea} rows={4} value={form.dimensionNotes ?? ""}
                    onChange={e => set("dimensionNotes", e.target.value)}
                    placeholder="Narrow entrance, max height 2.00m, min width 1.80m, watch out for left pillar…" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Operational comments</label>
                  <textarea className={styles.textarea} rows={8} value={form.comments ?? ""}
                    onChange={e => set("comments", e.target.value)}
                    placeholder="Deposit to recover at end of lease, key with the caretaker (Mr. Martin), pay before the 5th of the month, call before entering on weekends…" />
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {error && <div className={styles.errorMsg}>{error}</div>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create parking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
