"use client";

import { useState } from "react";
import { useBusinessTz } from "@/contexts/TzContext";
import styles from "./PlatformSettings.module.css";

// Common IANA zones grouped by region for the selector.
const TZ_OPTIONS = [
  { group: "Europe", zones: ["Europe/Paris", "Europe/London", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Zurich", "Europe/Lisbon", "Europe/Warsaw", "Europe/Stockholm", "Europe/Helsinki", "Europe/Moscow"] },
  { group: "Africa", zones: ["Africa/Casablanca", "Africa/Cairo", "Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg", "Africa/Abidjan", "Africa/Tunis", "Africa/Algiers"] },
  { group: "Americas", zones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Vancouver", "America/Sao_Paulo", "America/Mexico_City", "America/Bogota", "America/Lima", "America/Santiago"] },
  { group: "Asia / Pacific", zones: ["Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Asia/Seoul", "Australia/Sydney", "Pacific/Auckland"] },
  { group: "UTC", zones: ["UTC"] },
];

export default function PlatformSettings() {
  const currentTz = useBusinessTz();
  const [selected, setSelected] = useState(currentTz);
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState<"idle" | "saved" | "error">("idle");

  const dirty = selected !== currentTz;

  const now = new Date();
  const preview = now.toLocaleString("en-GB", {
    timeZone: selected,
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/next-api/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: selected }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      // Soft reload to refresh TzProvider (layout re-fetches on next navigation)
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Business timezone</h2>
      <p className={styles.description}>
        All booking times, reminders, and reports are displayed in this timezone.
        Dates are always stored in UTC — changing this only affects display.
      </p>

      <div className={styles.row}>
        <label htmlFor="tz-select" className={styles.label}>Timezone</label>
        <select
          id="tz-select"
          className={styles.select}
          value={selected}
          onChange={e => { setSelected(e.target.value); setStatus("idle"); }}
        >
          {TZ_OPTIONS.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.zones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className={styles.preview}>
        <span className={styles.previewLabel}>Current time in {selected}</span>
        <span className={styles.previewValue}>{preview}</span>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.saveBtn} ${status === "saved" ? styles.saveBtnSaved : status === "error" ? styles.saveBtnError : dirty ? styles.saveBtnDirty : ""}`}
          onClick={handleSave}
          disabled={saving || (!dirty && status !== "error")}
        >
          {saving ? "Saving…" : status === "saved" ? "✓ Saved" : status === "error" ? "Retry" : dirty ? "Save" : "No changes"}
        </button>
        {status === "saved" && (
          <p className={styles.notice}>Reload the page to apply the new timezone everywhere.</p>
        )}
      </div>
    </div>
  );
}
