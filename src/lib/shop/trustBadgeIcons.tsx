import {
  Award, BadgeCheck, Clock, CreditCard, Gift, Globe, Headset,
  Leaf, Lock, PackageCheck, Recycle, RotateCcw, ShieldCheck, Truck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Curated icon set for product trust badges. Keep in sync with
 * TRUST_BADGE_ICON_NAMES in back/src/commerce/entities/product-trust-badge.ts.
 */
export const TRUST_BADGE_ICON_NAMES = [
  'Lock', 'ShieldCheck', 'Truck', 'PackageCheck', 'RotateCcw', 'CreditCard',
  'BadgeCheck', 'Award', 'Clock', 'Headset', 'Gift', 'Leaf', 'Recycle', 'Globe',
] as const;

export type TrustBadgeIconName = typeof TRUST_BADGE_ICON_NAMES[number];

export const TRUST_BADGE_ICON_MAP: Record<TrustBadgeIconName, LucideIcon> = {
  Lock, ShieldCheck, Truck, PackageCheck, RotateCcw, CreditCard,
  BadgeCheck, Award, Clock, Headset, Gift, Leaf, Recycle, Globe,
};

export const TRUST_BADGE_FALLBACK_ICON: LucideIcon = BadgeCheck;

export function getTrustBadgeIcon(name: string): LucideIcon {
  return TRUST_BADGE_ICON_MAP[name as TrustBadgeIconName] ?? TRUST_BADGE_FALLBACK_ICON;
}

export const TRUST_BADGE_ICON_OPTIONS: { name: TrustBadgeIconName; Icon: LucideIcon }[] =
  TRUST_BADGE_ICON_NAMES.map(name => ({ name, Icon: TRUST_BADGE_ICON_MAP[name] }));
