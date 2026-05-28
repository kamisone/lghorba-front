"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Media.module.css";
import { X } from "lucide-react";

interface Asset {
  id:               string;
  storageKey:       string;
  originalFilename: string;
  mimeType:         string;
  sizeBytes:        number;
  width:            number | null;
  height:           number | null;
  altText:          string | null;
  tags:             string[];
  usageCount:       number;
  url:              string;
  createdAt:        string;
}

interface UsageRecord {
  id: string; entityType: string; entityId: string; field: string; createdAt: string;
}

function fmt(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const LIMIT = 48;

export default function MediaLibraryPage() {
  const [assets, setAssets]         = useState<Asset[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const [offset, setOffset]         = useState(0);
  const [selected, setSelected]     = useState<Asset | null>(null);
  const [usage, setUsage]           = useState<UsageRecord[]>([]);
  const [altText, setAltText]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (search)     params.set("search", search);
    if (mimeFilter) params.set("mimeType", mimeFilter);
    fetch(`/next-api/admin/media?${params}`)
      .then(r => r.json())
      .then(d => { setAssets(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [search, mimeFilter, offset]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(asset: Asset) {
    setSelected(asset);
    setAltText(asset.altText ?? "");
    const data = await fetch(`/next-api/admin/media/${asset.id}/usage`).then(r => r.json());
    setUsage(Array.isArray(data) ? data : []);
  }

  async function saveAlt() {
    if (!selected) return;
    setSaving(true);
    const updated = await fetch(`/next-api/admin/media/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ altText }),
    }).then(r => r.json());
    setSelected({ ...selected, ...updated });
    setAssets(prev => prev.map(a => a.id === selected.id ? { ...a, altText } : a));
    setSaving(false);
  }

  async function deleteAsset() {
    if (!selected || !confirm(`Delete "${selected.originalFilename}"? This cannot be undone.`)) return;
    await fetch(`/next-api/admin/media/${selected.id}`, { method: "DELETE" });
    setSelected(null);
    load();
  }

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    const all = Array.from(files);
    for (let i = 0; i < all.length; i++) {
      setUploadPct(Math.round((i / all.length) * 100));
      const form = new FormData();
      form.append("file", all[i]);
      await fetch("/next-api/admin/media/upload", { method: "POST", body: form });
    }
    setUploadPct(100);
    setUploading(false);
    setUploadPct(0);
    setOffset(0);
    load();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function copyKey() {
    if (selected) navigator.clipboard.writeText(selected.storageKey);
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Media Library</h1>
          <span className={styles.subtitle}>{total} assets</span>
        </div>
        <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
          ↑ Upload Images
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {/* ── Upload zone ── */}
      <div
        className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneActive : ""}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={styles.uploadZoneTitle}>
          {uploading ? `Uploading… ${uploadPct}%` : "Drag & drop images here to upload"}
        </div>
        <div className={styles.uploadZoneSub}>JPEG, PNG, WebP, AVIF, GIF, SVG — max 20 MB per file · deduplication enabled</div>
      </div>

      {uploading && (
        <div className={styles.uploadProgress}>
          <div className={styles.uploadProgressBar} style={{ width: `${uploadPct}%` }} />
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search by filename…"
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={mimeFilter}
          onChange={e => { setMimeFilter(e.target.value); setOffset(0); }}
        >
          <option value="">All types</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
          <option value="image/avif">AVIF</option>
          <option value="image/gif">GIF</option>
          <option value="image/svg+xml">SVG</option>
        </select>
        <div className={styles.toolbarRight}>{total} assets</div>
      </div>

      {/* ── Asset grid ── */}
      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 24 }, (_, i) => <div key={i} className={styles.skeleton} />)
          : assets.length === 0
          ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🖼</span>
                <span className={styles.emptyText}>No assets found</span>
                <span className={styles.emptyHint}>Upload your first image using the button above</span>
              </div>
            )
          : assets.map(a => (
              <div
                key={a.id}
                className={`${styles.gridItem} ${selected?.id === a.id ? styles.gridItemSelected : ""}`}
                onClick={() => selected?.id === a.id ? setSelected(null) : openDetail(a)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.altText ?? a.originalFilename} className={styles.gridItemImg} loading="lazy" />
                {a.usageCount > 0 && <div className={styles.gridItemUsage}>{a.usageCount}</div>}
                <div className={styles.gridItemMeta}>
                  <div className={styles.gridItemName}>{a.originalFilename}</div>
                  <div className={styles.gridItemSize}>
                    {fmt(a.sizeBytes)}{a.width ? ` · ${a.width}×${a.height}` : ""}
                  </div>
                </div>
              </div>
            ))
        }
      </div>

      {/* ── Pagination ── */}
      {!loading && total > LIMIT && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>
            ← Previous
          </button>
          <span className={styles.pageInfo}>
            {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
          </span>
          <button className={styles.pageBtn} disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)}>
            Next →
          </button>
        </div>
      )}

      {/* ── Detail panel ── */}
      {selected && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHead}>
            <span className={styles.detailHeadTitle}>Asset Details</span>
            <button className={styles.detailClose} onClick={() => setSelected(null)}><X size={14} strokeWidth={2} /></button>
          </div>

          <div className={styles.detailBody}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={selected.altText ?? ""} className={styles.detailImg} />

            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Filename</div>
              <div className={styles.detailValue}>{selected.originalFilename}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Type</div>
              <div className={styles.detailValue}>{selected.mimeType}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Size</div>
              <div className={styles.detailValue}>{fmt(selected.sizeBytes)}</div>
            </div>
            {selected.width && (
              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Dimensions</div>
                <div className={styles.detailValue}>{selected.width} × {selected.height} px</div>
              </div>
            )}
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Uploaded</div>
              <div className={styles.detailValue}>{new Date(selected.createdAt).toLocaleDateString("en-GB")}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Storage key</div>
              <div className={`${styles.detailValue} ${styles.detailValueMono}`}>
                {selected.storageKey}
                <button className={styles.copyBtn} onClick={copyKey}>Copy</button>
              </div>
            </div>

            {/* Alt text editor */}
            <div className={styles.detailRow} style={{ marginTop: 16 }}>
              <div className={styles.detailLabel}>Alt Text</div>
              <textarea
                className={styles.altTextarea}
                value={altText}
                onChange={e => setAltText(e.target.value)}
                rows={2}
                placeholder="Describe the image for accessibility and SEO"
              />
              <button className={styles.saveAltBtn} onClick={saveAlt} disabled={saving}>
                {saving ? "Saving…" : "Save Alt Text"}
              </button>
            </div>

            {/* Usage */}
            {usage.length > 0 && (
              <>
                <div className={styles.usageTitle}>Used by ({usage.length})</div>
                {usage.map(u => (
                  <div key={u.id} className={styles.usageItem}>
                    <span className={styles.usageEntity}>{u.entityType}</span>
                    {" · "}{u.field}
                    <span className={styles.usageId}>{u.entityId.slice(0, 8)}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className={styles.detailFoot}>
            <button className={styles.deleteBtn} onClick={deleteAsset}>Delete Asset</button>
          </div>
        </div>
      )}
    </div>
  );
}
