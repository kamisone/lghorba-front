"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import TrustBadgeIconSelect from "./TrustBadgeIconSelect";
import { type TrustBadgeIconName } from "@/lib/shop/trustBadgeIcons";
import type { OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./ProductTrustBadgesManager.module.css";

/** A small icon+title trust signal shown near the PDP buy box (e.g. "Secure checkout"). */
export interface ProductTrustBadge {
  id: string;
  icon: TrustBadgeIconName;
  title: string;
  subtitle?: string;
  link?: string;
  sortOrder: number;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  badges: ProductTrustBadge[];
  onChange: (badges: ProductTrustBadge[]) => void;
  translations: Record<OverlayLang, Record<string, string>>;
  setTranslation: (lang: OverlayLang, field: string, value: string) => void;
}

export default function ProductTrustBadgesManager({ badges, onChange, translations, setTranslation }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function notify(next: ProductTrustBadge[]) {
    onChange(next.map((b, i) => ({ ...b, sortOrder: i })));
  }

  function addBadge() {
    notify([...badges, { id: genId(), icon: "BadgeCheck", title: "", subtitle: "", link: "", sortOrder: badges.length }]);
  }

  function update(index: number, patch: Partial<ProductTrustBadge>) {
    notify(badges.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function remove(index: number) {
    notify(badges.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...badges];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  return (
    <div>
      {badges.length === 0 && (
        <p className={styles.empty}>No badges yet. The page will show the default "Secure checkout / Free shipping / Easy returns" signals.</p>
      )}

      <div className={styles.list}>
        {badges.map((badge, i) => {
          return (
            <div
              key={badge.id}
              className={`${styles.card} ${dragIndex === i ? styles.cardDragging : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className={styles.cardHead}>
                <span className={styles.dragHandle}><GripVertical size={16} /></span>
                <TrustBadgeIconSelect
                  value={badge.icon}
                  onChange={icon => update(i, { icon })}
                />
                <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className={styles.cardBody}>
                <BilingualField
                  label="Badge title"
                  field={`trustBadge:${badge.id}:title`}
                  frValue={badge.title}
                  frOnChange={val => update(i, { title: val })}
                  frPlaceholder="e.g. Secure checkout"
                  frRequired
                  translations={translations}
                  onTranslationChange={setTranslation}
                  overlayPlaceholder="e.g. Secure checkout"
                />
                <BilingualField
                  label="Subtitle (optional)"
                  field={`trustBadge:${badge.id}:subtitle`}
                  frValue={badge.subtitle ?? ""}
                  frOnChange={val => update(i, { subtitle: val })}
                  frPlaceholder="e.g. Paiement 100% sécurisé"
                  translations={translations}
                  onTranslationChange={setTranslation}
                  overlayPlaceholder="e.g. 100% secure payment"
                />
                <label className={styles.linkField}>
                  <span className={styles.linkLabel}>Link (optional)</span>
                  <input
                    className={styles.linkInput}
                    type="text"
                    value={badge.link ?? ""}
                    onChange={e => update(i, { link: e.target.value })}
                    placeholder="e.g. /shipping-policy"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className={styles.addBtn} onClick={addBadge}>
        <Plus size={16} />
        <span>Add badge</span>
      </button>

      <p className={styles.hint}>Drag to reorder · only badges with a label are shown on the product page.</p>
    </div>
  );
}
