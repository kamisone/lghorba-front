"use client";

import { useEffect, useState, useCallback } from "react";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "./MarketingAdmin.module.css";

export type AudienceSegment =
  | "all"
  | "fr"
  | "en"
  | "customers"
  | "non_customers"
  | "purchasers"
  | "newsletter_only"
  | "tags";

export interface AudienceDefinition {
  segment: AudienceSegment;
  tags?: string[];
}

const SEGMENT_OPTIONS: { value: AudienceSegment; label: string }[] = [
  { value: "all",             label: "All subscribers" },
  { value: "fr",               label: "French speakers" },
  { value: "en",               label: "English speakers" },
  { value: "customers",        label: "Customers" },
  { value: "non_customers",    label: "Non-customers" },
  { value: "purchasers",       label: "Purchasers (1+ orders)" },
  { value: "newsletter_only",  label: "Newsletter-only (never purchased)" },
  { value: "tags",             label: "Custom tags" },
];

interface Props {
  value: AudienceDefinition;
  onChange: (value: AudienceDefinition) => void;
}

export default function AudienceSelector({ value, onChange }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const fetchCount = useCallback((audience: AudienceDefinition) => {
    setLoading(true);
    fetch("/next-api/admin/newsletter/campaigns/audience-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience }),
    })
      .then(r => r.json())
      .then(d => setCount(typeof d.count === "number" ? d.count : null))
      .catch(() => setCount(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => fetchCount(value), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    const tags = value.tags ?? [];
    if (!tags.includes(tag)) onChange({ ...value, tags: [...tags, tag] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    onChange({ ...value, tags: (value.tags ?? []).filter(t => t !== tag) });
  }

  return (
    <div className={styles.audienceSelector}>
      <select
        className={shopStyles.filterSelect}
        value={value.segment}
        onChange={e => onChange({ segment: e.target.value as AudienceSegment, tags: value.tags })}
        style={{ width: "100%" }}
      >
        {SEGMENT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {value.segment === "tags" && (
        <div className={styles.tagInputRow}>
          <input
            className={shopStyles.filterInput}
            placeholder="Add tag and press Enter…"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            style={{ width: "100%" }}
          />
          <div className={styles.chipRow}>
            {(value.tags ?? []).map(tag => (
              <span key={tag} className={styles.chip}>
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.audienceCount}>
        {loading ? "Calculating…" : count !== null ? `~${count.toLocaleString()} recipients` : "—"}
      </div>
    </div>
  );
}
