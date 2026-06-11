"use client";

import { useState } from "react";
import MediaPicker, { MediaAsset, formatDuration } from "@/components/admin/media/MediaPicker";
import { GripVertical, Star, X, Play, ImagePlus } from "lucide-react";
import styles from "./ProductMediaManager.module.css";

/** A single media asset attached to a product (image or video). Order = gallery order. */
export interface ProductMediaItem {
  key:         string;
  type:        "image" | "video";
  /** Optional poster/thumbnail image key — videos only */
  posterKey?:  string | null;
  altText?:    string | null;
  /** At most one item across the array should be true */
  isFeatured?: boolean;
}

/** ProductMediaItem with resolved URLs + asset metadata, as returned by the API */
export interface ResolvedProductMediaItem extends ProductMediaItem {
  url:              string;
  posterUrl:        string | null;
  durationSeconds?: number | null;
  mimeType?:        string | null;
}

interface Props {
  initialMedia: ResolvedProductMediaItem[];
  onChange:     (media: ProductMediaItem[]) => void;
  /** Mirrors onChange but keeps resolved URLs — for callers that need to display these images elsewhere. */
  onResolvedChange?: (media: ResolvedProductMediaItem[]) => void;
  maxItems?:    number;
  label?:       string;
}

function strip(item: ResolvedProductMediaItem): ProductMediaItem {
  return {
    key:        item.key,
    type:       item.type,
    posterKey:  item.posterKey ?? null,
    altText:    item.altText ?? null,
    isFeatured: !!item.isFeatured,
  };
}

export default function ProductMediaManager({ initialMedia, onChange, onResolvedChange, maxItems = 12, label = "Product media" }: Props) {
  const [items, setItems]                       = useState<ResolvedProductMediaItem[]>(initialMedia);
  const [pickerOpen, setPickerOpen]             = useState(false);
  const [posterTargetIndex, setPosterTargetIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex]               = useState<number | null>(null);

  function notify(next: ResolvedProductMediaItem[]) {
    setItems(next);
    onChange(next.map(strip));
    onResolvedChange?.(next);
  }

  function handleAddMulti(assets: MediaAsset[]) {
    const remaining = maxItems - items.length;
    const newItems = assets
      .filter(a => a.mediaType === "image" || a.mediaType === "video")
      .filter(a => !items.some(i => i.key === a.storageKey))
      .slice(0, remaining)
      .map((a): ResolvedProductMediaItem => ({
        key:             a.storageKey,
        type:            a.mediaType === "video" ? "video" : "image",
        posterKey:       null,
        posterUrl:       null,
        altText:         a.altText,
        isFeatured:      false,
        url:             a.url,
        durationSeconds: a.durationSeconds,
        mimeType:        a.mimeType,
      }));
    if (newItems.length) notify([...items, ...newItems]);
  }

  function remove(index: number) {
    notify(items.filter((_, i) => i !== index));
  }

  function setFeatured(index: number) {
    notify(items.map((item, i) => ({ ...item, isFeatured: i === index })));
  }

  function handlePosterSelect(asset: MediaAsset) {
    if (posterTargetIndex === null) return;
    const idx = posterTargetIndex;
    notify(items.map((item, i) => i === idx ? { ...item, posterKey: asset.storageKey, posterUrl: asset.url } : item));
    setPosterTargetIndex(null);
  }

  function clearPoster(index: number) {
    notify(items.map((item, i) => i === index ? { ...item, posterKey: null, posterUrl: null } : item));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  const canAdd              = items.length < maxItems;
  const hasExplicitFeatured = items.some(i => i.isFeatured);
  const firstImageIndex     = items.findIndex(i => i.type === "image");

  return (
    <div>
      <p className={styles.label}>{label}</p>

      <div className={styles.grid}>
        {items.map((item, i) => {
          const isFeatured = !!item.isFeatured || (!hasExplicitFeatured && i === firstImageIndex);
          return (
            <div
              key={item.key}
              className={`${styles.card} ${dragIndex === i ? styles.cardDragging : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className={styles.dragHandle}><GripVertical size={14} /></div>

              <div className={styles.thumb}>
                {item.type === "video" ? (
                  item.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.posterUrl} alt="" className={styles.thumbImg} />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={item.url} className={styles.thumbImg} muted preload="metadata" />
                  )
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.altText ?? ""} className={styles.thumbImg} />
                )}
                {item.type === "video" && (
                  <div className={styles.playIconOverlay}><span><Play size={14} fill="#fff" /></span></div>
                )}
              </div>

              <div className={styles.bottomBadges}>
                {item.type === "video" && <div className={styles.typeBadge}>Video</div>}
                {item.type === "video" && item.durationSeconds != null && (
                  <div className={styles.durationBadge}>{formatDuration(item.durationSeconds)}</div>
                )}
              </div>

              <button
                type="button"
                className={`${styles.starBtn} ${isFeatured ? styles.starBtnActive : ""}`}
                onClick={() => setFeatured(i)}
                title={isFeatured ? "Featured media" : "Set as featured"}
              >
                <Star size={13} fill={isFeatured ? "currentColor" : "none"} />
              </button>

              <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                <X size={13} strokeWidth={2} />
              </button>

              {item.type === "video" && (
                <div className={styles.posterRow}>
                  <button type="button" className={styles.posterBtn} onClick={() => setPosterTargetIndex(i)}>
                    {item.posterKey ? "Change poster" : "Set poster"}
                  </button>
                  {item.posterKey && (
                    <button type="button" className={styles.posterBtn} onClick={() => clearPoster(i)}>
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {canAdd && (
          <button type="button" className={styles.addBtn} onClick={() => setPickerOpen(true)}>
            <ImagePlus size={22} strokeWidth={1.5} />
            <span>Add media</span>
          </button>
        )}
      </div>

      <p className={styles.hint}>
        {items.length}/{maxItems} items · drag to reorder · ★ sets the featured media · select from Media Library
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multi
        onSelectMulti={handleAddMulti}
        title="Add product media"
      />

      <MediaPicker
        open={posterTargetIndex !== null}
        onClose={() => setPosterTargetIndex(null)}
        onSelect={handlePosterSelect}
        title="Select poster image"
        mediaType="image"
      />
    </div>
  );
}
