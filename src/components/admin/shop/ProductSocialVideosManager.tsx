"use client";

import { useState } from "react";
import { GripVertical, Trash2, Film, Plus } from "lucide-react";
import MediaPicker, { MediaAsset, formatDuration } from "@/components/admin/media/MediaPicker";
import BilingualField from "@/components/admin/BilingualField";
import SectionGenerateButton from "@/components/admin/SectionGenerateButton";
import { useSectionGenerate } from "@/hooks/useSectionGenerate";
import { AI_TARGET_LANGS, summarizeGenerateErrors, type SectionTranslationOutcome } from "@/lib/sectionTranslate";
import type { OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./ProductSocialVideosManager.module.css";

/** A social/reels video attached to a product — shown in a vertical carousel on the PDP. */
export interface ProductSocialVideo {
  id: string;
  key: string;
  title?: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** ProductSocialVideo with resolved playback URLs, as returned by the API */
export interface ResolvedProductSocialVideo extends ProductSocialVideo {
  url: string;
  hlsUrl?: string | null;
  posterUrl?: string | null;
  durationSeconds?: number | null;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function strip(item: ResolvedProductSocialVideo): ProductSocialVideo {
  return {
    id:        item.id,
    key:       item.key,
    title:     item.title ?? null,
    sortOrder: item.sortOrder,
    isActive:  item.isActive,
  };
}

const MAX_VIDEOS = 10;

interface Props {
  initialItems: ResolvedProductSocialVideo[];
  onChange: (items: ProductSocialVideo[]) => void;
  /** Overlay-language translations map — badge titles live under `socialVideo:{id}:title`. */
  translations: Record<OverlayLang, Record<string, string>>;
  setTranslation: (lang: OverlayLang, field: string, value: string) => void;
}

/**
 * Admin manager for the PDP "Social Videos" reels section: pick videos from
 * the media library, drag to reorder, remove. Order = display order.
 */
export default function ProductSocialVideosManager({ initialItems, onChange, translations, setTranslation }: Props) {
  const [items, setItems] = useState<ResolvedProductSocialVideo[]>(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<{ id: string; message: string } | null>(null);
  const generator = useSectionGenerate<SectionTranslationOutcome<string>>(
    "/next-api/shop/products/sections/social-videos/translate",
  );

  function notify(next: ResolvedProductSocialVideo[]) {
    const ordered = next.map((v, i) => ({ ...v, sortOrder: i }));
    setItems(ordered);
    onChange(ordered.map(strip));
  }

  async function generateItem(index: number) {
    const item = items[index];
    const enTitle = translations.en?.[`socialVideo:${item.id}:title`]?.trim();
    if (!enTitle) {
      setItemError({ id: item.id, message: "Write the English badge text first." });
      return;
    }
    setItemError(null);
    setGeneratingIds(prev => new Set(prev).add(item.id));
    try {
      const outcome = await generator.generate({ text: enTitle });
      if (!outcome) {
        setItemError({ id: item.id, message: "Generation failed — try again." });
        return;
      }
      // A failed language comes back as an empty string (see TranslationService) —
      // never let that blank out content the admin already wrote.
      if (outcome.result.fr) updateTitle(index, outcome.result.fr);
      AI_TARGET_LANGS.forEach(lang => {
        if (outcome.result[lang]) setTranslation(lang, `socialVideo:${item.id}:title`, outcome.result[lang]);
      });
      const errorSummary = summarizeGenerateErrors(outcome.errors);
      if (errorSummary) setItemError({ id: item.id, message: errorSummary });
    } finally {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  function handleAddMulti(assets: MediaAsset[]) {
    const remaining = MAX_VIDEOS - items.length;
    const added = assets
      .filter(a => a.mediaType === "video")
      .filter(a => !items.some(i => i.key === a.storageKey))
      .slice(0, Math.max(remaining, 0))
      .map((a): ResolvedProductSocialVideo => ({
        id:              genId(),
        key:             a.storageKey,
        title:           null,
        sortOrder:       items.length,
        isActive:        true,
        url:             a.url,
        durationSeconds: a.durationSeconds,
      }));
    if (added.length) notify([...items, ...added]);
    setPickerOpen(false);
  }

  function remove(index: number) {
    notify(items.filter((_, i) => i !== index));
  }

  function updateTitle(index: number, title: string) {
    notify(items.map((v, i) => (i === index ? { ...v, title } : v)));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  return (
    <div>
      {items.length === 0 && (
        <p className={styles.empty}>
          <Film size={15} />
          No social videos yet — pick vertical (9:16) clips from the media library to show a reels carousel on the product page.
        </p>
      )}

      <div className={styles.grid}>
        {items.map((item, i) => (
          <div key={item.id} className={styles.gridItem}>
            <div
              className={`${styles.tile} ${dragIndex === i ? styles.tileDragging : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              {item.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.posterUrl} alt="" className={styles.tileMedia} />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={item.url} className={styles.tileMedia} muted preload="metadata" />
              )}

              <span className={styles.orderBadge}>{i + 1}</span>
              {item.durationSeconds != null && (
                <span className={styles.durationBadge}>{formatDuration(item.durationSeconds)}</span>
              )}

              {/* Live preview of the badge shown on the storefront card */}
              {item.title?.trim() && <span className={styles.titleBadgePreview}>{item.title}</span>}

              <div className={styles.tileActions}>
                <span className={styles.dragHandle} title="Drag to reorder">
                  <GripVertical size={14} />
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => remove(i)}
                  title="Remove video"
                  aria-label="Remove video"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className={styles.badgeFields}>
              <div className={styles.badgeHead}>
                <SectionGenerateButton
                  onClick={() => generateItem(i)}
                  generating={generatingIds.has(item.id)}
                  title="Write the English badge text first, then generate the other languages"
                />
              </div>
              {itemError?.id === item.id && (
                <p className={styles.itemError}>{itemError.message}</p>
              )}
              <BilingualField
                label="Badge"
                field={`socialVideo:${item.id}:title`}
                frValue={item.title ?? ""}
                frOnChange={val => updateTitle(i, val)}
                frPlaceholder="Badge (FR)"
                translations={translations}
                onTranslationChange={setTranslation}
                overlayPlaceholder="Badge"
                maxLength={60}
              />
            </div>
          </div>
        ))}

        {items.length < MAX_VIDEOS && (
          <button type="button" className={styles.addTile} onClick={() => setPickerOpen(true)}>
            <Plus size={18} />
            <span>Add videos</span>
          </button>
        )}
      </div>

      <p className={styles.hint}>
        Drag to reorder · shown as a reels carousel above the FAQ section · {items.length}/{MAX_VIDEOS}
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectMulti={handleAddMulti}
        multi
        mediaType="video"
        title="Select social videos"
      />
    </div>
  );
}
