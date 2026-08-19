"use client";

import { Lock, Trash2, Plus, ExternalLink } from "lucide-react";
import styles from "./ProductFaqsManager.module.css";

/** An internal reference link (Alibaba/supplier listing, sourcing page, factory
 *  contact, etc.) — admin-only. Never sent to the storefront or any public API. */
export interface ProductPrivateLink {
  id: string;
  label: string;
  url: string;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  links: ProductPrivateLink[];
  onChange: (links: ProductPrivateLink[]) => void;
}

export default function ProductPrivateLinksManager({ links, onChange }: Props) {
  function add() {
    onChange([...links, { id: genId(), label: "", url: "" }]);
  }

  function update(index: number, patch: Partial<ProductPrivateLink>) {
    onChange(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function remove(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p className={styles.hint} style={{ marginTop: 0, marginBottom: 12 }}>
        <Lock size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
        Internal only — supplier pages, sourcing listings, factory contacts. Never shown to customers or on the storefront.
      </p>

      {links.length === 0 && (
        <p className={styles.empty}>No private links yet.</p>
      )}

      <div className={styles.list}>
        {links.map((link, i) => (
          <div key={link.id} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>{link.label?.trim() || `Link ${i + 1}`}</span>
              {link.url?.trim() && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open link"
                  style={{ display: "flex", color: "var(--color-text-muted)" }}
                >
                  <ExternalLink size={14} />
                </a>
              )}
              <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>

            <div className={styles.cardBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Label
                </label>
                <input
                  value={link.label}
                  onChange={e => update(i, { label: e.target.value })}
                  placeholder="e.g. Alibaba supplier"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  URL
                </label>
                <input
                  type="url"
                  value={link.url}
                  onChange={e => update(i, { url: e.target.value })}
                  placeholder="https://www.alibaba.com/product-detail/…"
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-surface)" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addBtn} onClick={add}>
        <Plus size={16} />
        <span>Add link</span>
      </button>
    </div>
  );
}
