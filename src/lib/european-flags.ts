/**
 * Inline SVG flag data for European countries.
 * Each SVG uses viewBox="0 0 900 600" (3:2 ratio).
 * Extend with more regions as needed.
 */

interface FlagEntry {
  name: string;
  svg: string;
}

// helpers
const tri = (c1: string, c2: string, c3: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="300" height="600" fill="${c1}"/><rect x="300" width="300" height="600" fill="${c2}"/><rect x="600" width="300" height="600" fill="${c3}"/></svg>`;

const triH = (c1: string, c2: string, c3: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="200" fill="${c1}"/><rect y="200" width="900" height="200" fill="${c2}"/><rect y="400" width="900" height="200" fill="${c3}"/></svg>`;

const biH = (c1: string, c2: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="300" fill="${c1}"/><rect y="300" width="900" height="300" fill="${c2}"/></svg>`;

export const EUROPEAN_FLAGS: Record<string, FlagEntry> = {
  // ── Vertical tricolors ────────────────────────────────────────────
  FR: { name: "France",      svg: tri("#002395", "#fff", "#ED2939") },
  IT: { name: "Italy",       svg: tri("#009246", "#fff", "#CE2B37") },
  IE: { name: "Ireland",     svg: tri("#169B62", "#fff", "#FF883E") },
  BE: { name: "Belgium",     svg: tri("#000", "#FDDA24", "#EF3340") },
  RO: { name: "Romania",     svg: tri("#002B7F", "#FCD116", "#CE1126") },
  MD: { name: "Moldova",     svg: tri("#003DA5", "#FFD200", "#CC092F") },

  // ── Horizontal tricolors ──────────────────────────────────────────
  DE: { name: "Germany",       svg: triH("#000", "#DD0000", "#FFCC00") },
  NL: { name: "Netherlands",   svg: triH("#AE1C28", "#fff", "#21468B") },
  LU: { name: "Luxembourg",    svg: triH("#EF3340", "#fff", "#00A3E0") },
  AT: { name: "Austria",       svg: triH("#ED2939", "#fff", "#ED2939") },
  HU: { name: "Hungary",       svg: triH("#CE2939", "#fff", "#477050") },
  BG: { name: "Bulgaria",      svg: triH("#fff", "#00966E", "#D62612") },
  EE: { name: "Estonia",       svg: triH("#0072CE", "#000", "#fff") },
  LT: { name: "Lithuania",     svg: triH("#FDB913", "#006A44", "#C1272D") },
  HR: { name: "Croatia",       svg: triH("#FF0000", "#fff", "#171796") },
  SI: { name: "Slovenia",      svg: triH("#fff", "#003DA5", "#ED1C24") },
  SK: { name: "Slovakia",      svg: triH("#fff", "#0B4EA2", "#EE1C25") },
  RS: { name: "Serbia",        svg: triH("#C6363C", "#0C4076", "#fff") },

  // ── Bicolors ──────────────────────────────────────────────────────
  PL: { name: "Poland",    svg: biH("#fff", "#DC143C") },
  UA: { name: "Ukraine",   svg: biH("#005BBB", "#FFD500") },
  MC: { name: "Monaco",    svg: biH("#CE1126", "#fff") },

  // ── Latvia (maroon / white / maroon, 2:1:2 ratio) ────────────────
  LV: { name: "Latvia", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#9E3039"/><rect y="240" width="900" height="120" fill="#fff"/></svg>` },

  // ── Spain (red / yellow wide / red) ───────────────────────────────
  ES: { name: "Spain", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#AA151B"/><rect y="150" width="900" height="300" fill="#F1BF00"/></svg>` },

  // ── Portugal (green / red vertical, 2:3 split) ────────────────────
  PT: { name: "Portugal", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="360" height="600" fill="#006600"/><rect x="360" width="540" height="600" fill="#FF0000"/><circle cx="360" cy="300" r="80" fill="#FFCC00"/></svg>` },

  // ── Czech Republic (white/red + blue triangle) ────────────────────
  CZ: { name: "Czech Republic", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="300" fill="#fff"/><rect y="300" width="900" height="300" fill="#D7141A"/><polygon points="0,0 450,300 0,600" fill="#11457E"/></svg>` },

  // ── Nordic crosses ────────────────────────────────────────────────
  DK: { name: "Denmark", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#C60C30"/><rect x="250" width="100" height="600" fill="#fff"/><rect y="250" width="900" height="100" fill="#fff"/></svg>` },

  SE: { name: "Sweden", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#006AA7"/><rect x="250" width="100" height="600" fill="#FECC00"/><rect y="250" width="900" height="100" fill="#FECC00"/></svg>` },

  FI: { name: "Finland", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#fff"/><rect x="250" width="100" height="600" fill="#003580"/><rect y="250" width="900" height="100" fill="#003580"/></svg>` },

  NO: { name: "Norway", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#BA0C2F"/><rect x="225" width="150" height="600" fill="#fff"/><rect y="225" width="900" height="150" fill="#fff"/><rect x="262" width="75" height="600" fill="#00205B"/><rect y="262" width="900" height="75" fill="#00205B"/></svg>` },

  IS: { name: "Iceland", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#003897"/><rect x="225" width="150" height="600" fill="#fff"/><rect y="225" width="900" height="150" fill="#fff"/><rect x="262" width="75" height="600" fill="#D72828"/><rect y="262" width="900" height="75" fill="#D72828"/></svg>` },

  // ── Switzerland (white cross on red) ──────────────────────────────
  CH: { name: "Switzerland", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#FF0000"/><rect x="375" y="150" width="150" height="300" fill="#fff"/><rect x="300" y="225" width="300" height="150" fill="#fff"/></svg>` },

  // ── Greece (blue/white stripes + blue corner with cross) ──────────
  GR: { name: "Greece", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#0D5EAF"/><g fill="#fff"><rect y="67" width="900" height="67"/><rect y="200" width="900" height="67"/><rect y="333" width="900" height="67"/><rect y="467" width="900" height="67"/></g><rect width="333" height="333" fill="#0D5EAF"/><rect x="133" width="67" height="333" fill="#fff"/><rect y="133" width="333" height="67" fill="#fff"/></svg>` },

  // ── United Kingdom ────────────────────────────────────────────────
  GB: { name: "United Kingdom", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#012169"/><path d="M0,0 L900,600 M900,0 L0,600" stroke="#fff" stroke-width="100"/><path d="M0,0 L900,600 M900,0 L0,600" stroke="#C8102E" stroke-width="60"/><rect x="375" width="150" height="600" fill="#fff"/><rect y="225" width="900" height="150" fill="#fff"/><rect x="400" width="100" height="600" fill="#C8102E"/><rect y="250" width="900" height="100" fill="#C8102E"/></svg>` },

  // ── Malta (white / red vertical halves with cross) ────────────────
  MT: { name: "Malta", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="450" height="600" fill="#fff"/><rect x="450" width="450" height="600" fill="#CF142B"/><rect x="75" y="30" width="80" height="80" fill="none" stroke="#8B8D8E" stroke-width="6"/></svg>` },

  // ── Cyprus (simplified outline) ───────────────────────────────────
  CY: { name: "Cyprus", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#fff"/><ellipse cx="450" cy="280" rx="180" ry="100" fill="#D47600"/><rect x="350" y="380" width="200" height="10" fill="#4E7A3E"/><rect x="370" y="390" width="160" height="10" fill="#4E7A3E"/></svg>` },

  // ── Liechtenstein (blue / red with crown) ─────────────────────────
  LI: { name: "Liechtenstein", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="300" fill="#002B7F"/><rect y="300" width="900" height="300" fill="#CE1126"/><rect x="130" y="100" width="80" height="60" rx="10" fill="#FFD700"/></svg>` },
};

export const EUROPEAN_ISO_CODES = Object.keys(EUROPEAN_FLAGS);

export function getFlagSvgDataUrl(isoCode: string): string | null {
  const entry = EUROPEAN_FLAGS[isoCode.toUpperCase()];
  if (!entry) return null;
  return `data:image/svg+xml,${encodeURIComponent(entry.svg)}`;
}
