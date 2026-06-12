"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import { TRUST_BADGE_ICON_OPTIONS, getTrustBadgeIcon, type TrustBadgeIconName } from "@/lib/shop/trustBadgeIcons";
import styles from "./ProductTrustBadgesManager.module.css";

/** A small icon+label trust signal shown near the PDP buy box (e.g. "Secure checkout"). */
export interface ProductTrustBadge {
  id: string;
  icon: TrustBadgeIconName;
  label: string;
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
  enValues: Record<string, string>;
  setEn: (field: string, value: string) => void;
}

export default function ProductTrustBadgesManager({ badges, onChange, enValues, setEn }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function notify(next: ProductTrustBadge[]) {
    onChange(next.map((b, i) => ({ ...b, sortOrder: i })));
  }

  function addBadge() {
    notify([...badges, { id: genId(), icon: "BadgeCheck", label: "", sortOrder: badges.length }]);
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
      <p className={styles.label}>Trust badges</p>

      {badges.length === 0 && (
        <p className={styles.empty}>No badges yet. The page will show the default "Secure checkout / Free shipping / Easy returns" signals.</p>
      )}

      <div className={styles.list}>
        {badges.map((badge, i) => {
          const Icon = getTrustBadgeIcon(badge.icon);
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
                <span className={styles.iconPreview}><Icon size={15} /></span>
                <select
                  className={styles.select}
                  value={badge.icon}
                  onChange={e => update(i, { icon: e.target.value as TrustBadgeIconName })}
                >
                  {TRUST_BADGE_ICON_OPTIONS.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                </select>
                <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className={styles.cardBody}>
                <BilingualField
                  label="Badge label"
                  frValue={badge.label}
                  frOnChange={val => update(i, { label: val })}
                  frPlaceholder="e.g. Secure checkout"
                  frRequired
                  enValue={enValues[`trustBadge:${badge.id}:label`] ?? ""}
                  enOnChange={val => setEn(`trustBadge:${badge.id}:label`, val)}
                  enPlaceholder="e.g. Secure checkout"
                />
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
