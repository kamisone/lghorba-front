"use client";

import { useState } from "react";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import { GripVertical, Trash2, Eye, EyeOff, ImagePlus } from "lucide-react";
import styles from "./ProductPackageContentsManager.module.css";

/** A "what's in the box" image — rendered in a collapsible section after Delivery details on the PDP. */
export interface ProductPackageContentItem {
  id: string;
  key: string;
  label?: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** ProductPackageContentItem with resolved image URL, as returned by the API */
export interface ResolvedProductPackageContentItem extends ProductPackageContentItem {
  url: string;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function strip(item: ResolvedProductPackageContentItem): ProductPackageContentItem {
  return {
    id:        item.id,
    key:       item.key,
    label:     item.label ?? null,
    sortOrder: item.sortOrder,
    isActive:  item.isActive,
  };
}

const MAX_IMAGES = 20;

interface Props {
  initialItems: ResolvedProductPackageContentItem[];
  onChange: (items: ProductPackageContentItem[]) => void;
}

export default function ProductPackageContentsManager({ initialItems, onChange }: Props) {
  const [items, setItems] = useState<ResolvedProductPackageContentItem[]>(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  function notify(next: ResolvedProductPackageContentItem[]) {
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
      .map((a): ResolvedProductPackageContentItem => ({
        id:        genId(),
        key:       a.storageKey,
        label:     null,
        sortOrder: 0,
        isActive:  true,
        url:       a.url,
      }));
    if (newItems.length) notify([...items, ...newItems]);
  }

  function update(index: number, patch: Partial<ProductPackageContentItem>) {
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
        Small photos of each item included in the box — shown as a "What's included" grid in a
        collapsible section on the product page, right after Delivery details.
      </p>

      {items.length === 0 && (
        <p className={styles.empty}>No images yet. Add one photo per included item (e.g. the main product, cable, manual…).</p>
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
              <img src={item.url} alt={item.label ?? ""} className={styles.thumbImg} />
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
              className={styles.labelInput}
              value={item.label ?? ""}
              onChange={e => update(i, { label: e.target.value })}
              placeholder="Caption (e.g. USB-C cable ×1)"
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
        title="Add package content images"
        mediaType="image"
      />
    </div>
  );
}
