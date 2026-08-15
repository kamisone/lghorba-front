"use client";

import { useState } from "react";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import BilingualField from "@/components/admin/BilingualField";
import SectionGenerateButton from "@/components/admin/SectionGenerateButton";
import { useSectionGenerate } from "@/hooks/useSectionGenerate";
import { AI_TARGET_LANGS, summarizeGenerateErrors, type SectionTranslationOutcome } from "@/lib/sectionTranslate";
import { GripVertical, Trash2, Eye, EyeOff, ImagePlus, PanelRight, BookOpen } from "lucide-react";
import type { OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./ProductStoryGalleryManager.module.css";

export type StoryGalleryLocation = "side" | "narrative";

/** A Story Gallery image. `side` = creative composition next to the FAQ, `narrative` = storytelling section after all product sections. */
export interface ProductStoryItem {
  id: string;
  key: string;
  location: StoryGalleryLocation;
  altText?: string | null;
  /** Narrative items only — empty string for side items. */
  title: string;
  /** Narrative items only — empty string for side items. */
  description: string;
  sortOrder: number;
  isActive: boolean;
}

/** ProductStoryItem with resolved image URL, as returned by the API */
export interface ResolvedProductStoryItem extends ProductStoryItem {
  url: string;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function strip(item: ResolvedProductStoryItem): ProductStoryItem {
  return {
    id:          item.id,
    key:         item.key,
    location:    item.location,
    altText:     item.altText ?? null,
    title:       item.title,
    description: item.description,
    sortOrder:   item.sortOrder,
    isActive:    item.isActive,
  };
}

const MAX_PER_LOCATION = 8;

interface Props {
  initialItems: ResolvedProductStoryItem[];
  onChange: (items: ProductStoryItem[]) => void;
  translations: Record<OverlayLang, Record<string, string>>;
  setTranslation: (lang: OverlayLang, field: string, value: string) => void;
}

export default function ProductStoryGalleryManager({ initialItems, onChange, translations, setTranslation }: Props) {
  const [items, setItems] = useState<ResolvedProductStoryItem[]>(initialItems);
  const [pickerTarget, setPickerTarget] = useState<StoryGalleryLocation | null>(null);
  const [drag, setDrag] = useState<{ location: StoryGalleryLocation; index: number } | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<{ id: string; message: string } | null>(null);
  const generator = useSectionGenerate<SectionTranslationOutcome<{ title: string; description: string }>>(
    "/next-api/shop/products/sections/story-items/translate",
  );

  const side      = items.filter(i => i.location === "side");
  const narrative = items.filter(i => i.location === "narrative");

  function notify(nextSide: ResolvedProductStoryItem[], nextNarrative: ResolvedProductStoryItem[]) {
    const next = [
      ...nextSide.map((s, i) => ({ ...s, sortOrder: i })),
      ...nextNarrative.map((s, i) => ({ ...s, sortOrder: i })),
    ];
    setItems(next);
    onChange(next.map(strip));
  }

  function withUpdated(location: StoryGalleryLocation, sub: ResolvedProductStoryItem[]) {
    if (location === "side") notify(sub, narrative);
    else notify(side, sub);
  }

  function handleAddMulti(assets: MediaAsset[]) {
    if (!pickerTarget) return;
    const location = pickerTarget;
    const sub = location === "side" ? side : narrative;
    const remaining = MAX_PER_LOCATION - sub.length;
    const newItems = assets
      .filter(a => a.mediaType === "image")
      .filter(a => !sub.some(i => i.key === a.storageKey))
      .slice(0, remaining)
      .map((a): ResolvedProductStoryItem => ({
        id:          genId(),
        key:         a.storageKey,
        location,
        altText:     a.altText,
        title:       "",
        description: "",
        sortOrder:   0,
        isActive:    true,
        url:         a.url,
      }));
    if (newItems.length) withUpdated(location, [...sub, ...newItems]);
  }

  function update(location: StoryGalleryLocation, index: number, patch: Partial<ProductStoryItem>) {
    const sub = location === "side" ? side : narrative;
    withUpdated(location, sub.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function remove(location: StoryGalleryLocation, index: number) {
    const sub = location === "side" ? side : narrative;
    withUpdated(location, sub.filter((_, i) => i !== index));
  }

  /** Reads the admin-written English title/description for this story block and
   *  asks the AI to fill in French (base) plus the other overlay languages. */
  async function generateItem(index: number) {
    const item = narrative[index];
    const enTitle = translations.en?.[`storyItem:${item.id}:title`]?.trim();
    const enDescription = translations.en?.[`storyItem:${item.id}:description`]?.trim();
    if (!enTitle || !enDescription) {
      setItemError({ id: item.id, message: "Write the English title and description first." });
      return;
    }
    setItemError(null);
    setGeneratingIds(prev => new Set(prev).add(item.id));
    try {
      const outcome = await generator.generate({ title: enTitle, description: enDescription });
      if (!outcome) {
        setItemError({ id: item.id, message: "Generation failed — try again." });
        return;
      }
      // A failed language comes back as an empty string (see TranslationService) —
      // never let that blank out content the admin already wrote.
      if (outcome.result.fr.title || outcome.result.fr.description) {
        update("narrative", index, { title: outcome.result.fr.title || item.title, description: outcome.result.fr.description || item.description });
      }
      AI_TARGET_LANGS.forEach(lang => {
        if (outcome.result[lang].title) setTranslation(lang, `storyItem:${item.id}:title`, outcome.result[lang].title);
        if (outcome.result[lang].description) setTranslation(lang, `storyItem:${item.id}:description`, outcome.result[lang].description);
      });
      const errorSummary = summarizeGenerateErrors(outcome.errors);
      if (errorSummary) setItemError({ id: item.id, message: errorSummary });
    } finally {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  function handleDrop(location: StoryGalleryLocation, targetIndex: number) {
    if (!drag || drag.location !== location || drag.index === targetIndex) { setDrag(null); return; }
    const sub = [...(location === "side" ? side : narrative)];
    const [moved] = sub.splice(drag.index, 1);
    sub.splice(targetIndex, 0, moved);
    setDrag(null);
    withUpdated(location, sub);
  }

  function dragProps(location: StoryGalleryLocation, index: number) {
    return {
      draggable: true,
      onDragStart: () => setDrag({ location, index }),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: () => handleDrop(location, index),
      onDragEnd: () => setDrag(null),
    };
  }

  return (
    <div>
      {/* ── Location 1: Creative Side Gallery ── */}
      <div className={styles.locationHead}>
        <span className={styles.locationIcon}><PanelRight size={14} strokeWidth={1.75} /></span>
        <div>
          <div className={styles.locationTitle}>Creative Side Gallery <span className={styles.locationTag}>Location 1</span></div>
          <div className={styles.locationNote}>Artistic image composition displayed next to the FAQ section. Images only — no text.</div>
        </div>
      </div>

      {side.length === 0 && (
        <p className={styles.empty}>No images yet. Add 2–5 images for the best composition.</p>
      )}

      <div className={styles.sideGrid}>
        {side.map((item, i) => (
          <div
            key={item.id}
            className={`${styles.sideCard} ${drag?.location === "side" && drag.index === i ? styles.cardDragging : ""} ${!item.isActive ? styles.cardInactive : ""}`}
            {...dragProps("side", i)}
          >
            <div className={styles.sideThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.altText ?? ""} className={styles.thumbImg} />
              <span className={styles.dragBadge}><GripVertical size={13} /></span>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.eyeBtn}`}
                onClick={() => update("side", i, { isActive: !item.isActive })}
                title={item.isActive ? "Active — visible on product page" : "Inactive — hidden from product page"}
              >
                {item.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button type="button" className={`${styles.iconBtn} ${styles.removeIconBtn}`} onClick={() => remove("side", i)} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
            <input
              className={styles.altInput}
              value={item.altText ?? ""}
              onChange={e => update("side", i, { altText: e.target.value })}
              placeholder="Alt text (accessibility)"
            />
          </div>
        ))}

        {side.length < MAX_PER_LOCATION && (
          <button type="button" className={styles.addTile} onClick={() => setPickerTarget("side")}>
            <ImagePlus size={20} strokeWidth={1.5} />
            <span>Add image</span>
          </button>
        )}
      </div>

      <div className={styles.divider} />

      {/* ── Location 2: Narrative Gallery ── */}
      <div className={styles.locationHead}>
        <span className={styles.locationIcon}><BookOpen size={14} strokeWidth={1.75} /></span>
        <div>
          <div className={styles.locationTitle}>Narrative Gallery <span className={styles.locationTag}>Location 2</span></div>
          <div className={styles.locationNote}>Storytelling section displayed after all product sections. Each image is paired with a localized title and description.</div>
        </div>
      </div>

      {narrative.length === 0 && (
        <p className={styles.empty}>No story blocks yet. Add images with a title and description to tell the product&apos;s story.</p>
      )}

      <div className={styles.narrativeList}>
        {narrative.map((item, i) => (
          <div
            key={item.id}
            className={`${styles.narrativeCard} ${drag?.location === "narrative" && drag.index === i ? styles.cardDragging : ""} ${!item.isActive ? styles.cardInactive : ""}`}
            {...dragProps("narrative", i)}
          >
            <div className={styles.narrativeHead}>
              <span className={styles.dragHandle}><GripVertical size={16} /></span>
              <span className={styles.narrativeTitle}>Story block {i + 1}</span>
              <SectionGenerateButton
                onClick={() => generateItem(i)}
                generating={generatingIds.has(item.id)}
                title="Write the English title/description first, then generate the other languages"
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => update("narrative", i, { isActive: !item.isActive })}
                title={item.isActive ? "Active — visible on product page" : "Inactive — hidden from product page"}
              >
                {item.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                {item.isActive ? "Active" : "Inactive"}
              </button>
              <button type="button" className={styles.removeBtn} onClick={() => remove("narrative", i)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>

            {itemError?.id === item.id && (
              <p className={styles.itemError}>{itemError.message}</p>
            )}

            <div className={styles.narrativeBody}>
              <div className={styles.narrativeThumbCol}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.altText ?? ""} className={styles.narrativeThumb} />
                <input
                  className={styles.altInput}
                  value={item.altText ?? ""}
                  onChange={e => update("narrative", i, { altText: e.target.value })}
                  placeholder="Alt text (accessibility)"
                />
              </div>
              <div className={styles.narrativeFields}>
                <BilingualField
                  label="Title"
                  field={`storyItem:${item.id}:title`}
                  frValue={item.title}
                  frOnChange={val => update("narrative", i, { title: val })}
                  frPlaceholder="e.g. Pensé pour la route"
                  frRequired
                  translations={translations}
                  onTranslationChange={setTranslation}
                  overlayPlaceholder="e.g. Designed for the road"
                />
                <BilingualField
                  label="Description"
                  field={`storyItem:${item.id}:description`}
                  frValue={item.description}
                  frOnChange={val => update("narrative", i, { description: val })}
                  frPlaceholder="Racontez l'histoire derrière cette image…"
                  multiline
                  rows={3}
                  translations={translations}
                  onTranslationChange={setTranslation}
                  overlayPlaceholder="Tell the story behind this image…"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {narrative.length < MAX_PER_LOCATION && (
        <button type="button" className={styles.addBtn} onClick={() => setPickerTarget("narrative")}>
          <ImagePlus size={16} />
          <span>Add story block</span>
        </button>
      )}

      <p className={styles.hint}>
        Drag to reorder within each location · only active items are shown on the product page · sections with no items are hidden automatically.
      </p>

      <MediaPicker
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        multi
        onSelectMulti={handleAddMulti}
        title={pickerTarget === "side" ? "Add side gallery images" : "Add narrative gallery images"}
        mediaType="image"
      />
    </div>
  );
}
