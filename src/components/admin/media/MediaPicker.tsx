"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./MediaLibrary.module.css";
import { X, Check, Folder, FolderOpen, ChevronRight, Play } from "lucide-react";

export interface MediaAsset {
  id:               string;
  storageKey:       string;
  originalFilename: string;
  mimeType:         string;
  mediaType:        "image" | "video" | "other";
  sizeBytes:        number;
  width:            number | null;
  height:           number | null;
  durationSeconds:  number | null;
  altText:          string | null;
  usageCount:       number;
  url:              string;
  createdAt:        string;
}

/** Formats a duration in seconds as "m:ss" (or "h:mm:ss" for videos over an hour). */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

interface FolderItem {
  id:         string;
  name:       string;
  parentId:   string | null;
  assetCount: number;
}

interface Props {
  open:              boolean;
  onClose:           () => void;
  /** Single-select mode callback */
  onSelect?:         (asset: MediaAsset) => void;
  /** Multi-select mode — pass alongside multi={true} */
  onSelectMulti?:    (assets: MediaAsset[]) => void;
  multi?:            boolean;
  title?:            string;
  /** If set, pre-marks the asset with this storageKey as selected (single mode only) */
  currentKey?:       string;
  /** Restrict the picker (filter + uploads) to a single media type. Default: both images and videos. */
  mediaType?:        "image" | "video";
}

