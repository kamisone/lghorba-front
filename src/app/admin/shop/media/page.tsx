"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import shopStyles from "@/components/admin/shop/ShopAdmin.module.css";
import styles from "@/components/admin/media/MediaLibrary.module.css";

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
  id:         string;
  entityType: string;
  entityId:   string;
  field:      string;
  createdAt:  string;
}

function fmt(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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
  const limit = 48;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search)     params.set("search",   search);
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
    setAssets(prev => prev.map(a => (a.id === selected.id ? { ...a, altText } : a)));
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
      setUploadPct(Math.round(((i) / all.length) * 100));
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
    <div className={shopStyles.container} style={{ maxWidth: 1400 }}>
      <div className={shopStyles.header}>
        <div>
          <h1 className={shopStyles.title}>Media Library</h1>
          <span className={shopStyles.subtitle}>{total} assets</span>
        </div>
        <button
          className={`${shopStyles.btn} ${shopStyles.btnPrimary}`}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Images
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

      {/* Upload zone */}
      <div
        className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneActive : ""}`}
        style={{ padding: "28px 24px" }}
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

      {/* Filters */}
      <div className={shopStyles.filters}>
        <input
          className={shopStyles.filterInput}
          style={{ flex: 1 }}
          placeholder="Search by filename…"
          value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0); }}
        />
        <select className={shopStyles.filterSelect} value={mimeFilter} onChange={e => { setMimeFilter(e.target.value); setOffset(0); }}>
          <option value="">All types</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
          <option value="image/avif">AVIF</option>
          <option value="image/gif">GIF</option>
          <option value="image/svg+xml">SVG</option>
        </select>
      </div>

      {/* Asset grid */}
      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 24 }, (_, i) => (
              <div key={i} className={`${styles.gridItem} ${styles.skeleton}`} style={{ minHeight: 180 }} />
            ))
          : assets.length === 0
          ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
                No assets found. Upload your first image above.
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
                    {fmt(a.sizeBytes)}
                    {a.width ? ` · ${a.width}×${a.height}` : ""}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Pagination */}
      {!loading && total > limit && (
        <div className={shopStyles.pagination}>
          <button className={shopStyles.btn} disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Previous</button>
          <span>{Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}</span>
          <button className={shopStyles.btn} disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Next</button>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <span>Asset Details</span>
            <button
              onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af" }}
            >✕</button>
          </div>
          <div className={styles.detailPanelBody}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={selected.altText ?? ""} className={styles.detailPanelImg} />

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
              <div className={styles.detailLabel}>Storage key</div>
              <div className={styles.detailValue} style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
                {selected.storageKey}
                <button
                  onClick={copyKey}
                  style={{ marginLeft: 6, padding: "1px 6px", fontSize: 10, borderRadius: 4, border: "1px solid #d1d5db", cursor: "pointer", background: "#f9fafb" }}
                >Copy</button>
              </div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Uploaded</div>
              <div className={styles.detailValue}>{new Date(selected.createdAt).toLocaleDateString("en-GB")}</div>
            </div>

            {/* Alt text editor */}
            <div className={styles.detailRow} style={{ marginTop: 16 }}>
              <div className={styles.detailLabel}>Alt Text</div>
              <textarea
                value={altText}
                onChange={e => setAltText(e.target.value)}
                rows={2}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
                placeholder="Describe the image for accessibility and SEO"
              />
              <button
                className={`${shopStyles.btn} ${shopStyles.btnPrimary}`}
                style={{ marginTop: 6, width: "100%" }}
                onClick={saveAlt}
                disabled={saving}
              >{saving ? "Saving…" : "Save Alt Text"}</button>
            </div>

            {/* Usage */}
            {usage.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className={styles.detailLabel} style={{ marginBottom: 8 }}>Used by ({usage.length})</div>
                {usage.map(u => (
                  <div key={u.id} style={{ fontSize: 12, color: "#6b7280", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontWeight: 500, color: "#374151" }}>{u.entityType}</span>
                    {" · "}{u.field}
                    <span style={{ color: "#9ca3af", marginLeft: 4, fontFamily: "monospace", fontSize: 10 }}>{u.entityId.slice(0, 8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.detailActions}>
            <button
              className={`${shopStyles.btn} ${shopStyles.btnDanger}`}
              onClick={deleteAsset}
            >Delete Asset</button>
          </div>
        </div>
      )}
    </div>
  );
}
