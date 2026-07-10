export interface QuickReply {
  id: string;
  title: string;
  body: string;
  category: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Category presentation ─────────────────────────────────────────────────────

const CATEGORY_PALETTE = [
  "#0284c7", // sky
  "#7c3aed", // violet
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#db2777", // pink
  "#4f46e5", // indigo
  "#0d9488", // teal
];

/** Deterministic color per category slug so badges stay stable across renders. */
export function categoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0;
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

/** "check-in" → "Check in" */
export function categoryLabel(category: string): string {
  const words = category.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// ── Placeholders ──────────────────────────────────────────────────────────────

/** Values available for substitution when copying from a vehicle context. */
export interface PlaceholderVars {
  car_name?: string;
  plate?: string;
  phone?: string;
}

export const PLACEHOLDER_KEYS: (keyof PlaceholderVars)[] = ["car_name", "plate", "phone"];

/**
 * Replaces {{car_name}} / {{plate}} / {{phone}} with the provided values.
 * Unknown or missing placeholders are left intact so nothing is silently lost.
 */
export function applyPlaceholders(body: string, vars?: PlaceholderVars): string {
  if (!vars) return body;
  return body.replace(/\{\{\s*(car_name|plate|phone)\s*\}\}/g, (match, key: keyof PlaceholderVars) =>
    vars[key]?.trim() ? vars[key]!.trim() : match,
  );
}
