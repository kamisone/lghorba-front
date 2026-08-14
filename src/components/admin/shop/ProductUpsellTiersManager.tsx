"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import styles from "./ProductUpsellTiersManager.module.css";

/** A quantity-price tier — "buy `quantity`, pay `unitPriceCents` each". */
export interface ProductUpsellTier {
  id: string;
  quantity: number;
  unitPriceCents: number;
  active: boolean;
  sortOrder: number;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  tiers: ProductUpsellTier[];
  onChange: (tiers: ProductUpsellTier[]) => void;
  /** The product's regular unit price, cents — shown for savings context only. */
  basePriceCents: number | null;
}

export default function ProductUpsellTiersManager({ tiers, onChange, basePriceCents }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function notify(next: ProductUpsellTier[]) {
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));
  }

  function addTier() {
    const lastQty = tiers.length ? Math.max(...tiers.map(t => t.quantity)) : 1;
    notify([...tiers, {
      id: genId(),
      quantity: lastQty + 1,
      unitPriceCents: basePriceCents ?? 0,
      active: true,
      sortOrder: tiers.length,
    }]);
  }

  function update(index: number, patch: Partial<ProductUpsellTier>) {
    notify(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function remove(index: number) {
    notify(tiers.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...tiers];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  return (
    <div>
      {tiers.length === 0 && (
        <p className={styles.empty}>No quantity tiers yet. Add one to encourage a bigger order.</p>
      )}

      <div className={styles.list}>
        {tiers.map((tier, i) => {
          const savingsPct = basePriceCents && basePriceCents > 0 && tier.unitPriceCents < basePriceCents
            ? Math.round((1 - tier.unitPriceCents / basePriceCents) * 100)
            : null;
          return (
            <div
              key={tier.id}
              className={`${styles.card} ${dragIndex === i ? styles.cardDragging : ""} ${!tier.active ? styles.cardInactive : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className={styles.cardHead}>
                <span className={styles.dragHandle}><GripVertical size={16} /></span>
                <span className={styles.cardTitle}>Tier {i + 1}</span>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => update(i, { active: !tier.active })}
                  title={tier.active ? "Active — shown to customers" : "Inactive — hidden from customers"}
                >
                  {tier.active ? <Eye size={15} /> : <EyeOff size={15} />}
                  {tier.active ? "Active" : "Inactive"}
                </button>
                <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.fieldRow}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Buy quantity</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={styles.numberInput}
                      value={tier.quantity}
                      onChange={e => update(i, { quantity: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                    />
                  </label>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Price each</span>
                    <div className={styles.priceInputWrap}>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={styles.numberInput}
                        value={tier.unitPriceCents / 100}
                        onChange={e => update(i, { unitPriceCents: Math.max(0, Math.round(Number(e.target.value) * 100) || 0) })}
                      />
                      <span className={styles.priceSuffix}>€</span>
                    </div>
                  </label>
                </div>
                {savingsPct !== null && (
                  <p className={styles.savingsHint}>−{savingsPct}% vs. the regular price</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className={styles.addBtn} onClick={addTier}>
        <Plus size={16} />
        <span>Add tier</span>
      </button>

      <p className={styles.hint}>
        Drag to reorder · a customer paying for N units gets the highest-quantity active tier
        their order qualifies for · only active tiers are shown on the product page.
      </p>
    </div>
  );
}
