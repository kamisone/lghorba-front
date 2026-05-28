"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CreateGuestTokenModal.module.css";
import { X, AlertTriangle, Key } from "lucide-react";

type GuestAction = "open" | "close" | "parking";
type Lang = "fr" | "en";

interface Car {
  id: string;
  name: string;
  immatriculation: string;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const ACTIONS: { key: GuestAction; icon: string; label: string }[] = [
  { key: "open",    icon: "🔓", label: "Unlock" },
  { key: "close",   icon: "🔒", label: "Lock"   },
  { key: "parking", icon: "🅿️", label: "Parking" },
];

function addHours(h: number) {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d.toISOString().slice(0, 16);
}

const PRESETS = [
  { label: "1 h",   hours: 1   },
  { label: "6 h",   hours: 6   },
  { label: "24 h",  hours: 24  },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
];

export default function CreateGuestTokenModal({ onClose, onCreated }: Props) {
  const [cars, setCars]             = useState<Car[]>([]);
  const [carsLoading, setCL]        = useState(true);
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [label, setLabel]           = useState("");
  const [actions, setActions]       = useState<GuestAction[]>(["open"]);
  const [lang, setLang]             = useState<Lang>("fr");
  const [expiry, setExpiry]         = useState(() => addHours(24));
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState("");

  // Success state
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [expiresAt, setExpiresAt]     = useState<string>("");

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Load cars
  useEffect(() => {
    fetch("/next-api/cars")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Car[]) => {
        setCars(data);
        if (data.length > 0) setSelectedCar(data[0].id);
      })
      .finally(() => setCL(false));
  }, []);

  // Escape to close (only while form is open)
  useEffect(() => {
    if (createdLink) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, createdLink]);

  // Focus first field once cars load
  useEffect(() => {
    if (!carsLoading) setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [carsLoading]);

  const toggleAction = (a: GuestAction) => {
    setActions((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar || actions.length === 0) return;
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/next-api/admin/guest-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId:          selectedCar,
          label:          label.trim() || null,
          allowedActions: actions,
          expiresAt:      new Date(expiry).toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/guest-access/${data.rawToken}?lang=${lang}`;
        setCreatedLink(link);
        setExpiresAt(expiry);
        onCreated();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Failed to create guest link.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAgain = () => {
    setCreatedLink(null);
    setLabel("");
    setActions(["open"]);
    setExpiry(addHours(24));
    setLang("fr");
    setCopied(false);
    setError("");
  };

  const selectedCarObj = cars.find((c) => c.id === selectedCar);
  const expiryDisplay = expiresAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt))
    : "";

  return (
    <div className={styles.overlay} onClick={createdLink ? undefined : onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Key size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className={styles.title}>{createdLink ? "Link created" : "New guest link"}</p>
              <p className={styles.subtitle}>
                {createdLink
                  ? "Share this link with your guest"
                  : "Generate a secure, time-limited access link"}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={14} strokeWidth={2} /></button>
        </div>

        {/* ── Success screen ── */}
        {createdLink && (
          <div className={styles.successScreen}>
            <div className={styles.successIcon}>🔗</div>
            <p className={styles.successTitle}>Guest link ready</p>
            <p className={styles.successSub}>
              Copy and share the link below — it works directly in any mobile browser.
            </p>

            <div className={styles.linkBox}>
              <div className={styles.linkLabel}>Shareable URL</div>
              <div className={styles.linkUrl}>{createdLink}</div>
              <div className={styles.linkMeta}>
                {selectedCarObj && (
                  <span className={styles.linkMetaItem}>
                    <span className={styles.linkMetaDot} />
                    {selectedCarObj.name} · {selectedCarObj.immatriculation}
                  </span>
                )}
                <span className={styles.linkMetaItem}>
                  <span className={styles.linkMetaDot} style={{ background: "#94a3b8" }} />
                  Expires {expiryDisplay}
                </span>
                <span className={styles.linkMetaItem}>
                  <span className={styles.linkMetaDot} style={{ background: "#3b82f6" }} />
                  {lang === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </span>
              </div>
            </div>

            <button
              className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
              onClick={handleCopy}
            >
              {copied ? "✓  Copied!" : "Copy link"}
            </button>

            <div className={styles.successFooter}>
              <button className={styles.againBtn} onClick={handleAgain}>Create another</button>
              <button className={styles.doneBtn} onClick={onClose}>Done</button>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {!createdLink && (
          <form onSubmit={handleSubmit}>
            <div className={styles.body}>

              {/* Car selection */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Car</p>
                {carsLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem 0" }}>
                    <span className={styles.btnSpinner} style={{ borderTopColor: "var(--color-admin-secondary)", width: "20px", height: "20px", borderWidth: "2.5px" }} />
                  </div>
                ) : cars.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: 0 }}>No cars found.</p>
                ) : (
                  <div className={styles.carGrid}>
                    {cars.map((c) => {
                      const active = selectedCar === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.carOption} ${active ? styles.carOptionSelected : ""}`}
                          onClick={() => setSelectedCar(c.id)}
                        >
                          <span className={styles.carName}>{c.name}</span>
                          <span className={styles.carImmat}>{c.immatriculation}</span>
                          {active && <span className={styles.carCheck}>✓ Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Label + expiry */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Link details</p>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Label <span className={styles.optional}>optional</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    className={styles.input}
                    placeholder="e.g. Delivery — 15 May"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Expires at</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                  <div className={styles.presets}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className={styles.presetBtn}
                        onClick={() => setExpiry(addHours(p.hours))}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions + language */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Access settings</p>

                <div className={styles.field}>
                  <label className={styles.label}>Allowed actions</label>
                  <div className={styles.actionGrid}>
                    {ACTIONS.map((a) => {
                      const active = actions.includes(a.key);
                      return (
                        <button
                          key={a.key}
                          type="button"
                          className={`${styles.actionPill} ${active ? styles.actionPillActive : ""}`}
                          onClick={() => toggleAction(a.key)}
                        >
                          <span className={styles.pillIcon}>{a.icon}</span>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                  {actions.length === 0 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--color-error-light)", margin: "0.1rem 0 0" }}>
                      Select at least one action.
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Guest language</label>
                  <div className={styles.langToggle}>
                    <button
                      type="button"
                      className={`${styles.langBtn} ${lang === "fr" ? styles.langBtnActive : ""}`}
                      onClick={() => setLang("fr")}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      type="button"
                      className={`${styles.langBtn} ${lang === "en" ? styles.langBtnActive : ""}`}
                      onClick={() => setLang("en")}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className={styles.errorBanner}>
                  <AlertTriangle size={16} strokeWidth={1.75} /> {error}
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={creating || !selectedCar || actions.length === 0}
              >
                {creating && <span className={styles.btnSpinner} />}
                {creating ? "Creating…" : "Create link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