function fmt(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function buildBreadcrumb(folders: FolderItem[], folderId: string | null): FolderItem[] {
  if (!folderId) return [];
  const f = folders.find(x => x.id === folderId);
  if (!f) return [];
  return [...buildBreadcrumb(folders, f.parentId), f];
}

export default function MediaPicker({ open, onClose, onSelect, onSelectMulti, multi = false, title = "Select Media", currentKey, mediaType }: Props) {
  const [assets, setAssets]               = useState<MediaAsset[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(false);
  const [search, setSearch]               = useState("");
  const [typeFilter, setTypeFilter]       = useState<"" | "image" | "video">(mediaType ?? "");
  const [offset, setOffset]               = useState(0);
  const [selected, setSelected]           = useState<MediaAsset | null>(null);   // single mode
  const [pickedAssets, setPickedAssets]   = useState<MediaAsset[]>([]);          // multi mode
  const [uploading, setUploading]         = useState(false);
  const [dragOver, setDragOver]           = useState(false);

  const [folders, setFolders]             = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 48;

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    const data = await fetch("/next-api/admin/media/folders").then(r => r.json()).catch(() => []);
    setFolders(Array.isArray(data) ? data : []);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search)     params.set("search", search);
    if (typeFilter) params.set("mediaType", typeFilter);
    params.set("folderId", currentFolderId ?? ""); // "" = unfiled (root), uuid = folder
    fetch(`/next-api/admin/media?${params}`)
      .then(r => r.json())
      .then(d => { setAssets(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [search, typeFilter, offset, currentFolderId]);

  useEffect(() => { if (open) { load(); loadFolders(); } }, [open, load, loadFolders]);

  // Reset state when the picker opens
  useEffect(() => {
    if (open) { setSelected(null); setPickedAssets([]); setOffset(0); setSearch(""); setCurrentFolderId(null); setTypeFilter(mediaType ?? ""); }
  }, [open, mediaType]);

  // ── Navigation ────────────────────────────────────────────────────────────

  function navigateTo(folderId: string | null) {
    setCurrentFolderId(folderId);
    setOffset(0);
    setSelected(null);
    // pickedAssets intentionally NOT reset — selection persists while browsing folders
  }

  function togglePicked(asset: MediaAsset) {
    setPickedAssets(prev =>
      prev.some(a => a.id === asset.id)
        ? prev.filter(a => a.id !== asset.id)
        : [...prev, asset]
    );
  }

  const breadcrumb  = buildBreadcrumb(folders, currentFolderId);
  const gridFolders = currentFolderId === null
    ? folders.filter(f => f.parentId === null)
    : folders.filter(f => f.parentId === currentFolderId);

  // ── Upload ────────────────────────────────────────────────────────────────

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      if (currentFolderId) form.append("folderId", currentFolderId);
      await fetch("/next-api/admin/media/upload", { method: "POST", body: form });
    }
    setUploading(false);
    load();
    loadFolders();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function confirm() {
    if (multi) {
      if (pickedAssets.length && onSelectMulti) { onSelectMulti(pickedAssets); onClose(); }
    } else {
      if (selected && onSelect) { onSelect(selected); onClose(); }
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <span>{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {multi && pickedAssets.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", padding: "3px 10px", borderRadius: 20 }}>
                {pickedAssets.length} selected
              </span>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 1, display: "flex" }}
              aria-label="Close"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
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
            <div className={styles.uploadZoneTitle}>
              {uploading ? "Uploading…" : `Drop ${mediaType === "video" ? "videos" : mediaType === "image" ? "images" : "media"} here or click to upload`}
              {currentFolderId && !uploading && (
                <span style={{ color: "#1d4ed8", fontWeight: 500 }}>
                  {" · "}into <strong>{folders.find(f => f.id === currentFolderId)?.name}</strong>
                </span>
              )}
            </div>
            <div className={styles.uploadZoneSub}>
              {mediaType === "video"
                ? "MP4, WebM — max 200 MB"
                : mediaType === "image"
                ? "JPEG, PNG, WebP, AVIF, GIF, SVG — max 20 MB"
                : "JPEG, PNG, WebP, AVIF, GIF, SVG, MP4, WebM — images ≤20MB, videos ≤200MB"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.uploadZoneInput}
              accept={mediaType === "video" ? "video/mp4,video/webm" : mediaType === "image" ? "image/*" : "image/*,video/mp4,video/webm"}
              multiple
              onChange={e => e.target.files && uploadFiles(e.target.files)}
            />
          </div>

          {/* Breadcrumb + search row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
              <button className={styles.breadcrumbBtn} onClick={() => navigateTo(null)}>
                <FolderOpen size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                All Media
              </button>
              {breadcrumb.map((f, i) => (
                <span key={f.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <ChevronRight size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
                  {i < breadcrumb.length - 1 ? (
                    <button className={styles.breadcrumbBtn} onClick={() => navigateTo(f.id)}>
                      {f.name}
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", padding: "3px 6px" }}>
                      {f.name}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Type filter — hidden when the picker is restricted to a single media type */}
            {!mediaType && (
              <div className={styles.typeFilter}>
                {(["", "image", "video"] as const).map(t => (
                  <button
                    key={t || "all"}
                    className={`${styles.typeFilterBtn} ${typeFilter === t ? styles.typeFilterBtnActive : ""}`}
                    onClick={() => { setTypeFilter(t); setOffset(0); }}
                  >
                    {t === "" ? "All" : t === "image" ? "Images" : "Videos"}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <input
              style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13.5, width: 220, flexShrink: 0 }}
              placeholder="Search by filename…"
              value={search}
              onChange={e => { setSearch(e.target.value); setOffset(0); }}
            />
            <span style={{ color: "#9ca3af", fontSize: 13, whiteSpace: "nowrap" }}>{total} assets</span>
          </div>

          {/* Grid: folder cards + asset cards */}
          <div className={styles.grid}>

            {/* Folder cards */}
            {gridFolders.map(folder => (
              <div
                key={folder.id}
                className={styles.folderCard}
                onClick={() => navigateTo(folder.id)}
                title={folder.name}
              >
                <div className={styles.folderCardIcon}>
                  <Folder size={30} strokeWidth={1.5} />
                </div>
                <div className={styles.folderCardName}>{folder.name}</div>
                <div className={styles.folderCardCount}>
                  {folder.assetCount} item{folder.assetCount !== 1 ? "s" : ""}
                </div>
              </div>
            ))}

            {/* Asset cards */}
            {loading
              ? Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className={`${styles.gridItem} ${styles.skeleton}`} style={{ aspectRatio: "1", minHeight: 160 }} />
                ))
              : assets.length === 0 && gridFolders.length === 0
              ? (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖼</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    No media{currentFolderId ? " in this folder" : " yet"}
                  </div>
                </div>
              )
              : assets.map(a => {
                  const isPicked   = pickedAssets.some(p => p.id === a.id);
                  const isSelected = selected?.id === a.id;
                  const isCurrent  = a.storageKey === currentKey;
                  const active     = multi ? isPicked : isSelected;
                  return (
                    <div
                      key={a.id}
                      className={`${styles.gridItem} ${active ? styles.gridItemSelected : ""}`}
                      onClick={() => multi ? togglePicked(a) : setSelected(isSelected ? null : a)}
                    >
                      {a.mediaType === "video" ? (
                        <div className={styles.videoThumb}>
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <video src={a.url} className={styles.gridItemImg} muted preload="metadata" />
                          <div className={styles.playIconOverlay}><span><Play size={16} fill="#fff" /></span></div>
                          {a.durationSeconds != null && <div className={styles.durationBadge}>{formatDuration(a.durationSeconds)}</div>}
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.altText ?? a.originalFilename} className={styles.gridItemImg} loading="lazy" />
                      )}
                      {a.usageCount > 0 && <div className={styles.gridItemUsage}>{a.usageCount} uses</div>}

                      {/* Multi-mode: show hover circle when unpicked, filled circle when picked */}
                      {multi && !isPicked && <div className={styles.pickerCheckbox} />}
                      {(active || (isCurrent && !active)) && (
                        <div className={styles.gridItemCheck} style={isCurrent && !active ? { background: "#059669" } : undefined}>
                          <Check size={14} strokeWidth={2} />
                        </div>
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
          {!loading && total > limit && (
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

        {/* Footer */}
        <div className={styles.modalFooter}>
          {multi && pickedAssets.length > 0 && (
            <button
              onClick={() => setPickedAssets([])}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 13, fontWeight: 500, marginRight: "auto" }}
            >Clear selection</button>
          )}
          <button
            onClick={onClose}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >Cancel</button>
          <button
            onClick={confirm}
            disabled={multi ? pickedAssets.length === 0 : !selected}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 500,
              cursor: (multi ? pickedAssets.length > 0 : !!selected) ? "pointer" : "not-allowed",
              background: (multi ? pickedAssets.length > 0 : !!selected) ? "#1d4ed8" : "#e5e7eb",
              color:      (multi ? pickedAssets.length > 0 : !!selected) ? "#fff"    : "#9ca3af",
            }}
          >
            {multi
              ? pickedAssets.length > 0 ? `Add ${pickedAssets.length} Item${pickedAssets.length > 1 ? "s" : ""}` : "Select Media"
              : "Use Selected"}
          </button>
        </div>

      </div>
    </div>
  );
}
