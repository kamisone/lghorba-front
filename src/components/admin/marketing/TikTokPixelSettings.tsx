"use client";

import { useEffect, useState } from "react";
import styles from "./MetaPixelSettings.module.css";

const PIXEL_ID_RE = /^[A-Z0-9]{10,32}$/i;

interface PlatformConfig {
  tiktokPixel: { pixelId: string | null; enabled: boolean };
}

export default function TikTokPixelSettings() {
  const [pixelId,  setPixelId]  = useState("");
  const [enabled,  setEnabled]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState<"idle" | "saved" | "error">("idle");
  const [eventsApiConfigured, setEventsApiConfigured] = useState<boolean | null>(null);

  const [initial, setInitial] = useState({ pixelId: "", enabled: false });

  useEffect(() => {
    fetch("/next-api/settings/platform")
      .then(r => r.ok ? r.json() as Promise<PlatformConfig> : null)
      .then(data => {
        if (!data) return;
        setPixelId(data.tiktokPixel.pixelId ?? "");
        setEnabled(data.tiktokPixel.enabled);
        setInitial({ pixelId: data.tiktokPixel.pixelId ?? "", enabled: data.tiktokPixel.enabled });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch("/next-api/admin/marketing/tiktok-pixel/events-api-status")
      .then(r => r.ok ? r.json() as Promise<{ configured: boolean }> : null)
      .then(data => setEventsApiConfigured(data?.configured ?? false))
      .catch(() => setEventsApiConfigured(false));
  }, []);

  const trimmedId = pixelId.trim();
  const idValid = PIXEL_ID_RE.test(trimmedId);
  const dirty = trimmedId !== initial.pixelId || enabled !== initial.enabled;

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/next-api/admin/marketing/tiktok-pixel", {
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
      <h2 className={styles.title}>TikTok Pixel</h2>
      <p className={styles.description}>
        Tracks shop activity (page views, product views, cart, checkout, purchases)
        for TikTok Ads Manager audiences and bidding optimization. Only fires after a
        visitor accepts marketing cookies.
      </p>

      <div className={styles.row}>
        <label htmlFor="tiktok-pixel-id" className={styles.label}>Pixel Code</label>
        <input
          id="tiktok-pixel-id"
          className={`${styles.input} ${trimmedId && !idValid ? styles.inputError : ""}`}
          value={pixelId}
          onChange={e => { setPixelId(e.target.value); setStatus("idle"); }}
          placeholder="e.g. DA3FPARC77U2K1LUCIV0"
        />
        {trimmedId && !idValid && (
          <p className={styles.fieldError}>Pixel Code must be 10–32 letters/digits.</p>
        )}
        <p className={styles.fieldHint}>
          Find it in TikTok Events Manager → your Pixel → Pixel code.
          This code is not secret — it's safe to appear in your site's page source.
        </p>
      </div>

      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`}
          onClick={() => { setEnabled(e => !e); setStatus("idle"); }}
          disabled={!idValid && !enabled}
          aria-pressed={enabled}
          aria-label={enabled ? "Disable TikTok Pixel" : "Enable TikTok Pixel"}
        >
          <span className={styles.thumb} />
        </button>
        <span className={styles.toggleLabel}>{enabled ? "Enabled" : "Disabled"}</span>
      </div>

      <div className={styles.statusBlock}>
        <span className={styles.statusLabel}>Events API (server-side Purchase tracking)</span>
        {eventsApiConfigured === null ? (
          <span className={styles.statusPill}>Checking…</span>
        ) : eventsApiConfigured ? (
          <span className={`${styles.statusPill} ${styles.statusPillOn}`}>● Configured</span>
        ) : (
          <span className={`${styles.statusPill} ${styles.statusPillOff}`}>○ Not configured</span>
        )}
        <p className={styles.statusHint}>
          {eventsApiConfigured
            ? "Purchase events are also sent server-side and deduplicated with the browser pixel."
            : "Set TIKTOK_EVENTS_API_ACCESS_TOKEN in the server environment to enable server-side Purchase tracking — ask an engineer, this isn't editable here since it's a credential, not a setting."}
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
