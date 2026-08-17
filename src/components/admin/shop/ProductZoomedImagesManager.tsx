"use client";

import { useState } from "react";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import { GripVertical, Trash2, Eye, EyeOff, ImagePlus } from "lucide-react";
import styles from "./ProductZoomedImagesManager.module.css";

/** A "Zoomed Images" gallery image — rendered between Specifications and FAQ on the PDP. */
export interface ProductZoomedImage {
  id: string;
  key: string;
  altText?: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** ProductZoomedImage with resolved image URL, as returned by the API */
export interface ResolvedProductZoomedImage extends ProductZoomedImage {
  url: string;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function strip(item: ResolvedProductZoomedImage): ProductZoomedImage {
  return {
    id:        item.id,
    key:       item.key,
    altText:   item.altText ?? null,
    sortOrder: item.sortOrder,
    isActive:  item.isActive,
  };
}

const MAX_IMAGES = 12;

interface Props {
  initialItems: ResolvedProductZoomedImage[];
  onChange: (items: ProductZoomedImage[]) => void;
}

export default function ProductZoomedImagesManager({ initialItems, onChange }: Props) {
  const [items, setItems] = useState<ResolvedProductZoomedImage[]>(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  function notify(next: ResolvedProductZoomedImage[]) {
    const reordered = next.map((it, i) => ({ ...it, sortOrder: i }));
    setItems(reordered);
    onChange(reordered.map(strip));
  }

  function handleAddMulti(assets: MediaAsset[]) {
    const remaining = MAX_IMAGES - items.length;
    const newItems = assets
      .filter(a => a.mediaType === "image")
      .filter(a => !items.some(i => i.key === a.storageKey))
      .slice(0, remaining)
      .map((a): ResolvedProductZoomedImage => ({
        id:        genId(),
        key:       a.storageKey,
        altText:   a.altText,
        sortOrder: 0,
        isActive:  true,
        url:       a.url,
      }));
    if (newItems.length) notify([...items, ...newItems]);
  }

  function update(index: number, patch: Partial<ProductZoomedImage>) {
    notify(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function remove(index: number) {
    notify(items.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (drag === null || drag === targetIndex) { setDrag(null); return; }
    const next = [...items];
    const [moved] = next.splice(drag, 1);
    next.splice(targetIndex, 0, moved);
    setDrag(null);
    notify(next);
  }

  return (
    <div>
      <p className={styles.note}>
        Full-bleed detail shots shown between Specifications and FAQ — each image animates from a
        close zoom down to its normal framing as a shopper scrolls to it. Image only — no text.
      </p>

      {items.length === 0 && (
        <p className={styles.empty}>No images yet. Add 3–8 close-up/detail shots for the best effect.</p>
      )}

      <div className={styles.grid}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`${styles.card} ${drag === i ? styles.cardDragging : ""} ${!item.isActive ? styles.cardInactive : ""}`}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => setDrag(null)}
          >
            <div className={styles.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.altText ?? ""} className={styles.thumbImg} />
              <span className={styles.dragBadge}><GripVertical size={13} /></span>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.eyeBtn}`}
                onClick={() => update(i, { isActive: !item.isActive })}
                title={item.isActive ? "Active — visible on product page" : "Inactive — hidden from product page"}
              >
                {item.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button type="button" className={`${styles.iconBtn} ${styles.removeIconBtn}`} onClick={() => remove(i)} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
            <input
              className={styles.altInput}
              value={item.altText ?? ""}
              onChange={e => update(i, { altText: e.target.value })}
              placeholder="Alt text (accessibility)"
            />
          </div>
        ))}

        {items.length < MAX_IMAGES && (
          <button type="button" className={styles.addTile} onClick={() => setPickerOpen(true)}>
            <ImagePlus size={20} strokeWidth={1.5} />
            <span>Add image</span>
          </button>
        )}
      </div>

      <p className={styles.hint}>
        Drag to reorder · only active images are shown on the product page · hidden automatically when empty.
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multi
        onSelectMulti={handleAddMulti}
        title="Add zoomed images"
        mediaType="image"
      />
    </div>
  );
}
