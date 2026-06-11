"use client";

import { X } from "lucide-react";
import styles from "@/components/admin/media/MediaLibrary.module.css";
import type { ResolvedProductMediaItem } from "./ProductMediaManager";

interface Props {
  open:     boolean;
  onClose:  () => void;
  /** This product's own gallery images (videos are excluded by the caller) */
  images:   ResolvedProductMediaItem[];
  onSelect: (item: ResolvedProductMediaItem) => void;
  title?:   string;
}

/** Restricted picker for per-product variation-option images — only offers this product's own gallery. */
export default function ProductImagePicker({ open, onClose, images, onSelect, title = "Select image" }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} style={{ maxWidth: 640 }}>
        <div className={styles.modalHeader}>
          <span>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 1, display: "flex" }}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.modalBody}>
          {images.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>No images in this product&apos;s gallery yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Add images via &quot;Product media&quot; first.</div>
            </div>
          ) : (
            <div className={styles.grid}>
              {images.map(item => (
                <div
                  key={item.key}
                  className={styles.gridItem}
                  onClick={() => onSelect(item)}
                  title={item.altText ?? undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.altText ?? ""} className={styles.gridItemImg} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
