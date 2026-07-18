"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { X } from "lucide-react";
import { EUROPEAN_FLAGS, getFlagSvgDataUrl } from "@/lib/european-flags";
import BilingualField from "@/components/admin/BilingualField";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";

interface Country {
  isoCode: string;
  name: string;
  phonePrefix: string | null;
  currencyCode: string | null;
  isoCode3: string | null;
  continentCode: string | null;
  isActive: boolean;
  isShippingEnabled: boolean;
  isEuVat: boolean;
}

interface CountryForm {
  isoCode: string;
  name: string;
  phonePrefix: string;
  currencyCode: string;
  isoCode3: string;
  continentCode: string;
  isActive: boolean;
  isShippingEnabled: boolean;
  isEuVat: boolean;
}

const EMPTY_FORM: CountryForm = {
  isoCode: "", name: "", phonePrefix: "",
  currencyCode: "", isoCode3: "", continentCode: "",
  isActive: true, isShippingEnabled: false, isEuVat: false,
};

function FlagIcon({ code, size = 24 }: { code: string; size?: number }) {
  const url = getFlagSvgDataUrl(code);
  if (!url) return <span style={{ fontSize: size }}>{flagEmoji(code)}</span>;
  return <img src={url} alt={code} width={size * 1.5} height={size} style={{ borderRadius: 3, objectFit: "cover", border: "1px solid #e5e7eb" }} />;
}

