"use client";

import { useEffect, useState } from "react";
import styles from "./MetaPixelSettings.module.css";

const PIXEL_ID_RE = /^\d{10,20}$/;

interface PlatformConfig {
  metaPixel: { pixelId: string | null; enabled: boolean };
}

export default function MetaPixelSettings() {
  const [pixelId,  setPixelId]  = useState("");
  const [enabled,  setEnabled]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState<"idle" | "saved" | "error">("idle");
  const [capiConfigured, setCapiConfigured] = useState<boolean | null>(null);

  const [initial, setInitial] = useState({ pixelId: "", enabled: false });

  useEffect(() => {
    fetch("/next-api/settings/platform")
      .then(r => r.ok ? r.json() as Promise<PlatformConfig> : null)
      .then(data => {
        if (!data) return;
        setPixelId(data.metaPixel.pixelId ?? "");
        setEnabled(data.metaPixel.enabled);
        setInitial({ pixelId: data.metaPixel.pixelId ?? "", enabled: data.metaPixel.enabled });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch("/next-api/admin/marketing/pixel/capi-status")
      .then(r => r.ok ? r.json() as Promise<{ configured: boolean }> : null)
      .then(data => setCapiConfigured(data?.configured ?? false))
      .catch(() => setCapiConfigured(false));
  }, []);

  const trimmedId = pixelId.trim();
  const idValid = PIXEL_ID_RE.test(trimmedId);
  const dirty = trimmedId !== initial.pixelId || enabled !== initial.enabled;

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/next-api/admin/marketing/pixel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixelId: trimmedId || null, enabled }),
      });
      if (!res.ok) throw new Error();
      setInitial({ pixelId: trimmedId, enabled });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Meta Pixel</h2>
      <p className={styles.description}>
        Tracks shop activity (page views, product views, cart, checkout, purchases)
        for Meta Ads Manager audiences and bidding optimization. Only fires after a
        visitor accepts marketing cookies.
      </p>

      <div className={styles.row}>
        <label htmlFor="pixel-id" className={styles.label}>Pixel ID</label>
        <input
          id="pixel-id"
          className={`${styles.input} ${trimmedId && !idValid ? styles.inputError : ""}`}
          value={pixelId}
          onChange={e => { setPixelId(e.target.value); setStatus("idle"); }}
          placeholder="e.g. 1234567890123456"
        />
        {trimmedId && !idValid && (
          <p className={styles.fieldError}>Pixel ID must be 10–20 digits.</p>
        )}
        <p className={styles.fieldHint}>
          Find it in Meta Events Manager → Data Sources → your Pixel → Settings.
          This ID is not secret — it's safe to appear in your site's page source.
        </p>
      </div>

      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`}
          onClick={() => { setEnabled(e => !e); setStatus("idle"); }}
          disabled={!idValid && !enabled}
          aria-pressed={enabled}
          aria-label={enabled ? "Disable Meta Pixel" : "Enable Meta Pixel"}
        >
          <span className={styles.thumb} />
        </button>
        <span className={styles.toggleLabel}>{enabled ? "Enabled" : "Disabled"}</span>
      </div>

      <div className={styles.statusBlock}>
        <span className={styles.statusLabel}>Conversions API (server-side Purchase tracking)</span>
        {capiConfigured === null ? (
          <span className={styles.statusPill}>Checking…</span>
        ) : capiConfigured ? (
          <span className={`${styles.statusPill} ${styles.statusPillOn}`}>● Configured</span>
        ) : (
          <span className={`${styles.statusPill} ${styles.statusPillOff}`}>○ Not configured</span>
        )}
        <p className={styles.statusHint}>
          {capiConfigured
            ? "Purchase events are also sent server-side and deduplicated with the browser pixel."
            : "Set META_CAPI_ACCESS_TOKEN in the server environment to enable server-side Purchase tracking — ask an engineer, this isn't editable here since it's a credential, not a setting."}
        </p>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.saveBtn} ${status === "saved" ? styles.saveBtnSaved : status === "error" ? styles.saveBtnError : dirty ? styles.saveBtnDirty : ""}`}
          onClick={handleSave}
          disabled={saving || (!dirty && status !== "error") || (enabled && !idValid)}
        >
          {saving ? "Saving…" : status === "saved" ? "✓ Saved" : status === "error" ? "Retry" : dirty ? "Save" : "No changes"}
        </button>
        {status === "saved" && (
          <p className={styles.notice}>Live on the shop within a minute (60s cache).</p>
        )}
      </div>
    </div>
  );
}
