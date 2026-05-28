"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./MediaLibrary.module.css";
import { X, Check } from "lucide-react";

export interface MediaAsset {
  id:               string;
  storageKey:       string;
  originalFilename: string;
  mimeType:         string;
  sizeBytes:        number;
  width:            number | null;
  height:           number | null;
  altText:          string | null;
  usageCount:       number;
  url:              string;
  createdAt:        string;
}

interface Props {
  open:       boolean;
  onClose:    () => void;
  onSelect:   (asset: MediaAsset) => void;
  title?:     string;
  /** If set, pre-marks the asset with this storageKey as selected */
  currentKey?: string;
}

function fmt(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaPicker({ open, onClose, onSelect, title = "Select Media", currentKey }: Props) {
  const [assets, setAssets]       = useState<MediaAsset[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [offset, setOffset]       = useState(0);
  const [selected, setSelected]   = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 48;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.set("search", search);
    fetch(`/next-api/admin/media?${params}`)
      .then(r => r.json())
      .then(d => { setAssets(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [search, offset]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Reset on open
  useEffect(() => {
    if (open) { setSelected(null); setOffset(0); setSearch(""); }
  }, [open]);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      await fetch("/next-api/admin/media/upload", { method: "POST", body: form });
    }
    setUploading(false);
    load();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function confirm() {
    if (selected) { onSelect(selected); onClose(); }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1 }}
            aria-label="Close"
          ><X size={14} strokeWidth={2} /></button>
        </div>

        <div className={styles.modalBody}>
          {/* Upload zone */}
          <div
            className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneActive : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.uploadZoneIcon}>☁️</div>
            <div className={styles.uploadZoneTitle}>{uploading ? "Uploading…" : "Drop images here or click to upload"}</div>
            <div className={styles.uploadZoneSub}>JPEG, PNG, WebP, AVIF — max 20 MB</div>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.uploadZoneInput}
              accept="image/*"
              multiple
              onChange={e => e.target.files && uploadFiles(e.target.files)}
            />
          </div>

          {/* Search */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
              placeholder="Search by filename…"
              value={search}
              onChange={e => { setSearch(e.target.value); setOffset(0); }}
            />
            <span style={{ color: "#9ca3af", fontSize: 14, lineHeight: "36px" }}>{total} assets</span>
          </div>

          {/* Grid */}
          <div className={styles.grid}>
            {loading
              ? Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className={`${styles.gridItem} ${styles.skeleton}`} style={{ aspectRatio: "1", minHeight: 160 }} />
                ))
              : assets.map(a => {
                  const isSelected  = selected?.id === a.id;
                  const isCurrent   = a.storageKey === currentKey;
                  return (
                    <div
                      key={a.id}
                      className={`${styles.gridItem} ${isSelected ? styles.gridItemSelected : ""}`}
                      onClick={() => setSelected(isSelected ? null : a)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.altText ?? a.originalFilename} className={styles.gridItemImg} loading="lazy" />
                      {a.usageCount > 0 && <div className={styles.gridItemUsage}>{a.usageCount} uses</div>}
                      {isSelected && <div className={styles.gridItemCheck}><Check size={14} strokeWidth={2} /></div>}
                      {isCurrent && !isSelected && (
                        <div className={styles.gridItemCheck} style={{ background: "#059669" }}><Check size={14} strokeWidth={2} /></div>
                      )}
                      <div className={styles.gridItemMeta}>
                        <div className={styles.gridItemName}>{a.originalFilename}</div>
                        <div className={styles.gridItemSize}>{fmt(a.sizeBytes)}{a.width ? ` · ${a.width}×${a.height}` : ""}</div>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              <button
                disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - limit))}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", background: "#fff" }}
              >Previous</button>
              <span style={{ lineHeight: "34px", fontSize: 13, color: "#6b7280" }}>
                {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(o => o + limit)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", background: "#fff" }}
              >Next</button>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >Cancel</button>
          <button
            onClick={confirm}
            disabled={!selected}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 500, cursor: selected ? "pointer" : "not-allowed",
              background: selected ? "#1d4ed8" : "#e5e7eb", color: selected ? "#fff" : "#9ca3af",
            }}
          >Use Selected</button>
        </div>
      </div>
    </div>
  );
}