function flagEmoji(isoCode: string) {
  return isoCode.toUpperCase().split("").map(c =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join("");
}

function FlagDropdown({ selected, onSelect }: {
  selected: string;
  onSelect: (code: string, name: string) => void;
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

  const entries = Object.entries(EUROPEAN_FLAGS);
  const filtered = search
    ? entries.filter(([code, e]) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        code.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const selectedEntry = selected ? EUROPEAN_FLAGS[selected.toUpperCase()] : null;

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
        Country flag
      </label>
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setOpen(!open)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", border: "1px solid var(--color-border)",
            borderRadius: 8, cursor: "pointer", background: "var(--color-surface)",
            minHeight: 40,
          }}
        >
          {selectedEntry ? (
            <>
              <img
                src={`data:image/svg+xml,${encodeURIComponent(selectedEntry.svg)}`}
                alt={selected} width={30} height={20}
                style={{ borderRadius: 3, border: "1px solid #e5e7eb" }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{selectedEntry.name}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>{selected.toUpperCase()}</span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Search and select a country…</span>
          )}
        </div>

        {open && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            background: "#fff", border: "1px solid var(--color-border)", borderRadius: 10,
            marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,.12)", overflow: "hidden",
          }}>
            <div style={{ padding: 8, borderBottom: "1px solid var(--color-border)" }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or code…"
                style={{
                  width: "100%", padding: "8px 10px", border: "1px solid var(--color-border)",
                  borderRadius: 6, fontSize: 13, outline: "none", background: "var(--color-surface)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filtered.length === 0 && (
                <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
                  No matching country
                </div>
              )}
              {filtered.map(([code, entry]) => {
                const isActive = selected.toUpperCase() === code;
                return (
                  <div
                    key={code}
                    onClick={() => { onSelect(code, entry.name); setOpen(false); setSearch(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 14px", cursor: "pointer", fontSize: 13,
                      background: isActive ? "#EEF2FF" : "transparent",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f9fafb"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <img
                      src={`data:image/svg+xml,${encodeURIComponent(entry.svg)}`}
                      alt={code} width={30} height={20}
                      style={{ borderRadius: 3, border: "1px solid #e5e7eb", flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: isActive ? 600 : 400 }}>{entry.name}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>{code}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CountriesPage() {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<string | null>(null);

  const [modal, setModal]   = useState<"create" | "edit" | null>(null);
  const [form, setForm]     = useState<CountryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { enValues: nameEn, setEn: setNameEn, saveEnTranslations: saveNameEn } =
    useEntityTranslations("shop_country", modal ? form.isoCode || null : null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/countries");
      if (res.ok) setCountries(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY_FORM); setModal("create"); }
  function openEdit(c: Country) {
    setForm({
      isoCode:          c.isoCode,
      name:             c.name,
      phonePrefix:      c.phonePrefix ?? "",
      currencyCode:     c.currencyCode ?? "",
      isoCode3:         c.isoCode3 ?? "",
      continentCode:    c.continentCode ?? "",
      isActive:         c.isActive,
      isShippingEnabled: c.isShippingEnabled,
      isEuVat:          c.isEuVat,
    });
    setModal("edit");
  }

  async function handleSave() {
    if (!form.isoCode.trim() || !form.name.trim()) {
      toast.error("ISO code and name are required");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      isoCode:       form.isoCode.toUpperCase().trim(),
      phonePrefix:   form.phonePrefix   || null,
      currencyCode:  form.currencyCode.toUpperCase().trim() || null,
      isoCode3:      form.isoCode3.toUpperCase().trim()     || null,
      continentCode: form.continentCode.toUpperCase().trim() || null,
    };

    const isCreate = modal === "create";
    const url    = isCreate ? "/next-api/admin/shop/countries" : `/next-api/admin/shop/countries/${form.isoCode}`;
    const method = isCreate ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const saved = await res.json().catch(() => null);
      const isoCode = saved?.isoCode ?? body.isoCode;
      await saveNameEn(isoCode, ["name"]);
      toast.success(isCreate ? "Country added" : "Country updated");
      setModal(null);
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Failed to save country");
    }
    setSaving(false);
  }

  async function handleDelete(c: Country) {
    if (!confirm(`Delete "${c.name}" (${c.isoCode})? This cannot be undone.`)) return;
    setUpdating(c.isoCode + "delete");
    const res = await fetch(`/next-api/admin/shop/countries/${c.isoCode}`, { method: "DELETE" });
    if (res.ok) {
      setCountries(prev => prev.filter(x => x.isoCode !== c.isoCode));
      toast.success("Country deleted");
    } else {
      toast.error("Failed to delete country");
    }
    setUpdating(null);
  }

  async function toggle(isoCode: string, field: "isActive" | "isShippingEnabled", current: boolean) {
    setUpdating(isoCode + field);
    const res = await fetch(`/next-api/admin/shop/countries/${isoCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !current }),
    });
    if (res.ok) {
      const updated: Country = await res.json();
      setCountries(prev => prev.map(c => c.isoCode === isoCode ? updated : c));
    } else {
      toast.error("Failed to update country");
    }
    setUpdating(null);
  }

  const field = (label: string, key: keyof CountryForm, opts?: { placeholder?: string; maxLength?: number; upper?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </label>
      <input
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)" }}
        value={form[key] as string}
        maxLength={opts?.maxLength}
        placeholder={opts?.placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: opts?.upper ? e.target.value.toUpperCase() : e.target.value }))}
      />
    </div>
  );

  const toggle2 = (label: string, key: "isActive" | "isShippingEnabled" | "isEuVat") => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
      <input
        type="checkbox"
        checked={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: "var(--color-admin-secondary)", cursor: "pointer" }}
      />
      {label}
    </label>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Countries</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {countries.length} countries · shown in checkout address form
          </p>
        </div>
        <button className={styles.btn} style={{ background: "var(--color-admin-secondary)", color: "#fff", padding: "10px 20px", borderRadius: 10, fontWeight: 600, border: "none", cursor: "pointer" }} onClick={openCreate}>
          + Add Country
        </button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Name</th>
            <th>ISO</th>
            <th>Currency</th>
            <th>EU VAT</th>
            <th>Shipping</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  {[24, 120, 40, 50, 50, 80, 60, 100].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : countries.map(c => (
                <tr key={c.isoCode}>
                  <td><FlagIcon code={c.isoCode} size={22} /></td>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: "var(--color-text-muted)", fontSize: 13, fontFamily: "monospace" }}>{c.isoCode}</td>
                  <td style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{c.currencyCode ?? "—"}</td>
                  <td>
                    {c.isEuVat
                      ? <span className={`${styles.badge} ${styles.badgePublished}`}>EU VAT</span>
                      : <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>—</span>}
                  </td>
                  <td>
                    <button
                      disabled={!!updating}
                      className={`${styles.btn} ${c.isShippingEnabled ? styles.btnSuccess : styles.btnSecondary}`}
                      style={{ fontSize: 12, padding: "4px 12px" }}
                      onClick={() => toggle(c.isoCode, "isShippingEnabled", c.isShippingEnabled)}
                    >
                      {c.isShippingEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td>
                    <button
                      disabled={!!updating}
                      className={`${styles.btn} ${c.isActive ? styles.btnSuccess : styles.btnSecondary}`}
                      style={{ fontSize: 12, padding: "4px 12px" }}
                      onClick={() => toggle(c.isoCode, "isActive", c.isActive)}
                    >
                      {c.isActive ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        disabled={!!updating}
                        className={`${styles.btn}`}
                        style={{ fontSize: 12, padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                        onClick={() => handleDelete(c)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
          }
          {!loading && countries.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 32 }}>
                No countries yet. Click "Add Country" to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Modal ── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            {/* Head */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {modal === "create" ? "Add Country" : `Edit — ${form.name}`}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--color-text-muted)", lineHeight: 1 }}><X size={14} strokeWidth={2} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Country flag selector */}
              <FlagDropdown
                selected={form.isoCode}
                onSelect={(code, name) => {
                  setForm(f => ({
                    ...f,
                    isoCode: code,
                    name: f.name || name,
                    continentCode: f.continentCode || "EU",
                  }));
                }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {field("ISO Code (2-letter) *", "isoCode", { maxLength: 2, placeholder: "FR", upper: true })}
                {field("ISO Code 3-letter", "isoCode3", { maxLength: 3, placeholder: "FRA", upper: true })}
              </div>
              <BilingualField
                label="Name" frRequired
                frValue={form.name} frOnChange={v => setForm(f => ({ ...f, name: v }))}
                frPlaceholder="France"
                enValue={nameEn.name ?? ""} enOnChange={v => setNameEn("name", v)}
                enPlaceholder="France"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {field("Phone prefix", "phonePrefix", { placeholder: "+33", maxLength: 10 })}
                {field("Currency (ISO 4217)", "currencyCode", { placeholder: "EUR", maxLength: 3, upper: true })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>Continent</label>
                <select
                  value={form.continentCode}
                  onChange={e => setForm(f => ({ ...f, continentCode: e.target.value }))}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)" }}
                >
                  <option value="">— Select —</option>
                  <option value="EU">Europe (EU)</option>
                  <option value="AF">Africa (AF)</option>
                  <option value="AS">Asia (AS)</option>
                  <option value="NA">North America (NA)</option>
                  <option value="SA">South America (SA)</option>
                  <option value="OC">Oceania (OC)</option>
                  <option value="AN">Antarctica (AN)</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", background: "var(--color-surface)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
                {toggle2("Active (shown in checkout)", "isActive")}
                {toggle2("Shipping enabled", "isShippingEnabled")}
                {toggle2("EU VAT zone", "isEuVat")}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--color-border)" }}>
              <button onClick={() => setModal(null)} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid var(--color-border)", background: "none", cursor: "pointer", fontSize: 14 }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.isoCode.trim() || !form.name.trim()}
                style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: "var(--color-admin-secondary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? .6 : 1 }}
              >
                {saving ? "Saving…" : modal === "create" ? "Add Country" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
