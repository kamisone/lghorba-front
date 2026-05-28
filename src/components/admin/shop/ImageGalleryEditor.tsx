"use client";

import { useState } from "react";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import { X } from "lucide-react";

interface GalleryItem {
  key: string;
  url: string;
}

interface Props {
  initialKeys: string[];
  initialUrls: string[];     // signed URLs aligned 1-to-1 with initialKeys
  onChange: (keys: string[]) => void;
  maxImages?: number;
  label?: string;
}

export default function ImageGalleryEditor({
  initialKeys,
  initialUrls,
  onChange,
  maxImages = 12,
  label = "Gallery images",
}: Props) {
  const [items, setItems] = useState<GalleryItem[]>(() =>
    initialKeys.map((key, i) => ({ key, url: initialUrls[i] ?? "" }))
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  function notify(next: GalleryItem[]) {
    setItems(next);
    onChange(next.map(i => i.key));
  }

  function handleSelect(asset: MediaAsset) {
    if (items.some(i => i.key === asset.storageKey)) return; // deduplicate
    notify([...items, { key: asset.storageKey, url: asset.url }]);
  }

  function remove(index: number) {
    notify(items.filter((_, i) => i !== index));
  }

  const canAdd = items.length < maxImages;

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8 }}>{label}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
        {items.map((item, i) => (
          <div key={item.key} style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt=""
                style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: 10, border: "1px solid #e5e7eb",
                background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "#9ca3af",
              }}>
                No preview
              </div>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              title="Remove"
              style={{
                position: "absolute", top: -6, right: -6,
                width: 22, height: 22, borderRadius: "50%",
                background: "#ef4444", color: "#fff",
                border: "2px solid #fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, lineHeight: 1,
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{
              width: 96, height: 96, borderRadius: 10,
              border: "2px dashed #d1d5db", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4, flexShrink: 0, background: "transparent",
              transition: "border-color .18s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1d4ed8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
          >
            <span style={{ fontSize: 24, color: "#9ca3af", lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>Add image</span>
          </button>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
        {items.length}/{maxImages} images · select from Media Library
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        title="Add gallery image"
      />
    </div>
  );
}
