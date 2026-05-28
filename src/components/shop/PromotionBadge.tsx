import { Truck, Tag } from "lucide-react";
import styles from "./PromotionBadge.module.css";

export type PromotionDiscountType = "percentage" | "fixed_amount" | "free_shipping";

export interface PromotionInfo {
  name: string;
  discountType: PromotionDiscountType;
  discountValue: number;
}

interface Props {
  promotion: PromotionInfo;
  size?: "sm" | "md" | "lg";
}

function formatLabel(p: PromotionInfo): string {
  if (p.discountType === "free_shipping") return "Free shipping";
  if (p.discountType === "percentage")   return `−${p.discountValue}%`;
  return `−€${(p.discountValue / 100).toFixed(2)}`;
}

function colorClass(type: PromotionDiscountType): string {
  if (type === "free_shipping") return styles.blue;
  return styles.green;
}

export default function PromotionBadge({ promotion, size = "md" }: Props) {
  const sizeClass  = styles[size];
  const color      = colorClass(promotion.discountType);
  const icon       = promotion.discountType === "free_shipping"
    ? <Truck size={14} strokeWidth={1.75} />
    : <Tag size={14} strokeWidth={1.75} />;

  return (
    <span className={`${styles.badge} ${sizeClass} ${color}`} title={promotion.name}>
      <em className={styles.icon}>{icon}</em>
      {formatLabel(promotion)}
    </span>
  );
}
